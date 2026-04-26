/**
 * Cloudflare Proxy: Transparent Fix for Blocked Domains
 *
 * Patches https.request/http.request/fetch and undici to redirect traffic 
 * for blocked hosts through a Cloudflare Worker proxy.
 */
"use strict";

const https = require("https");
const http = require("http");

// Use stderr for logs to avoid breaking child processes that communicate via stdout JSON
const log = (...args) => console.error(...args);

let PROXY_URL = process.env.CLOUDFLARE_PROXY_URL;
if (
  PROXY_URL &&
  !PROXY_URL.startsWith("http://") &&
  !PROXY_URL.startsWith("https://")
) {
  PROXY_URL = `https://${PROXY_URL}`;
}

const DEBUG = process.env.CLOUDFLARE_PROXY_DEBUG === "true" || true;
const PROXY_SHARED_SECRET = (process.env.CLOUDFLARE_PROXY_SECRET || "").trim();
const PROXY_DOMAINS = process.env.CLOUDFLARE_PROXY_DOMAINS || "*";
const BLOCKED_DOMAINS = PROXY_DOMAINS.split(",")
  .map((domain) => domain.trim())
  .filter(Boolean);
const PROXY_ALL = PROXY_DOMAINS === "*";

if (PROXY_URL) {
  try {
    const proxy = new URL(PROXY_URL);
    const originalHttpsRequest = https.request;
    const originalHttpRequest = http.request;
    const originalFetch =
      typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;

    const shouldProxyHost = (hostname) => {
      const normalized = String(hostname || "").trim().toLowerCase();
      if (!normalized) return false;

      const isInternal =
        normalized === "localhost" ||
        normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized === "0.0.0.0" ||
        normalized === proxy.hostname ||
        normalized.endsWith(".hf.space") ||
        normalized.endsWith(".huggingface.co") ||
        normalized === "huggingface.co";

      const should = PROXY_ALL ? !isInternal : BLOCKED_DOMAINS.some(
        (domain) =>
          normalized === domain || normalized.endsWith(`.${domain}`),
      );

      if (DEBUG && should && normalized !== proxy.hostname) {
        log(`[cloudflare-proxy] Host match: ${normalized}`);
      }

      return should;
    };

    const patch = (original, originalModuleName) => {
      return function patchedRequest(arg1, arg2, arg3) {
        let options = {};
        let callback;

        if (typeof arg1 === "string" || arg1 instanceof URL) {
          const url = typeof arg1 === "string" ? new URL(arg1) : arg1;
          options = {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
          };
          if (typeof arg2 === "object" && arg2 !== null) {
            options = { ...options, ...arg2 };
            callback = arg3;
          } else {
            callback = arg2;
          }
        } else {
          options = { ...arg1 };
          callback = arg2;
        }

        const hostname =
          options.hostname ||
          (options.host ? String(options.host).split(":")[0] : "");
        const path = options.path || "/";
        const headers = options.headers || {};

        const shouldProxy = shouldProxyHost(hostname);
        const alreadyProxied = options._proxied;
        const hasTargetHeader =
          headers["x-target-host"] || headers["X-Target-Host"];

        if (shouldProxy && !alreadyProxied && !hasTargetHeader) {
          if (DEBUG) {
            log(
              `[cloudflare-proxy] Redirecting ${originalModuleName}://${hostname}${path} -> ${proxy.hostname}`,
            );
          }

          const newOptions = { ...options };
          newOptions._proxied = true;
          newOptions.protocol = "https:";
          newOptions.hostname = proxy.hostname;
          newOptions.port = proxy.port || 443;
          newOptions.servername = proxy.hostname;
          delete newOptions.host;
          delete newOptions.agent;

          newOptions.headers = {
            ...(options.headers || {}),
            host: proxy.host,
            "x-target-host": hostname,
          };

          if (PROXY_SHARED_SECRET) {
            newOptions.headers["x-proxy-key"] = PROXY_SHARED_SECRET;
          }

          return originalHttpsRequest.call(https, newOptions, callback);
        }

        return original.call(this, arg1, arg2, arg3);
      };
    };

    https.request = patch(originalHttpsRequest, "https");
    http.request = patch(originalHttpRequest, "http");

    if (originalFetch) {
      globalThis.fetch = async function patchedFetch(input, init) {
        const request = input instanceof Request ? input : null;
        const urlStr = request ? request.url : String(input);
        
        let url;
        try {
          url = new URL(urlStr);
        } catch (e) {
          return originalFetch(input, init);
        }

        const hostname = url.hostname;
        const shouldProxy = shouldProxyHost(hostname);
        
        let headers;
        if (request) {
            headers = new Headers(request.headers);
        } else {
            headers = new Headers(init?.headers || {});
        }

        const alreadyProxied =
          headers.has("x-target-host") || headers.has("X-Target-Host");

        if (!shouldProxy || alreadyProxied) {
          return originalFetch(input, init);
        }

        if (DEBUG) {
          log(
            `[cloudflare-proxy] Redirecting fetch://${hostname}${url.pathname}${url.search} -> ${proxy.hostname}`,
          );
        }

        headers.set("x-target-host", hostname);
        if (PROXY_SHARED_SECRET) {
          headers.set("x-proxy-key", PROXY_SHARED_SECRET);
        }

        const proxiedUrl = new URL(url.pathname + url.search, proxy);

        if (request) {
          const newInit = {
            method: request.method,
            headers,
            body: request.body,
            redirect: request.redirect,
            duplex: "half",
          };
          return originalFetch(new Request(proxiedUrl, newInit));
        }

        return originalFetch(proxiedUrl, {
          ...init,
          headers,
        });
      };
    }

    // undici patching
    const patchUndiciInstance = (exports) => {
      if (!exports) return;

      const patchDispatch = (proto, name) => {
        if (proto && proto.dispatch && !proto.dispatch._patched) {
          const origDispatch = proto.dispatch;
          proto.dispatch = function(options, handler) {
            let origin = options.origin || this.origin;
            if (origin && typeof origin !== 'string') {
              try { origin = origin.origin || origin.toString(); } catch (e) { origin = ""; }
            }
            
            let hostname = "";
            try {
              hostname = new URL(String(origin)).hostname;
            } catch(e) {
              hostname = String(origin || "").split(':')[0];
            }

            if (hostname && shouldProxyHost(hostname)) {
              if (DEBUG) log(`[cloudflare-proxy] Redirecting undici ${name}.dispatch: ${hostname}${options.path || ""} -> ${proxy.hostname}`);
              
              let headers = options.headers;
              const targetHeader = "x-target-host";
              const secretHeader = "x-proxy-key";

              if (Array.isArray(headers)) {
                let foundTarget = false;
                for (let i = 0; i < headers.length; i += 2) {
                  if (String(headers[i]).toLowerCase() === targetHeader) {
                    foundTarget = true;
                    break;
                  }
                }
                if (!foundTarget) {
                  headers.push(targetHeader, hostname);
                  if (PROXY_SHARED_SECRET) headers.push(secretHeader, PROXY_SHARED_SECRET);
                }
              } else {
                options.headers = headers || {};
                if (options.headers instanceof Map || (typeof options.headers.set === 'function')) {
                  options.headers.set(targetHeader, hostname);
                  if (PROXY_SHARED_SECRET) options.headers.set(secretHeader, PROXY_SHARED_SECRET);
                } else {
                  options.headers[targetHeader] = hostname;
                  if (PROXY_SHARED_SECRET) options.headers[secretHeader] = PROXY_SHARED_SECRET;
                }
              }
              options.origin = `https://${proxy.hostname}`;
            }
            return origDispatch.call(this, options, handler);
          };
          proto.dispatch._patched = true;
        }
      };

      for (const key in exports) {
        if (exports[key] && exports[key].prototype && typeof exports[key].prototype.dispatch === 'function') {
           patchDispatch(exports[key].prototype, key);
        }
      }

      if (exports.getGlobalDispatcher) {
        try {
          const globalDispatcher = exports.getGlobalDispatcher();
          if (globalDispatcher && globalDispatcher.dispatch && !globalDispatcher.dispatch._patched) {
            patchDispatch(globalDispatcher, "GlobalDispatcherInstance");
          }
        } catch (e) {}
      }

      if (exports.fetch && !exports.fetch._patched) {
        exports.fetch = async function (input, init) {
          return globalThis.fetch(input, init);
        };
        exports.fetch._patched = true;
      }
    };

    // Try to require undici immediately
    try {
      const undici = require("undici");
      patchUndiciInstance(undici);
    } catch (e) {}

    const Module = require("module");
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id) {
      const exports = originalRequire.apply(this, arguments);
      if (id === "undici" || id.includes("/undici/")) {
        try { patchUndiciInstance(exports); } catch (e) {}
      }
      return exports;
    };

    if (DEBUG) {
      log(`[cloudflare-proxy] Transparent proxy active in ${PROXY_ALL ? "wildcard" : "list"} mode`);
      log(`[cloudflare-proxy] Target proxy: ${proxy.hostname}`);
    }
  } catch (error) {
    log(`[cloudflare-proxy] Failed to initialize: ${error.message}`);
  }
}

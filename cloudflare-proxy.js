/**
 * Cloudflare Proxy: Transparent Fix for Blocked Domains
 *
 * Patches https.request/http.request and undici/fetch to redirect traffic
 * for blocked hosts through a Cloudflare Worker proxy.
 */
"use strict";

// Always log that we are loaded
console.log("🦞 Cloudflare Proxy: Transparent redirector active");

const https = require("https");
const http = require("http");

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
// Default to wildcard mode to ensure all blocked external traffic is caught
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
        normalized.endsWith(".hf.space") ||
        normalized.endsWith(".huggingface.co") ||
        normalized === "huggingface.co";

      if (PROXY_ALL) {
        return !isInternal;
      }

      return BLOCKED_DOMAINS.some(
        (domain) =>
          normalized === domain || normalized.endsWith(`.${domain}`),
      );
    };

    const patch = (original, originalModuleName) => {
      return function patchedRequest(options, callback) {
        let hostname = "";
        let path = "";
        let headers = {};

        if (typeof options === "string") {
          const parsed = new URL(options);
          hostname = parsed.hostname;
          path = parsed.pathname + parsed.search;
        } else if (options instanceof URL) {
          hostname = options.hostname;
          path = options.pathname + options.search;
          headers = options.headers || {};
        } else {
          hostname =
            options.hostname ||
            (options.host ? String(options.host).split(":")[0] : "");
          path = options.path || "/";
          headers = options.headers || {};
        }

        const shouldProxy = shouldProxyHost(hostname);

        const alreadyProxied =
          options && typeof options === "object" && options._proxied;
        const hasTargetHeader =
          headers &&
          (headers["x-target-host"] || headers["X-Target-Host"]);

        if (shouldProxy && !alreadyProxied && !hasTargetHeader) {
          if (DEBUG) {
            console.log(
              `[cloudflare-proxy] Redirecting ${originalModuleName}://${hostname}${path} -> ${proxy.hostname}`,
            );
          }

          const newOptions =
            typeof options === "string" || options instanceof URL
              ? { protocol: "https:", path }
              : { ...options };

          newOptions._proxied = true;
          newOptions.protocol = "https:";
          newOptions.hostname = proxy.hostname;
          newOptions.port = proxy.port || 443;
          newOptions.servername = proxy.hostname;
          delete newOptions.host;
          delete newOptions.agent;

          newOptions.headers = {
            ...(newOptions.headers || {}),
            host: proxy.host,
            "x-target-host": hostname,
          };

          if (PROXY_SHARED_SECRET) {
            newOptions.headers["x-proxy-key"] = PROXY_SHARED_SECRET;
          }

          return originalHttpsRequest.call(https, newOptions, callback);
        }

        return original.call(this, options, callback);
      };
    };

    https.request = patch(originalHttpsRequest, "https");
    http.request = patch(originalHttpRequest, "http");

    // Patch global fetch
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
          console.log(
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

    // Comprehensive undici patching via require interception
    const Module = require("module");
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id) {
      const exports = originalRequire.apply(this, arguments);
      if (id === "undici" || id.endsWith("/undici/index.js") || id.endsWith("/undici/lib/index.js")) {
        // Patch undici.fetch
        if (exports.fetch && !exports.fetch._patched) {
          const origUndiciFetch = exports.fetch;
          exports.fetch = async function (input, init) {
            return globalThis.fetch(input, init);
          };
          exports.fetch._patched = true;
          if (DEBUG) console.log("[cloudflare-proxy] Patched undici.fetch");
        }
        
        // Patch undici.request
        if (exports.request && !exports.request._patched) {
           const origUndiciRequest = exports.request;
           exports.request = async function(url, options) {
               let parsedUrl;
               try {
                   parsedUrl = new URL(url);
               } catch(e) {
                   return origUndiciRequest.apply(this, arguments);
               }
               
               if (shouldProxyHost(parsedUrl.hostname)) {
                   if (DEBUG) console.log(`[cloudflare-proxy] Redirecting undici.request://${parsedUrl.hostname} -> ${proxy.hostname}`);
                   const headers = options?.headers || {};
                   headers["x-target-host"] = parsedUrl.hostname;
                   if (PROXY_SHARED_SECRET) headers["x-proxy-key"] = PROXY_SHARED_SECRET;
                   
                   const proxiedUrl = new URL(parsedUrl.pathname + parsedUrl.search, proxy);
                   return origUndiciRequest.call(this, proxiedUrl, {
                       ...options,
                       headers
                   });
               }
               return origUndiciRequest.apply(this, arguments);
           };
           exports.request._patched = true;
           if (DEBUG) console.log("[cloudflare-proxy] Patched undici.request");
        }

        // Patch undici.Dispatcher to catch low-level calls (Pool, Client, etc.)
        if (exports.Dispatcher && exports.Dispatcher.prototype.dispatch && !exports.Dispatcher.prototype.dispatch._patched) {
            const origDispatch = exports.Dispatcher.prototype.dispatch;
            exports.Dispatcher.prototype.dispatch = function(options, handler) {
                const origin = options.origin ? String(options.origin) : "";
                let hostname = "";
                try {
                    hostname = new URL(origin).hostname;
                } catch(e) {
                    hostname = origin.split(':')[0];
                }

                if (shouldProxyHost(hostname)) {
                    if (DEBUG) console.log(`[cloudflare-proxy] Redirecting undici dispatch: ${hostname}${options.path} -> ${proxy.hostname}`);
                    
                    if (Array.isArray(options.headers)) {
                        options.headers.push("x-target-host", hostname);
                        if (PROXY_SHARED_SECRET) options.headers.push("x-proxy-key", PROXY_SHARED_SECRET);
                    } else {
                        options.headers = options.headers || {};
                        options.headers["x-target-host"] = hostname;
                        if (PROXY_SHARED_SECRET) options.headers["x-proxy-key"] = PROXY_SHARED_SECRET;
                    }
                    
                    options.origin = `https://${proxy.hostname}`;
                }
                return origDispatch.call(this, options, handler);
            };
            exports.Dispatcher.prototype.dispatch._patched = true;
            if (DEBUG) console.log("[cloudflare-proxy] Patched undici.Dispatcher.prototype.dispatch");
        }
      }
      return exports;
    };

    if (DEBUG) {
      console.log(`[cloudflare-proxy] Target proxy: ${proxy.hostname}`);
      console.log(`[cloudflare-proxy] Proxying: ${PROXY_ALL ? "ALL (except internal)" : BLOCKED_DOMAINS.join(", ")}`);
    }
  } catch (error) {
    console.error(`[cloudflare-proxy] Failed to initialize: ${error.message}`);
  }
}


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

const DEBUG = process.env.CLOUDFLARE_PROXY_DEBUG === "true";
const PROXY_SHARED_SECRET = (process.env.CLOUDFLARE_PROXY_SECRET || "").trim();
const DEFAULT_PROXY_DOMAINS = [
  "api.telegram.org", "discord.com", "discordapp.com",
  "gateway.discord.gg", "status.discord.com", "web.whatsapp.com",
  "graph.facebook.com", "graph.instagram.com",
  "api.twitter.com", "api.x.com", "upload.twitter.com",
  "api.linkedin.com", "www.linkedin.com",
  "open.tiktokapis.com", "oauth.reddit.com",
  "youtube.com", "www.youtube.com",
  "api.openai.com",
  "api.resend.com", "api.sendgrid.com", "api.mailgun.net",
  "googleapis.com", "google.com", "googleusercontent.com", "gstatic.com",
];
const PROXY_DOMAINS_RAW = (process.env.CLOUDFLARE_PROXY_DOMAINS || "").trim();
const PROXY_ALL = PROXY_DOMAINS_RAW === "*";
let BLOCKED_DOMAINS;
if (PROXY_ALL) {
  BLOCKED_DOMAINS = [];
} else {
  const extra = PROXY_DOMAINS_RAW.split(",").map((d) => d.trim()).filter(Boolean);
  const seen = new Set(DEFAULT_PROXY_DOMAINS);
  BLOCKED_DOMAINS = [...DEFAULT_PROXY_DOMAINS];
  for (const d of extra) {
    if (!seen.has(d)) { BLOCKED_DOMAINS.push(d); seen.add(d); }
  }
}

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
        
        let mergedHeaders;
        if (request) {
            mergedHeaders = new Headers(request.headers);
        } else {
            mergedHeaders = new Headers(init?.headers || {});
        }

        const alreadyProxied =
          mergedHeaders.has("x-target-host") || mergedHeaders.has("X-Target-Host");

        if (!shouldProxy || alreadyProxied) {
          return originalFetch(input, init);
        }

        if (DEBUG) {
          log(
            `[cloudflare-proxy] Redirecting fetch://${hostname}${url.pathname}${url.search} -> ${proxy.hostname}`,
          );
        }

        mergedHeaders.set("x-target-host", hostname);
        if (PROXY_SHARED_SECRET) {
          mergedHeaders.set("x-proxy-key", PROXY_SHARED_SECRET);
        }

        const proxiedUrl = new URL(url.pathname + url.search, proxy);

        const logProxyError = (promise, debugInfo) => {
          promise
            .then(r => {
              if (DEBUG && !r.ok) {
                log(`[cloudflare-proxy] Proxy HTTP ${r.status} for ${hostname}: ${r.statusText}`);
              }
            })
            .catch(err => {
              const cause = err?.cause;
              const causeStr = cause
                ? ` | cause: ${cause?.code || cause?.message || String(cause)}`
                : "";
              log(`[cloudflare-proxy] Proxy FAILED ${hostname}: ${err?.message}${causeStr}`);
              if (DEBUG && debugInfo) {
                log(`[cloudflare-proxy] Debug: ${debugInfo}`);
              }
            });
          return promise;
        };

        if (request) {
          const fetchOpts = {
            method: request.method,
            headers: mergedHeaders,
            redirect: request.redirect,
          };
          if (request.body) {
            fetchOpts.body = request.body;
            fetchOpts.duplex = "half";
          }
          return logProxyError(
            originalFetch(String(proxiedUrl), fetchOpts),
            `request-mode method=${request.method} hasBody=${!!request.body}`,
          );
        }

        // Build a fresh init: do NOT spread `init` because it may carry a
        // `dispatcher`/`client` pinned to the original target's connection
        // pool, which causes undici to throw UND_ERR_INVALID_ARG when we
        // change the origin. Forward only well-known fetch options.
        const newInit = {
          method: init?.method || "GET",
          headers: mergedHeaders,
        };
        if (init?.body != null) {
          newInit.body = init.body;
          if (init.body instanceof ReadableStream) {
            newInit.duplex = init.duplex || "half";
          }
        }
        if (init?.signal) newInit.signal = init.signal;
        if (init?.redirect) newInit.redirect = init.redirect;
        if (init?.credentials) newInit.credentials = init.credentials;
        if (init?.cache) newInit.cache = init.cache;
        if (init?.mode) newInit.mode = init.mode;
        if (init?.referrer) newInit.referrer = init.referrer;
        if (init?.referrerPolicy) newInit.referrerPolicy = init.referrerPolicy;
        if (init?.integrity) newInit.integrity = init.integrity;
        if (init?.keepalive != null) newInit.keepalive = init.keepalive;

        const bodyType = init?.body == null
          ? "none"
          : init.body instanceof ReadableStream
            ? "ReadableStream"
            : (init.body?.constructor?.name || typeof init.body);

        return logProxyError(
          originalFetch(String(proxiedUrl), newInit),
          `init-mode method=${newInit.method} body=${bodyType} initKeys=${Object.keys(init || {}).join(",")}`,
        );
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
              
              const targetHeader = "x-target-host";
              const secretHeader = "x-proxy-key";

              if (Array.isArray(options.headers)) {
                let foundTarget = false;
                for (let i = 0; i < options.headers.length; i += 2) {
                  if (String(options.headers[i]).toLowerCase() === targetHeader) {
                    foundTarget = true;
                    break;
                  }
                }
                if (!foundTarget) {
                  options.headers.push(targetHeader, hostname);
                  if (PROXY_SHARED_SECRET) options.headers.push(secretHeader, PROXY_SHARED_SECRET);
                }
              } else {
                options.headers = options.headers || {};
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

      // Also patch Agent and other potentially unexported classes if they have dispatch
      if (exports.Agent && exports.Agent.prototype) patchDispatch(exports.Agent.prototype, "Agent");
      if (exports.Pool && exports.Pool.prototype) patchDispatch(exports.Pool.prototype, "Pool");
      if (exports.Client && exports.Client.prototype) patchDispatch(exports.Client.prototype, "Client");

      if (exports.fetch && !exports.fetch._patched) {
        const origFetch = exports.fetch;
        exports.fetch = async function (input, init) {
          // If we are calling undici.fetch, it should use our globalThis.fetch which is patched
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

    // Hook require() to patch any undici instance the moment it loads.
    // Match either the bare "undici" id or paths whose final package
    // segment IS undici (e.g. "/foo/node_modules/undici/index.js"). The
    // earlier substring check `id.includes("/undici/")` would also match
    // unrelated packages like "super-undici-x".
    const Module = require("module");
    const originalRequire = Module.prototype.require;
    const UNDICI_PATH_RE = /(?:^|\/)node_modules\/undici(?:\/|$)/;
    Module.prototype.require = function (id) {
      const exports = originalRequire.apply(this, arguments);
      if (id === "undici" || UNDICI_PATH_RE.test(id)) {
        try { patchUndiciInstance(exports); } catch (e) {}
      }
      return exports;
    };

    // Startup banner: print once across all Node spawns. Use a file marker
    // because every Node process (health-server, gateway, sync subprocess)
    // is spawned fresh from bash with NODE_OPTIONS=--require, so an env-var
    // marker won't propagate. /tmp is per-container so it resets on rebuild.
    if (DEBUG) {
      try {
        require("fs").writeFileSync("/tmp/.cf-proxy-banner-shown", "1", {
          flag: "wx",
        });
        log(
          `[cloudflare-proxy] active (${PROXY_ALL ? "wildcard" : "list"}) -> ${proxy.hostname}`,
        );
      } catch (_) {
        // marker exists — banner already shown by another process
      }
    }
  } catch (error) {
    log(`[cloudflare-proxy] Failed to initialize: ${error.message}`);
  }
}

/**
 * Cloudflare Proxy: Transparent Fix for Blocked Domains
 *
 * Patches https.request/http.request/fetch to redirect traffic for blocked
 * hosts through a Cloudflare Worker proxy.
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
        } else if (options && typeof options === "object") {
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
            log(
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
          return originalFetch(
            new Request(proxiedUrl, {
              method: request.method,
              headers,
              body: request.body,
              redirect: request.redirect,
              duplex: "half",
            }),
          );
        }

        return originalFetch(proxiedUrl, {
          ...init,
          headers,
        });
      };
    }

    if (DEBUG) {
      log(`[cloudflare-proxy] Transparent proxy active in ${PROXY_ALL ? "wildcard" : "list"} mode`);
      log(`[cloudflare-proxy] Target proxy: ${proxy.hostname}`);
    }
  } catch (error) {
    log(`[cloudflare-proxy] Failed to initialize: ${error.message}`);
  }
}

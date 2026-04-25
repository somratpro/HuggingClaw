/**
 * Cloudflare Proxy: Transparent Fix for Blocked Domains
 *
 * Patches https.request/http.request to redirect traffic for blocked hosts
 * through a Cloudflare Worker proxy.
 */
"use strict";

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

const DEBUG = process.env.CLOUDFLARE_PROXY_DEBUG === "true";
const PROXY_SHARED_SECRET = (process.env.CLOUDFLARE_PROXY_SECRET || "").trim();
// Default to wildcard mode so Google, WhatsApp, Telegram, Discord, and other
// outbound integrations all work unless they are HF-internal hosts.
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

        const isInternal =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.endsWith(".hf.space") ||
          hostname.endsWith(".huggingface.co") ||
          hostname === "huggingface.co";

        let shouldProxy = false;
        if (PROXY_ALL) {
          shouldProxy = !isInternal;
        } else {
          shouldProxy = BLOCKED_DOMAINS.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
          );
        }

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

    if (DEBUG) {
      if (PROXY_ALL) {
        console.log(
          "[cloudflare-proxy] Transparent proxy active in wildcard mode",
        );
      } else {
        console.log(
          `[cloudflare-proxy] Transparent proxy active for: ${BLOCKED_DOMAINS.join(", ")}`,
        );
      }
      console.log(`[cloudflare-proxy] Target proxy: ${proxy.hostname}`);
    }
  } catch (error) {
    if (DEBUG) {
      console.error(
        `[cloudflare-proxy] Failed to initialize: ${error.message}`,
      );
    }
  }
}

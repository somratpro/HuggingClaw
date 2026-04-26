/**
 * Cloudflare Worker: Universal Outbound Proxy
 *
 * Manual setup:
 * 1. Create a Cloudflare Worker.
 * 2. Paste this file and deploy it.
 * 3. Use the worker URL as CLOUDFLARE_PROXY_URL.
 *
 * Optional worker vars:
 * - PROXY_SHARED_SECRET
 * - ALLOWED_TARGETS
 * - ALLOW_PROXY_ALL
 */

function normalizeList(raw) {
  return String(raw || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const queryTarget = url.searchParams.get("proxy_target");
    const targetHost = request.headers.get("x-target-host") || queryTarget;
    const proxySecret = (
      env.PROXY_SHARED_SECRET ||
      env.CLOUDFLARE_PROXY_SECRET ||
      ""
    ).trim();

    if (proxySecret) {
      const providedSecret = request.headers.get("x-proxy-key") || url.searchParams.get("proxy_key") || "";
      if (providedSecret !== proxySecret) {
        // Fallback: allow Telegram requests via path without secret if it looks like a bot API call.
        // This is safe because it only proxies to api.telegram.org.
        if (url.pathname.startsWith("/bot") && !targetHost) {
          // Allowed
        } else {
          return new Response("Unauthorized: Invalid proxy key", { status: 401 });
        }
      }
    }

    const allowProxyAll =
      String(env.ALLOW_PROXY_ALL || "true").toLowerCase() === "true";
    const allowedTargets = normalizeList(
      env.ALLOWED_TARGETS || "api.telegram.org,discord.com,discordapp.com,gateway.discord.gg,status.discord.com,web.whatsapp.com,graph.facebook.com,googleapis.com,google.com,googleusercontent.com,gstatic.com",
    );

    const isAllowedHost = (hostname) => {
      const normalized = String(hostname || "")
        .trim()
        .toLowerCase();
      if (!normalized) return false;
      if (allowProxyAll) return true;
      return allowedTargets.some(
        (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
      );
    };

    let targetBase = "";
    if (targetHost) {
      if (!isAllowedHost(targetHost)) {
        return new Response(`Forbidden: Host ${targetHost} is not allowed.`, { status: 403 });
      }
      targetBase = `https://${targetHost}`;
    } else if (url.pathname.startsWith("/bot")) {
      targetBase = "https://api.telegram.org";
    } else {
      return new Response("Invalid request: No target host provided.", { status: 400 });
    }

    const cleanSearch = new URLSearchParams(url.search);
    cleanSearch.delete("proxy_target");
    cleanSearch.delete("proxy_key");
    const searchStr = cleanSearch.toString();
    const targetUrl = targetBase + url.pathname + (searchStr ? `?${searchStr}` : "");
    
    const headers = new Headers(request.headers);
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("host");
    headers.delete("x-real-ip");
    headers.delete("x-target-host");
    headers.delete("x-proxy-key");

    const proxiedRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "follow",
    });

    try {
      return await fetch(proxiedRequest);
    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, { status: 502 });
    }
  },
};

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
    const targetHost = request.headers.get("x-target-host");
    const proxySecret = (
      env.PROXY_SHARED_SECRET ||
      env.CLOUDFLARE_PROXY_SECRET ||
      ""
    ).trim();

    if (proxySecret) {
      const providedSecret = request.headers.get("x-proxy-key") || "";
      if (providedSecret !== proxySecret) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const allowProxyAll =
      String(env.ALLOW_PROXY_ALL || "true").toLowerCase() === "true";
    const allowedTargets = normalizeList(
      env.ALLOWED_TARGETS || "api.telegram.org,web.whatsapp.com",
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
        return new Response("Target host is not allowed.", { status: 403 });
      }
      targetBase = `https://${targetHost}`;
    } else if (url.pathname.startsWith("/bot")) {
      targetBase = "https://api.telegram.org";
    } else {
      return new Response("Invalid request.", { status: 400 });
    }

    const targetUrl = targetBase + url.pathname + url.search;
    const headers = new Headers(request.headers);
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("x-real-ip");
    headers.delete("x-target-host");

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

#!/usr/bin/env python3

import json
import os
import re
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_BASE = "https://api.cloudflare.com/client/v4"
ENV_FILE = Path("/tmp/huggingclaw-cloudflare-proxy.env")
DEFAULT_ALLOWED = [
    # Messaging
    "api.telegram.org",
    "discord.com",
    "discordapp.com",
    "gateway.discord.gg",
    "status.discord.com",
    "web.whatsapp.com",
    # Social — confirmed/likely blocked by HF firewall
    "graph.facebook.com",
    "graph.instagram.com",
    "api.twitter.com",
    "api.x.com",
    "upload.twitter.com",
    "api.linkedin.com",
    "www.linkedin.com",
    "open.tiktokapis.com",
    "oauth.reddit.com",
    # Video
    "youtube.com",
    "www.youtube.com",
    # AI APIs
    "api.openai.com",
    # Email HTTP APIs (SMTP ports are blocked; use these instead)
    "api.resend.com",
    "api.sendgrid.com",
    "api.mailgun.net",
    # Google
    "googleapis.com",
    "google.com",
    "googleusercontent.com",
    "gstatic.com",
]


def cf_request(method: str, path: str, token: str, body: bytes | None = None, content_type: str = "application/json"):
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("success"):
        errors = payload.get("errors") or [{"message": "Unknown Cloudflare API error"}]
        raise RuntimeError(errors[0].get("message", "Unknown Cloudflare API error"))
    return payload["result"]


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    cleaned = re.sub(r"-{2,}", "-", cleaned)
    if not cleaned:
        cleaned = "huggingclaw-proxy"
    return cleaned[:63].rstrip("-")


def derive_worker_name() -> str:
    explicit = os.environ.get("CLOUDFLARE_WORKER_NAME", "").strip()
    if explicit:
        return slugify(explicit)
    space_host = os.environ.get("SPACE_HOST", "").strip()
    if space_host:
        base = space_host.replace(".hf.space", "")
        return slugify(f"{base}-proxy")
    return "huggingclaw-proxy"


def render_worker(secret_value: str, allowed_targets: list[str], allow_proxy_all: bool) -> str:
    allowed_json = json.dumps(allowed_targets)
    allow_all_js = "true" if allow_proxy_all else "false"
    secret_json = json.dumps(secret_value)
    return f"""addEventListener("fetch", (event) => {{
  event.respondWith(handleRequest(event.request));
}});

const PROXY_SHARED_SECRET = {secret_json};
const ALLOW_PROXY_ALL = {allow_all_js};
const ALLOWED_TARGETS = {allowed_json};

function isAllowedHost(hostname) {{
  const normalized = String(hostname || "").trim().toLowerCase();
  if (!normalized) return false;
  if (ALLOW_PROXY_ALL) return true;
  return ALLOWED_TARGETS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${{domain}}`),
  );
}}

async function handleRequest(request) {{
  const url = new URL(request.url);
  const queryTarget = url.searchParams.get("proxy_target");
  const targetHost = request.headers.get("x-target-host") || queryTarget;

  if (PROXY_SHARED_SECRET) {{
    const providedSecret = request.headers.get("x-proxy-key") || url.searchParams.get("proxy_key") || "";
    if (providedSecret !== PROXY_SHARED_SECRET) {{
      if (url.pathname.startsWith("/bot") && !targetHost) {{
        // Allowed fallback
      }} else {{
        return new Response("Unauthorized: Invalid proxy key", {{ status: 401 }});
      }}
    }}
  }}

  let targetBase = "";
  if (targetHost) {{
    if (!isAllowedHost(targetHost)) {{
      return new Response(`Forbidden: Host ${{targetHost}} is not allowed.`, {{ status: 403 }});
    }}
    targetBase = `https://${{targetHost}}`;
  }} else if (url.pathname.startsWith("/bot")) {{
    targetBase = "https://api.telegram.org";
  }} else {{
    return new Response("Invalid request: No target host provided.", {{ status: 400 }});
  }}

  const cleanSearch = new URLSearchParams(url.search);
  cleanSearch.delete("proxy_target");
  cleanSearch.delete("proxy_key");
  const searchStr = cleanSearch.toString();
  const targetUrl = targetBase + url.pathname + (searchStr ? `?${{searchStr}}` : "");
  
  const headers = new Headers(request.headers);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");
  headers.delete("host");
  headers.delete("x-real-ip");
  headers.delete("x-target-host");
  headers.delete("x-proxy-key");

  const proxiedRequest = new Request(targetUrl, {{
    method: request.method,
    headers,
    body: request.body,
    redirect: "follow",
  }});

  try {{
    return await fetch(proxiedRequest);
  }} catch (error) {{
    return new Response(`Proxy Error: ${{error.message}}`, {{ status: 502 }});
  }}
}}
"""


def write_env(proxy_url: str, proxy_secret: str) -> None:
    ENV_FILE.write_text(
        "\n".join(
            [
                f'export CLOUDFLARE_PROXY_URL="{proxy_url}"',
                f'export CLOUDFLARE_PROXY_SECRET="{proxy_secret}"',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    # Belt-and-suspenders: even with umask 0077 on the parent shell, force
    # 0600 since the file holds the worker shared secret.
    try:
        ENV_FILE.chmod(0o600)
    except OSError:
        pass


def main() -> int:
    existing_url = os.environ.get("CLOUDFLARE_PROXY_URL", "").strip()
    existing_secret = os.environ.get("CLOUDFLARE_PROXY_SECRET", "").strip()
    api_token = os.environ.get("CLOUDFLARE_WORKERS_TOKEN", "").strip()

    if existing_url:
        # Always write the env file so downstream `. $CF_PROXY_ENV_FILE` in
        # start.sh has CLOUDFLARE_PROXY_URL set even when no secret was
        # supplied. Empty secret means we send no x-proxy-key header — that
        # only works if the deployed worker also has no secret baked in.
        write_env(existing_url, existing_secret)
        if not existing_secret:
            print(
                "Warning: CLOUDFLARE_PROXY_URL is set but CLOUDFLARE_PROXY_SECRET "
                "is empty. Requests will succeed only if the deployed worker "
                "was built without PROXY_SHARED_SECRET; otherwise you'll see "
                "401 Unauthorized.",
                file=sys.stderr,
            )
        return 0

    if not api_token:
        return 0

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    try:
        if not account_id:
            accounts = cf_request("GET", "/accounts", api_token)
            if not accounts:
                raise RuntimeError("No Cloudflare account available for this token.")
            account_id = accounts[0]["id"]

        subdomain_info = cf_request(
            "GET",
            f"/accounts/{account_id}/workers/subdomain",
            api_token,
        )
        subdomain = (subdomain_info or {}).get("subdomain", "").strip()
        if not subdomain:
            raise RuntimeError(
                "Cloudflare Workers subdomain is not configured. Enable workers.dev in your Cloudflare account first."
            )

        worker_name = derive_worker_name()
        allowed_raw = os.environ.get("CLOUDFLARE_PROXY_DOMAINS", "").strip()
        allow_proxy_all = allowed_raw == "*"
        if allow_proxy_all:
            allowed_targets = DEFAULT_ALLOWED
        else:
            extra = [v.strip() for v in allowed_raw.split(",") if v.strip()]
            seen = set(DEFAULT_ALLOWED)
            allowed_targets = list(DEFAULT_ALLOWED)
            for domain in extra:
                if domain not in seen:
                    allowed_targets.append(domain)
                    seen.add(domain)
        proxy_secret = existing_secret or secrets.token_urlsafe(24)
        worker_source = render_worker(proxy_secret, allowed_targets, allow_proxy_all)

        cf_request(
            "PUT",
            f"/accounts/{account_id}/workers/scripts/{worker_name}",
            api_token,
            body=worker_source.encode("utf-8"),
            content_type="application/javascript",
        )
        cf_request(
            "POST",
            f"/accounts/{account_id}/workers/scripts/{worker_name}/subdomain",
            api_token,
            body=json.dumps({"enabled": True, "previews_enabled": True}).encode("utf-8"),
        )

        proxy_url = f"https://{worker_name}.{subdomain}.workers.dev"
        write_env(proxy_url, proxy_secret)
        return 0
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        if error.code == 403 and '"code":9109' in detail:
            print(
                "Cloudflare proxy setup failed: invalid Workers token. "
                "Use a Cloudflare API Token in CLOUDFLARE_WORKERS_TOKEN "
                "(not a Global API Key, tunnel token, or worker secret). "
                "For auto-setup, it should have account-level 'Workers Scripts: Edit'. "
                "The setup can auto-discover your account; CLOUDFLARE_ACCOUNT_ID is not required.",
                file=sys.stderr,
            )
        print(f"Cloudflare proxy setup failed: HTTP {error.code} {detail}", file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Cloudflare proxy setup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

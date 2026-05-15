// Single public entrypoint for HF Spaces: dashboard + reverse proxy to OpenClaw + JupyterLab.
const http = require("http");
const fs = require("fs");
const net = require("net");

function isTrue(value) {
  return /^(true|1|yes|on)$/i.test(String(value || "").trim());
}
function normalizeBase(value, fallback) {
  const raw = String(value || fallback || "").trim() || fallback;
  if (!raw) return fallback;
  const base = raw.startsWith("/") ? raw : `/${raw}`;
  return base.replace(/\/+$/, "") || fallback;
}

const PORT = Number.parseInt(process.env.PORT || "7861", 10);
const GATEWAY_PORT = Number.parseInt(process.env.GATEWAY_PORT || "7860", 10);
const GATEWAY_HOST = "127.0.0.1";
const JUPYTER_PORT = Number.parseInt(process.env.JUPYTER_PORT || "8888", 10);
const JUPYTER_HOST = "127.0.0.1";
const JUPYTER_BASE = normalizeBase(process.env.JUPYTER_BASE, "/terminal");
const DEV_MODE_ENABLED = isTrue(process.env.DEV_MODE);
const JUPYTER_ENABLED = /^(true|1|yes|on)$/i.test(
  process.env.HUGGINGCLAW_JUPYTER_ENABLED || (DEV_MODE_ENABLED ? "true" : "false")
);
const startTime = Date.now();
const LLM_MODEL = process.env.LLM_MODEL || "Not Set";
const TELEGRAM_ENABLED = !!process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_ENABLED = isTrue(process.env.WHATSAPP_ENABLED);
const WHATSAPP_STATUS_FILE = "/tmp/huggingclaw-wa-status.json";
const HF_BACKUP_ENABLED = !!process.env.HF_TOKEN;
const SYNC_INTERVAL = (process.env.SYNC_INTERVAL || "180").trim() || "180";
const BACKUP_DATASET_NAME = (process.env.BACKUP_DATASET_NAME || process.env.BACKUP_DATASET || "huggingclaw-backup").trim() || "huggingclaw-backup";
const DEVDATA_DATASET_NAME = (process.env.DEVDATA_DATASET_NAME || "huggingclaw-devdata").trim() || "huggingclaw-devdata";
const DEVDATA_SYNC_INTERVAL = (process.env.DEVDATA_SYNC_INTERVAL || "180").trim() || "180";
const DEVDATA_SEPARATE_DATASET = DEVDATA_DATASET_NAME !== BACKUP_DATASET_NAME;
const DEVDATA_ENABLED = JUPYTER_ENABLED && HF_BACKUP_ENABLED && DEVDATA_SEPARATE_DATASET && !/^(off|false|0|no)$/i.test((process.env.DEVDATA || "on").trim());
const APP_BASE = normalizeBase(process.env.APP_BASE, "/app");
const SYNC_STATUS_FILE = "/tmp/sync-status.json";
const CLOUDFLARE_KEEPALIVE_STATUS_FILE =
  "/tmp/huggingclaw-cloudflare-keepalive-status.json";

function parseRequestUrl(url) {
  try { return new URL(url, "http://localhost"); }
  catch { return new URL("http://localhost/"); }
}

function getSyncStatus() {
  try {
    if (fs.existsSync(SYNC_STATUS_FILE))
      return JSON.parse(fs.readFileSync(SYNC_STATUS_FILE, "utf8"));
  } catch {}
  if (HF_BACKUP_ENABLED)
    return { status: "configured", message: `Backup enabled. Waiting for sync window (${SYNC_INTERVAL}s).` };
  return { status: "unknown", message: "No sync data yet" };
}

function readGuardianStatus() {
  if (!WHATSAPP_ENABLED) return { configured: false, connected: false, pairing: false };
  try {
    if (fs.existsSync(WHATSAPP_STATUS_FILE)) {
      const p = JSON.parse(fs.readFileSync(WHATSAPP_STATUS_FILE, "utf8"));
      return { configured: p.configured !== false, connected: p.connected === true, pairing: p.pairing === true };
    }
  } catch {}
  return { configured: true, connected: false, pairing: false };
}

function getKeepaliveStatus() {
  try {
    if (fs.existsSync(CLOUDFLARE_KEEPALIVE_STATUS_FILE))
      return JSON.parse(fs.readFileSync(CLOUDFLARE_KEEPALIVE_STATUS_FILE, "utf8"));
  } catch {}
  return null;
}

function probePort(host, port, path, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: host, port, path, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
  });
}

function formatUptime(ms) {
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function escapeHtml(v) {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function badge(label, tone = "neutral") {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function tile({ title, value, detail = "", tone = "neutral", meta = "" }) {
  return `<article class="tile ${tone}">
    <div class="tile-head"><span class="tile-title">${escapeHtml(title)}</span><span class="tile-dot"></span></div>
    <div class="tile-value">${value}</div>
    ${detail ? `<div class="tile-detail">${detail}</div>` : ""}
    ${meta ? `<div class="tile-meta">${meta}</div>` : ""}
  </article>`;
}

function renderDashboard(data) {
  const syncStatus = String(data.sync?.status || "unknown");
  const syncTone = ["success","restored","synced","configured"].includes(syncStatus) ? "ok" : syncStatus === "disabled" ? "warn" : "neutral";
  const kaConf = data.keepalive?.configured === true;
  const kaStatus = String(data.keepalive?.status || (process.env.CLOUDFLARE_WORKERS_TOKEN ? "pending" : "not configured"));
  const kaTone = kaConf ? "ok" : process.env.CLOUDFLARE_WORKERS_TOKEN ? "warn" : "neutral";

  const tiles = [
    tile({ title: "Gateway", value: badge(data.gatewayReady ? "Online" : "Offline", data.gatewayReady ? "ok" : "off"), detail: `OpenClaw on internal port ${GATEWAY_PORT}`, tone: data.gatewayReady ? "ok" : "off" }),
    tile({ title: "Model", value: `<code>${escapeHtml(LLM_MODEL)}</code>`, detail: "Primary LLM configured", tone: "neutral" }),
    tile({ title: "Runtime", value: escapeHtml(data.uptimeHuman), detail: `Public port ${PORT}`, tone: "neutral" }),
    tile({ title: "Telegram", value: badge(TELEGRAM_ENABLED ? "Enabled" : "Disabled", TELEGRAM_ENABLED ? "ok" : "neutral"), detail: TELEGRAM_ENABLED ? "Bot channel active" : "Not configured", tone: TELEGRAM_ENABLED ? "ok" : "neutral" }),
    tile({ title: "Backup", value: badge(syncStatus.toUpperCase(), syncTone), detail: escapeHtml(data.sync?.message || "No status yet"), tone: syncTone, meta: data.sync?.timestamp ? `<span class="local-time" data-iso="${data.sync.timestamp}"></span>` : "" }),
    tile({ title: "Keep Awake", value: badge(kaConf ? "CF Cron" : kaStatus.toUpperCase(), kaTone), detail: kaConf ? `Pinging <code>${escapeHtml(data.keepalive?.targetUrl || "/health")}</code>` : process.env.CLOUDFLARE_WORKERS_TOKEN ? "Worker pending or failed" : "Not configured", tone: kaTone }),
  ];

  if (JUPYTER_ENABLED) {
    tiles.push(tile({ title: "Terminal", value: badge(data.jupyterReady ? "Online" : "Starting…", data.jupyterReady ? "ok" : "warn"), detail: `JupyterLab at <a href="${JUPYTER_BASE}/" style="color:inherit">${JUPYTER_BASE}/</a>`, tone: data.jupyterReady ? "ok" : "warn" }));
    tiles.push(tile({
      title: "DevData",
      value: badge(DEVDATA_ENABLED ? "Enabled" : "Disabled", DEVDATA_ENABLED ? "ok" : "neutral"),
      detail: DEVDATA_ENABLED ? `Separate dataset <code>${escapeHtml(DEVDATA_DATASET_NAME)}</code>` : DEVDATA_SEPARATE_DATASET ? "Separate Jupyter dataset backup inactive" : "DevData dataset must be separate from main backup dataset",
      tone: DEVDATA_ENABLED ? "ok" : "neutral",
      meta: `Sync interval ${escapeHtml(DEVDATA_SYNC_INTERVAL)}s`,
    }));
  }

  const tilesHtml = tiles.join("");

  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>HuggingClaw</title>
  <style>
    :root{color-scheme:dark;--bg:#08080f;--panel:#12111b;--line:#26243a;--text:#f6f4ff;--muted:#7f7a9e;--soft:#b8b3d7;--good:#22c55e;--warn:#f5c542;--bad:#fb7185}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:13px}
    main{width:min(720px,calc(100% - 32px));margin:0 auto;padding:36px 0 44px}
    header{text-align:center;margin-bottom:22px}h1{margin:0;font-size:1.65rem;line-height:1}
    .subtitle{margin-top:12px;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.14em;font-weight:800}
    .btn-row{display:flex;gap:12px;margin:24px 0 20px}
    .hero-action{display:flex;flex:1;min-height:46px;align-items:center;justify-content:center;border-radius:8px;background:#fff;color:#000;text-decoration:none;font-weight:850;font-size:.98rem;transition:opacity .15s}
    .hero-action:hover{opacity:.9}.hero-action.terminal{background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a}.hero-action.env{background:#312e81;color:#eef2ff;border:1px solid #6366f1}
    .overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .tile{border:1px solid var(--line);background:var(--panel);border-radius:11px;padding:18px;min-height:124px;display:flex;flex-direction:column;gap:10px}
    .tile.ok{border-color:rgba(34,197,94,.22)}.tile.warn{border-color:rgba(245,197,66,.24)}.tile.off{border-color:rgba(251,113,133,.28)}
    .tile-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .tile-title{color:var(--muted);font-size:.67rem;letter-spacing:.18em;text-transform:uppercase;font-weight:850}
    .tile-dot{width:7px;height:7px;border-radius:50%;background:var(--line)}
    .tile.ok .tile-dot{background:var(--good)}.tile.warn .tile-dot{background:var(--warn)}.tile.off .tile-dot{background:var(--bad)}
    .tile-value{font-size:1.12rem;font-weight:850;overflow-wrap:anywhere}.tile-detail{color:var(--soft);line-height:1.45;font-size:.83rem}
    .tile-meta{color:var(--muted);line-height:1.4;font-size:.75rem;margin-top:auto;overflow-wrap:anywhere}
    code{background:#232234;border:1px solid #34324c;border-radius:6px;padding:2px 6px;color:var(--text);font-size:.9em}
    .badge{display:inline-flex;align-items:center;width:max-content;border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:.72rem;font-weight:850;line-height:1;text-transform:uppercase}
    .badge.ok{color:var(--good);border-color:rgba(34,197,94,.34);background:rgba(34,197,94,.11)}
    .badge.warn{color:var(--warn);border-color:rgba(245,197,66,.34);background:rgba(245,197,66,.11)}
    .badge.off{color:var(--bad);border-color:rgba(251,113,133,.34);background:rgba(251,113,133,.11)}
    .badge.neutral{color:var(--soft)}
    footer{color:var(--muted);text-align:center;font-size:.74rem;margin-top:18px}
    @media(max-width:700px){.overview{grid-template-columns:1fr}main{width:min(100% - 22px,720px);padding-top:28px}.btn-row{flex-direction:column}}
  </style></head><body><main>
  <header><h1>🦞 HuggingClaw</h1><div class="subtitle">OpenClaw Gateway</div></header>
  <div class="btn-row">
    <a class="hero-action" data-space-link="app" href="${APP_BASE}/">Open Control UI →</a>
    ${JUPYTER_ENABLED ? `<a class="hero-action terminal" data-space-link="terminal" href="${JUPYTER_BASE}/">💻 Open Terminal →</a>` : ""}
    <a class="hero-action env" data-space-link="env-builder" href="/env-builder">⚙️ Env Builder →</a>
  </div>
  <section class="overview">${tilesHtml}</section>
  <footer>Built by <a href="https://github.com/somratpro" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">@somratpro</a>${JUPYTER_ENABLED ? " · Terminal by JupyterLab" : ""}<br><span>Public Spaces can be opened directly via <code>.hf.space</code>; private Spaces require the App tab session.</span></footer>
  </main>
  <script>
  document.querySelectorAll('.local-time').forEach(el=>{const d=new Date(el.getAttribute('data-iso'));if(!isNaN(d))el.textContent='At '+d.toLocaleTimeString()});
  const inEmbeddedApp = (() => { try { return window.top !== window.self; } catch { return true; } })();
  const isDirectHfSpaceHost = /\.hf\.space$/i.test(window.location.hostname);
  // If inside the HF App iframe, force new-tab navigation so users can break out
  // to the standalone Space host. Also keep direct .hf.space behavior opening new tabs.
  const openInNewTab = inEmbeddedApp || isDirectHfSpaceHost;
  document.querySelectorAll('a[data-space-link]').forEach((a) => {
    if (openInNewTab) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    } else {
      a.removeAttribute('target');
      a.removeAttribute('rel');
    }
  });
</script>
</body></html>`;
}

function renderEnvBuilder() {
  try {
    return fs.readFileSync(require("path").join(__dirname, "env-builder.html"), "utf8");
  } catch (exc) {
    return `<!doctype html><title>Env Builder unavailable</title><pre>${escapeHtml(exc.message)}</pre>`;
  }
}

// ── Generic proxy ──
function proxiedPath(url, { stripPrefix = "" } = {}) {
  if (!stripPrefix) return url.pathname + url.search;
  if (url.pathname === stripPrefix) return "/" + url.search;
  if (url.pathname.startsWith(stripPrefix + "/")) {
    return url.pathname.slice(stripPrefix.length) + url.search;
  }
  return url.pathname + url.search;
}

function rewriteProxyHeaders(headers, { publicPrefix = "", targetHost = "", targetPort = "" } = {}) {
  const next = { ...headers };

  // Keep browser redirects inside the public HF Space path. Backends may emit
  // root-relative redirects ("/login") or absolute redirects pointing at their
  // internal listener ("http://127.0.0.1:8888/..."). Both break from a browser
  // if we do not normalize them back to the public mount path.
  if (publicPrefix && typeof next.location === "string") {
    try {
      const internalOrigins = new Set([
        "http://huggingclaw.local",
        `http://${targetHost}:${targetPort}`,
        `http://localhost:${targetPort}`,
        `http://127.0.0.1:${targetPort}`,
      ]);
      const location = new URL(next.location, "http://huggingclaw.local");
      if (internalOrigins.has(location.origin)) {
        let path = location.pathname;
        if (path !== publicPrefix && !path.startsWith(publicPrefix + "/")) {
          path = publicPrefix + (path.startsWith("/") ? path : `/${path}`);
        }
        next.location = path + location.search + location.hash;
      }
    } catch {}
  }

  return next;
}

function sendServiceUnavailable(res) {
  if (!res.headersSent) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "starting", message: "Service is initializing… please wait." }));
  } else {
    res.end();
  }
}

function proxyHTTP(req, res, targetHost, targetPort, options = {}) {
  const url = parseRequestUrl(req.url);
  const headers = {
    ...req.headers,
    host: `${targetHost}:${targetPort}`,
    "x-forwarded-for": req.socket.remoteAddress,
    "x-forwarded-host": req.headers.host,
    "x-forwarded-proto": "https",
    "x-forwarded-prefix": options.publicPrefix || "",
  };

  const canReplayRequest = req.method === "GET" || req.method === "HEAD";
  const proxyOnce = (path, retryOn404) => {
    const pr = http.request({ hostname: targetHost, port: targetPort, path, method: req.method, headers }, (pres) => {
      if (canReplayRequest && retryOn404 && pres.statusCode === 404 && options.stripPrefix) {
        pres.resume();
        return proxyOnce(proxiedPath(url, { stripPrefix: options.stripPrefix }), false);
      }
      res.writeHead(pres.statusCode, rewriteProxyHeaders(pres.headers, { ...options, targetHost, targetPort }));
      pres.pipe(res);
      pres.on("error", () => res.end());
    });
    req.on("error", () => pr.destroy());
    res.on("error", () => pr.destroy());
    pr.on("error", () => sendServiceUnavailable(res));
    req.pipe(pr);
  };

  // First try the public path as-is because OpenClaw and JupyterLab are both
  // configured with base paths. If a backend still returns 404, retry with the
  // mount prefix stripped; that covers images built before the base-path config
  // took effect and avoids the common HF Spaces "404 at /app or /terminal" trap.
  proxyOnce(url.pathname + url.search, !!options.retryWithoutPrefixOn404);
}

// ── HTTP server ──
const server = http.createServer(async (req, res) => {
  const { pathname } = parseRequestUrl(req.url);

  if (pathname === "/health") {
    const gatewayReady = await probePort(GATEWAY_HOST, GATEWAY_PORT, "/health");
    res.writeHead(gatewayReady ? 200 : 503, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: gatewayReady ? "ok" : "degraded", gatewayReady, uptime: formatUptime(Date.now() - startTime), sync: getSyncStatus(), keepalive: getKeepaliveStatus() }));
  }

  if (pathname === "/status") {
    const [gatewayReady, jupyterReady] = await Promise.all([
      probePort(GATEWAY_HOST, GATEWAY_PORT, "/health"),
      JUPYTER_ENABLED ? probePort(JUPYTER_HOST, JUPYTER_PORT, `${JUPYTER_BASE}/api`) : Promise.resolve(false),
    ]);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ model: LLM_MODEL, uptime: formatUptime(Date.now() - startTime), gatewayReady, jupyterReady, sync: getSyncStatus(), whatsapp: readGuardianStatus(), keepalive: getKeepaliveStatus() }));
  }

  if (pathname === "/env-builder" || pathname === "/env-builder/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(renderEnvBuilder());
  }

  if (pathname === "/" || pathname === "/dashboard") {
    const [gatewayReady, jupyterReady] = await Promise.all([
      probePort(GATEWAY_HOST, GATEWAY_PORT, "/health"),
      JUPYTER_ENABLED ? probePort(JUPYTER_HOST, JUPYTER_PORT, `${JUPYTER_BASE}/api`) : Promise.resolve(false),
    ]);
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(renderDashboard({ uptimeHuman: formatUptime(Date.now() - startTime), gatewayReady, jupyterReady, sync: getSyncStatus(), whatsapp: readGuardianStatus(), keepalive: getKeepaliveStatus() }));
  }

  // JupyterLab terminal
  if (pathname === JUPYTER_BASE || pathname.startsWith(JUPYTER_BASE + "/")) {
    if (!JUPYTER_ENABLED) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "disabled", message: "JupyterLab terminal is disabled. Set DEV_MODE=true to enable /terminal/." }));
    }
    return proxyHTTP(req, res, JUPYTER_HOST, JUPYTER_PORT, {
      publicPrefix: JUPYTER_BASE,
      // Jupyter is started with --ServerApp.base_url=/terminal/, so keep the
      // /terminal prefix when proxying. Stripping it breaks static/theme URLs.
      stripPrefix: "",
      retryWithoutPrefixOn404: false,
    });
  }

  // OpenClaw Control UI mounted under /app. Retry without the mount prefix on
  // 404 so deployments keep working across OpenClaw basePath behavior changes.
  if (pathname === APP_BASE || pathname.startsWith(APP_BASE + "/")) {
    return proxyHTTP(req, res, GATEWAY_HOST, GATEWAY_PORT, {
      publicPrefix: APP_BASE,
      stripPrefix: APP_BASE,
      retryWithoutPrefixOn404: true,
    });
  }

  // OpenClaw gateway API/static fallback (everything else)
  proxyHTTP(req, res, GATEWAY_HOST, GATEWAY_PORT);
});

// ── WebSocket upgrade (JupyterLab kernels + terminals need this) ──
server.on("upgrade", (req, socket, head) => {
  const { pathname, search } = parseRequestUrl(req.url);
  const isJupyter = JUPYTER_ENABLED && (pathname === JUPYTER_BASE || pathname.startsWith(JUPYTER_BASE + "/"));
  const isApp = pathname === APP_BASE || pathname.startsWith(APP_BASE + "/");
  const [targetHost, targetPort] = isJupyter ? [JUPYTER_HOST, JUPYTER_PORT] : [GATEWAY_HOST, GATEWAY_PORT];
  const publicPrefix = isJupyter ? JUPYTER_BASE : isApp ? APP_BASE : "";
  const targetPath = pathname + search;

  const ps = net.connect(targetPort, targetHost, () => {
    ps.write(`${req.method} ${targetPath} HTTP/${req.httpVersion}\r\n`);
    ps.write(`Host: ${targetHost}:${targetPort}\r\n`);
    ps.write(`X-Forwarded-For: ${req.socket.remoteAddress || ""}\r\n`);
    ps.write(`X-Forwarded-Host: ${req.headers.host || ""}\r\n`);
    ps.write("X-Forwarded-Proto: https\r\n");
    if (publicPrefix) ps.write(`X-Forwarded-Prefix: ${publicPrefix}\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const header = req.rawHeaders[i];
      const lower = header.toLowerCase();
      if (["host", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-prefix"].includes(lower)) continue;
      ps.write(`${header}: ${req.rawHeaders[i + 1]}\r\n`);
    }
    ps.write("\r\n");
    if (head && head.length) ps.write(head);
    ps.pipe(socket).pipe(ps);
  });
  ps.on("error", () => socket.destroy());
});

server.timeout = 0;
server.keepAliveTimeout = 65000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🦞 HuggingClaw :${PORT} → Gateway :${GATEWAY_PORT}${JUPYTER_ENABLED ? ` | Terminal :${JUPYTER_PORT} at ${JUPYTER_BASE}/` : " | Terminal disabled"}`),
);

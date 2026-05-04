// Single public entrypoint for HF Spaces: local dashboard + reverse proxy to OpenClaw.
const http = require("http");
const fs = require("fs");
const net = require("net");

const PORT = 7861;
const GATEWAY_PORT = 7860;
const GATEWAY_HOST = "127.0.0.1";
const startTime = Date.now();
const LLM_MODEL = process.env.LLM_MODEL || "Not Set";
const TELEGRAM_ENABLED = !!process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_ENABLED = /^true$/i.test(process.env.WHATSAPP_ENABLED || "");
const WHATSAPP_STATUS_FILE = "/tmp/huggingclaw-wa-status.json";
const HF_BACKUP_ENABLED = !!process.env.HF_TOKEN;
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || "180";
const APP_BASE = "/app";
const SYNC_STATUS_FILE = "/tmp/sync-status.json";
const CLOUDFLARE_KEEPALIVE_STATUS_FILE =
  "/tmp/huggingclaw-cloudflare-keepalive-status.json";

function parseRequestUrl(url) {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}

function getSyncStatus() {
  try {
    if (fs.existsSync(SYNC_STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(SYNC_STATUS_FILE, "utf8"));
    }
  } catch {}
  if (HF_BACKUP_ENABLED) {
    return {
      status: "configured",
      message: `Backup is enabled. Waiting for sync window (${SYNC_INTERVAL}s).`,
    };
  }
  return { status: "unknown", message: "No sync data yet" };
}

function readGuardianStatus() {
  if (!WHATSAPP_ENABLED) {
    return { configured: false, connected: false, pairing: false };
  }
  try {
    if (fs.existsSync(WHATSAPP_STATUS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(WHATSAPP_STATUS_FILE, "utf8"));
      return {
        configured: parsed.configured !== false,
        connected: parsed.connected === true,
        pairing: parsed.pairing === true,
      };
    }
  } catch {}
  return { configured: true, connected: false, pairing: false };
}

function getKeepaliveStatus() {
  try {
    if (fs.existsSync(CLOUDFLARE_KEEPALIVE_STATUS_FILE)) {
      return JSON.parse(
        fs.readFileSync(CLOUDFLARE_KEEPALIVE_STATUS_FILE, "utf8"),
      );
    }
  } catch {}
  return null;
}

function probeGatewayHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: "/health",
        timeout: timeoutMs,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 400);
      },
    );
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

function formatUptime(ms) {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toneBadge(label, tone = "neutral") {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function renderTile({
  title,
  value,
  detail = "",
  tone = "neutral",
  meta = "",
}) {
  return `<article class="tile ${tone}">
    <div class="tile-head">
      <span class="tile-title">${escapeHtml(title)}</span>
      <span class="tile-dot"></span>
    </div>
    <div class="tile-value">${value}</div>
    ${detail ? `<div class="tile-detail">${detail}</div>` : ""}
    ${meta ? `<div class="tile-meta">${meta}</div>` : ""}
  </article>`;
}

function renderDashboard(data) {
  const syncStatus = String(data.sync?.status || "unknown");
  const syncTone = ["success", "restored", "synced", "configured"].includes(
    syncStatus,
  )
    ? "ok"
    : syncStatus === "disabled"
      ? "warn"
      : "neutral";
  const backupDetail = data.sync?.message
    ? escapeHtml(data.sync.message)
    : "No status yet";

  const keepaliveConfigured = data.keepalive?.configured === true;
  const keepaliveStatus = String(
    data.keepalive?.status ||
      (process.env.CLOUDFLARE_WORKERS_TOKEN ? "pending" : "not configured"),
  );
  const keepAliveTone = keepaliveConfigured
    ? "ok"
    : process.env.CLOUDFLARE_WORKERS_TOKEN
      ? "warn"
      : "neutral";
  const keepAliveDetail = keepaliveConfigured
    ? `Pinging <code>${escapeHtml(data.keepalive.targetUrl || "/health")}</code>`
    : process.env.CLOUDFLARE_WORKERS_TOKEN
      ? "Worker pending or failed"
      : "Not configured";

  const tiles = [
    renderTile({
      title: "Gateway",
      value: toneBadge(
        data.gatewayReady ? "Online" : "Offline",
        data.gatewayReady ? "ok" : "off",
      ),
      detail: `Internal Port ${GATEWAY_PORT}`,
      tone: data.gatewayReady ? "ok" : "off",
    }),
    renderTile({
      title: "Model",
      value: `<code>${escapeHtml(LLM_MODEL)}</code>`,
      detail: `Primary LLM Configured`,
      tone: "neutral",
    }),
    renderTile({
      title: "Runtime",
      value: escapeHtml(data.uptimeHuman),
      detail: `Public Port ${PORT}`,
      tone: "neutral",
    }),
    renderTile({
      title: "Telegram",
      value: toneBadge(
        TELEGRAM_ENABLED ? "Enabled" : "Disabled",
        TELEGRAM_ENABLED ? "ok" : "neutral",
      ),
      detail: TELEGRAM_ENABLED ? "Bot Channel active" : "Not configured",
      tone: TELEGRAM_ENABLED ? "ok" : "neutral",
    }),
    renderTile({
      title: "Backup",
      value: toneBadge(syncStatus.toUpperCase(), syncTone),
      detail: backupDetail,
      tone: syncTone,
      meta: data.sync?.timestamp
        ? `<span class="local-time" data-iso="${data.sync.timestamp}"></span>`
        : "",
    }),
    renderTile({
      title: "Keep Awake",
      value: toneBadge(
        keepaliveConfigured ? "CF Cron" : keepaliveStatus.toUpperCase(),
        keepAliveTone,
      ),
      detail: keepAliveDetail,
      tone: keepAliveTone,
    }),
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HuggingClaw</title>
  <style>
    :root { color-scheme: dark; --bg:#08080f; --panel:#12111b; --line:#26243a; --text:#f6f4ff; --muted:#7f7a9e; --soft:#b8b3d7; --good:#22c55e; --warn:#f5c542; --bad:#fb7185;  }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); font-size:13px; }
    main { width:min(720px, calc(100% - 32px)); margin:0 auto; padding:36px 0 44px; }
    header { text-align:center; margin-bottom:22px; }
    h1 { margin:0; font-size:1.65rem; line-height:1; letter-spacing:0; }
    .subtitle { margin-top:12px; color:var(--muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.14em; font-weight:800; }
    .hero-action { display:flex; width:100%; min-height:46px; align-items:center; justify-content:center; border-radius:8px; background:#fff; color:#000; text-decoration:none; font-weight:850; font-size:.98rem; margin:24px 0 20px; transition: opacity 0.15s ease; }
    .hero-action:hover { opacity: 0.9; }
    .overview { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; margin-bottom:10px; }
    .tile { border:1px solid var(--line); background:var(--panel); border-radius:11px; padding:18px; min-height:124px; display:flex; flex-direction:column; gap:10px; position:relative; }
    .tile.ok { border-color:rgba(34,197,94,.22); }
    .tile.warn { border-color:rgba(245,197,66,.24); }
    .tile.off { border-color:rgba(251,113,133,.28); }
    .tile-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .tile-title { color:var(--muted); font-size:.67rem; letter-spacing:.18em; text-transform:uppercase; font-weight:850; }
    .tile-dot { width:7px; height:7px; border-radius:50%; background:var(--line); }
    .tile.ok .tile-dot { background:var(--good); }
    .tile.warn .tile-dot { background:var(--warn); }
    .tile.off .tile-dot { background:var(--bad); }
    .tile-value { font-size:1.12rem; font-weight:850; overflow-wrap:anywhere; }
    .tile-detail { color:var(--soft); line-height:1.45; font-size:.83rem; }
    .tile-meta { color:var(--muted); line-height:1.4; font-size:.75rem; margin-top:auto; overflow-wrap:anywhere; }

    code { background:#232234; border:1px solid #34324c; border-radius:6px; padding:2px 6px; color:var(--text); font-size:.9em; }
    .badge { display:inline-flex; align-items:center; width:max-content; border:1px solid var(--line); border-radius:999px; padding:5px 10px; font-size:.72rem; font-weight:850; line-height:1; text-transform:uppercase; }
    .badge.ok { color:var(--good); border-color:rgba(34,197,94,.34); background:rgba(34,197,94,.11); }
    .badge.warn { color:var(--warn); border-color:rgba(245,197,66,.34); background:rgba(245,197,66,.11); }
    .badge.off { color:var(--bad); border-color:rgba(251,113,133,.34); background:rgba(251,113,133,.11); }
    .badge.neutral { color:var(--soft); }
    footer { color:var(--muted); text-align:center; font-size:.74rem; margin-top:18px; }
    footer .live { color:var(--good); }
    @media (max-width: 700px) { .overview { grid-template-columns:1fr; } main { width:min(100% - 22px, 720px); padding-top:28px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>🦞 HuggingClaw</h1>
      <div class="subtitle">OpenClaw Gateway Dashboard</div>
    </header>
    <a class="hero-action" href="${APP_BASE}/" target="_blank" rel="noopener noreferrer">Open Control UI -></a>
    <section class="overview">
      ${tiles}
    </section>
    <footer><span class="live">Live</span> status - Health endpoint: <code>/health</code></footer>
  </main>
  <script>
    document.querySelectorAll('.local-time').forEach(el => {
      const date = new Date(el.getAttribute('data-iso'));
      if (!isNaN(date)) {
        el.textContent = 'At ' + date.toLocaleTimeString();
      }
    });
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = parseRequestUrl(req.url);
  const pathname = url.pathname;

  // 1. Dashboard Routes
  if (pathname === "/health") {
    const gatewayReady = await probeGatewayHealth();
    res.writeHead(gatewayReady ? 200 : 503, {
      "Content-Type": "application/json",
    });
    return res.end(
      JSON.stringify({
        status: gatewayReady ? "ok" : "degraded",
        gatewayReady,
        uptime: formatUptime(Date.now() - startTime),
        sync: getSyncStatus(),
        keepalive: getKeepaliveStatus(),
      }),
    );
  }

  if (pathname === "/status") {
    const gatewayReady = await probeGatewayHealth();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        model: LLM_MODEL,
        uptime: formatUptime(Date.now() - startTime),
        gatewayReady,
        sync: getSyncStatus(),
        whatsapp: readGuardianStatus(),
        keepalive: getKeepaliveStatus(),
      }),
    );
  }

  if (pathname === "/" || pathname === "/dashboard") {
    const gatewayReady = await probeGatewayHealth();
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(
      renderDashboard({
        uptimeHuman: formatUptime(Date.now() - startTime),
        gatewayReady,
        sync: getSyncStatus(),
        whatsapp: readGuardianStatus(),
        keepalive: getKeepaliveStatus(),
      }),
    );
  }

  // 2. OpenClaw Proxy Logic
  const proxyHeaders = {
    ...req.headers,
    host: `${GATEWAY_HOST}:${GATEWAY_PORT}`,
    "x-forwarded-for": req.socket.remoteAddress,
    "x-forwarded-host": req.headers.host,
    "x-forwarded-proto": "https",
  };

  const proxyReq = http.request(
    {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path: pathname + url.search,
      method: req.method,
      headers: proxyHeaders,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on("error", (err) => {
        console.error("proxyRes error:", err);
        res.end();
      });
    },
  );

  req.on("error", (err) => {
    console.error("req error:", err);
    proxyReq.destroy();
  });

  res.on("error", (err) => {
    console.error("res error:", err);
    proxyReq.destroy();
  });

  proxyReq.on("error", (err) => {
    console.error("proxyReq error:", err);
    if (!res.headersSent) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "starting",
          message: "Gateway is initializing... or connection failed",
        }),
      );
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const url = parseRequestUrl(req.url);
  const proxyPath = url.pathname;
  const proxySocket = net.connect(GATEWAY_PORT, GATEWAY_HOST, () => {
    proxySocket.write(
      `${req.method} ${proxyPath}${url.search} HTTP/${req.httpVersion}\r\n`,
    );
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      proxySocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
    }
    proxySocket.write("\r\n");
    if (head && head.length) proxySocket.write(head);
    proxySocket.pipe(socket).pipe(proxySocket);
  });
  proxySocket.on("error", () => socket.destroy());
});

server.timeout = 0;
server.keepAliveTimeout = 65000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(
    `🦞 HuggingClaw Dashboard on ${PORT} -> Gateway on ${GATEWAY_PORT}`,
  ),
);

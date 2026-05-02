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
const DASHBOARD_BASE = "/dashboard";
const DASHBOARD_STATUS_PATH = `${DASHBOARD_BASE}/status`;
const DASHBOARD_HEALTH_PATH = `${DASHBOARD_BASE}/health`;
const DASHBOARD_APP_BASE = `${DASHBOARD_BASE}/app`;
const APP_BASE = "/app";
const UPTIMEROBOT_STATUS_FILE = "/tmp/huggingclaw-uptimerobot-status.json";
const UPTIMEROBOT_API_KEY_SET = !!process.env.UPTIMEROBOT_API_KEY;

function parseRequestUrl(url) {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}

function isDashboardRoute(pathname) {
  return (
    pathname === "/" ||
    pathname === DASHBOARD_BASE ||
    pathname === `${DASHBOARD_BASE}/`
  );
}

function isDashboardAppRoute(pathname) {
  return (
    pathname === DASHBOARD_APP_BASE ||
    pathname.startsWith(`${DASHBOARD_APP_BASE}/`)
  );
}

function isAppRoute(pathname) {
  return pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`);
}

function isLocalRoute(pathname) {
  return (
    pathname === "/health" ||
    pathname === "/status" ||
    pathname === DASHBOARD_HEALTH_PATH ||
    pathname === DASHBOARD_STATUS_PATH
  );
}

function mapAppProxyPath(path) {
  if (path === DASHBOARD_APP_BASE) return APP_BASE;
  if (path.startsWith(`${DASHBOARD_APP_BASE}/`)) {
    return `${APP_BASE}${path.slice(DASHBOARD_APP_BASE.length)}`;
  }
  if (path === APP_BASE || path.startsWith(`${APP_BASE}/`)) {
    return path;
  }
  return path;
}

function sanitizeAppProxySearch(parsedUrl) {
  const filtered = new URLSearchParams(parsedUrl.searchParams);
  // HF Space UI sometimes appends its own control params to deep links.
  filtered.delete("logs");
  const query = filtered.toString();
  return query ? `?${query}` : "";
}

function appendForwarded(existingValue, nextValue) {
  const cleanNext = nextValue || "";
  if (!existingValue) return cleanNext;
  if (Array.isArray(existingValue))
    return `${existingValue.join(", ")}, ${cleanNext}`;
  return `${existingValue}, ${cleanNext}`;
}

function getForwardedClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0]).split(",")[0].trim();
  }
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function buildProxyHeaders(headers, remoteAddress) {
  return {
    ...headers,
    host: `${GATEWAY_HOST}:${GATEWAY_PORT}`,
    "x-forwarded-for": remoteAddress || "",
    "x-forwarded-host": headers.host || "",
    "x-forwarded-proto": headers["x-forwarded-proto"] || "https",
  };
}

function getRequesterIp(req) {
  return (
    getForwardedClientIp(req) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function readSyncStatus() {
  try {
    if (fs.existsSync("/tmp/sync-status.json")) {
      return JSON.parse(fs.readFileSync("/tmp/sync-status.json", "utf8"));
    }
  } catch {}
  if (HF_BACKUP_ENABLED) {
    return {
      status: "configured",
      message: `Backup is enabled. Waiting for the next sync window (${SYNC_INTERVAL}s).`,
    };
  }
  return { status: "unknown", message: "No sync data yet" };
}

function normalizeChannelStatus(channel, configured) {
  return {
    configured: configured || !!channel,
    connected: !!(channel && channel.connected),
  };
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

function getUptimeRobotStatus() {
  try {
    if (fs.existsSync(UPTIMEROBOT_STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(UPTIMEROBOT_STATUS_FILE, "utf8"));
    }
  } catch {}
  return null;
}

function renderChannelBadge(channel, configuredLabel) {
  if (channel && channel.connected) {
    return '<div class="status-badge status-online"><div class="pulse"></div>Active</div>';
  }
  if (channel && channel.configured) {
    return `<div class="status-badge status-syncing">${configuredLabel}</div>`;
  }
  return '<div class="status-badge status-offline">Disabled</div>';
}

function renderSyncBadge(syncData) {
  let badgeClass = "status-offline";
  let pulseHtml = "";

  if (syncData.status === "success" || syncData.status === "configured") {
    badgeClass = "status-online";
    pulseHtml = '<div class="pulse"></div>';
  } else if (syncData.status === "syncing") {
    badgeClass = "status-syncing";
    pulseHtml = '<div class="pulse" style="background:#3b82f6"></div>';
  }

  return `<div class="status-badge ${badgeClass}">${pulseHtml}${String(syncData.status || "unknown").toUpperCase()}</div>`;
}

function renderDashboard(initialData) {
  const controlUiHref = `${APP_BASE}/`;
  const urStatus = initialData.uptimerobotStatus;
  let keepAwakeHtml;
  if (urStatus?.configured) {
    keepAwakeHtml = `
            <div class="helper-summary success">
                <div class="status-badge status-online"><div class="pulse"></div>CONFIGURED</div>
                <span>UptimeRobot monitor active for <code>${urStatus.url || "your /health endpoint"}</code>.</span>
            </div>`;
  } else if (urStatus?.configured === false) {
    keepAwakeHtml = `
            <div class="helper-summary" style="background:rgba(239,68,68,0.08);">
                <div class="status-badge status-offline">FAILED</div>
                <span>Monitor setup failed. Check Space logs for details.</span>
            </div>`;
  } else if (UPTIMEROBOT_API_KEY_SET) {
    keepAwakeHtml = `
            <div class="helper-summary">
                <div class="status-badge status-syncing">SETTING UP&hellip;</div>
                <span>UptimeRobot monitor is being configured.</span>
            </div>`;
  } else {
    keepAwakeHtml = `
            <div class="helper-summary">
                <strong>Not configured.</strong> Add <code>UPTIMEROBOT_API_KEY</code> to Space secrets to enable keep-awake monitoring.
            </div>`;
  }
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HuggingClaw Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --accent: linear-gradient(135deg, #3b82f6, #8b5cf6);
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 24px 0;
            background-image:
                radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
        }

        .dashboard {
            width: 90%;
            max-width: 600px;
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.8s ease-out;
            margin: 24px 0;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        header {
            text-align: center;
            margin-bottom: 40px;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 8px;
            background: var(--accent);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 600;
        }

        .subtitle {
            color: var(--text-dim);
            font-size: 0.9rem;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 16px;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            border-color: rgba(59, 130, 246, 0.3);
        }

        .stat-label {
            color: var(--text-dim);
            font-size: 0.75rem;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: block;
        }

        .stat-value {
            font-size: 1.1rem;
            font-weight: 600;
            word-break: break-all;
        }

        .stat-btn {
            grid-column: span 2;
            background: var(--accent);
            color: #fff;
            padding: 16px;
            border-radius: 16px;
            text-align: center;
            text-decoration: none;
            font-weight: 600;
            margin-top: 10px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
        }

        .stat-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.6);
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .status-online { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .status-offline { background: rgba(239, 68, 68, 0.1); color: var(--error); }
        .status-syncing { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

        .pulse {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .footer {
            text-align: center;
            color: var(--text-dim);
            font-size: 0.8rem;
            margin-top: 20px;
        }

        .sync-info {
            background: rgba(255, 255, 255, 0.02);
            padding: 15px;
            border-radius: 12px;
            font-size: 0.85rem;
            color: var(--text-dim);
            margin-top: 10px;
        }

        #sync-msg { color: var(--text); display: block; margin-top: 4px; }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
        }

        .card-header .stat-label {
            margin-bottom: 0;
        }

        .helper-card {
            width: 100%;
            margin-top: 20px;
        }

        .helper-copy {
            color: var(--text-dim);
            font-size: 0.92rem;
            line-height: 1.6;
            margin-top: 10px;
        }

        .helper-copy strong {
            color: var(--text);
        }

        .helper-row {
            display: flex;
            gap: 10px;
            margin-top: 16px;
            flex-wrap: wrap;
        }

        .helper-input {
            flex: 1;
            min-width: 240px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text);
            border-radius: 12px;
            padding: 14px 16px;
            font: inherit;
        }

        .helper-input::placeholder {
            color: var(--text-dim);
        }

        .helper-button {
            background: var(--accent);
            color: #fff;
            border: 0;
            border-radius: 12px;
            padding: 14px 18px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
            min-width: 180px;
        }

        .helper-button:disabled {
            opacity: 0.6;
            cursor: wait;
        }

        .hidden {
            display: none !important;
        }

        .helper-note {
            margin-top: 10px;
            font-size: 0.82rem;
            color: var(--text-dim);
        }

        .helper-result {
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 0.9rem;
            display: none;
        }

        .helper-result.ok {
            display: block;
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
        }

        .helper-result.error {
            display: block;
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
        }

        .helper-shell {
            margin-top: 12px;
        }

        .helper-shell.hidden {
            display: none;
        }

        .helper-summary {
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-dim);
            font-size: 0.9rem;
            line-height: 1.5;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .helper-summary strong { color: var(--text); }
        .helper-summary code {
            background: rgba(255,255,255,0.06);
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 0.82rem;
            color: var(--text);
        }
        .helper-summary.success { background: rgba(16, 185, 129, 0.08); }

        @media (max-width: 700px) {
            body {
                padding: 16px 0;
            }

            .dashboard {
                width: calc(100% - 24px);
                padding: 24px;
                border-radius: 18px;
                margin: 12px 0;
            }

            header {
                margin-bottom: 28px;
            }

            h1 {
                font-size: 2rem;
            }

            .stats-grid {
                grid-template-columns: 1fr;
                gap: 14px;
                margin-bottom: 20px;
            }

            .stat-btn {
                grid-column: span 1;
            }

            .stat-card {
                padding: 16px;
            }

            .card-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .helper-row {
                flex-direction: column;
            }

            .helper-input,
            .helper-button {
                width: 100%;
                min-width: 0;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <header>
            <h1>🦞 HuggingClaw</h1>
            <p class="subtitle">Space Dashboard</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-label">Model</span>
                <span class="stat-value" id="model-id">${initialData.model}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Uptime</span>
                <span class="stat-value" id="uptime">${initialData.uptime}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">WhatsApp</span>
                <span id="wa-status">${renderChannelBadge(initialData.whatsapp, "Ready to pair")}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Telegram</span>
                <span id="tg-status">${renderChannelBadge(initialData.telegram, "Configured")}</span>
            </div>
            <a href="${controlUiHref}" id="control-ui-link" class="stat-btn" target="_blank" rel="noopener noreferrer">Open Control UI</a>
        </div>

        <div class="stat-card" style="width: 100%;">
            <div class="card-header">
                <span class="stat-label">Workspace Sync Status</span>
                <div id="sync-badge-container">${renderSyncBadge(initialData.sync)}</div>
            </div>
            <div class="sync-info">
                Last Sync Activity: <span id="sync-time">${initialData.sync.timestamp || "Never"}</span>
                <span id="sync-msg">${initialData.sync.message || "Waiting for first sync..."}</span>
            </div>
        </div>

        <div class="stat-card helper-card">
            <span class="stat-label">Keep Space Awake</span>
            ${keepAwakeHtml}
        </div>

        <div class="footer">
            Live updates every 10s
        </div>
    </div>

    <script>
        function getDashboardBase() {
            const pathname = window.location.pathname || '/';
            if (pathname === '/' || pathname === '') return '';
            if (pathname === '${DASHBOARD_BASE}' || pathname === '${DASHBOARD_BASE}/') return '${DASHBOARD_BASE}';
            return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
        }

        function getCurrentSearch() {
            return window.location.search || '';
        }

        async function updateStats() {
            try {
                const res = await fetch(getDashboardBase() + '/status' + getCurrentSearch());
                const data = await res.json();

                document.getElementById('model-id').textContent = data.model;
                document.getElementById('uptime').textContent = data.uptime;

                function renderChannelStatus(channel, configuredLabel) {
                    if (channel && channel.connected) {
                        return '<div class="status-badge status-online"><div class="pulse"></div>Active</div>';
                    }
                    if (channel && channel.configured) {
                        return '<div class="status-badge status-syncing">' + configuredLabel + '</div>';
                    }
                    return '<div class="status-badge status-offline">Disabled</div>';
                }

                document.getElementById('wa-status').innerHTML = renderChannelStatus(data.whatsapp, 'Ready to pair');
                document.getElementById('tg-status').innerHTML = renderChannelStatus(data.telegram, 'Configured');

                const syncData = data.sync;
                let badgeClass = 'status-offline';
                let pulseHtml = '';

                if (syncData.status === 'success' || syncData.status === 'configured') {
                    badgeClass = 'status-online';
                    pulseHtml = '<div class="pulse"></div>';
                } else if (syncData.status === 'syncing') {
                    badgeClass = 'status-syncing';
                    pulseHtml = '<div class="pulse" style="background:#3b82f6"></div>';
                }

                document.getElementById('sync-badge-container').innerHTML =
                    '<div class="status-badge ' + badgeClass + '">' + pulseHtml + syncData.status.toUpperCase() + '</div>';

                document.getElementById('sync-time').textContent = syncData.timestamp || 'Never';
                document.getElementById('sync-msg').textContent = syncData.message || 'Waiting for first sync...';
            } catch (e) {
                console.error("Failed to fetch status", e);
            }
        }

        updateStats();
        setInterval(updateStats, 10000);
        document.getElementById('control-ui-link').setAttribute('href', getDashboardBase() + '/app/' + getCurrentSearch());
    </script>
</body>
</html>
  `;
}


function proxyHttp(req, res, proxyPath = req.url, proxyPort = GATEWAY_PORT) {
  const clientIp = getForwardedClientIp(req);
  let upstreamStarted = false;
  const proxyReq = http.request(
    {
      hostname: GATEWAY_HOST,
      port: proxyPort,
      method: req.method,
      path: proxyPath,
      headers: buildProxyHeaders(req.headers, clientIp),
    },
    (proxyRes) => {
      upstreamStarted = true;
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    if (res.headersSent || upstreamStarted) {
      res.destroy();
      return;
    }

    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "error",
        message: "Gateway unavailable",
        detail: error.message,
      }),
    );
  });

  res.on("close", () => {
    proxyReq.destroy();
  });

  req.pipe(proxyReq);
}

function serializeUpgradeHeaders(req, clientIp, proxyPort) {
  const forwardedHeaders = [];

  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i];
    const value = req.rawHeaders[i + 1];
    const lower = name.toLowerCase();

    if (
      lower === "host" ||
      lower === "x-forwarded-for" ||
      lower === "x-forwarded-host" ||
      lower === "x-forwarded-proto"
    ) {
      continue;
    }

    forwardedHeaders.push(`${name}: ${value}`);
  }

  forwardedHeaders.push(
    `Host: ${GATEWAY_HOST}:${proxyPort}`,
  );
  forwardedHeaders.push(
    `X-Forwarded-For: ${clientIp || ""}`,
  );
  forwardedHeaders.push(
    `X-Forwarded-Host: ${req.headers.host || ""}`,
  );
  forwardedHeaders.push(
    `X-Forwarded-Proto: ${req.headers["x-forwarded-proto"] || "https"}`,
  );

  return forwardedHeaders;
}

function proxyUpgrade(
  req,
  socket,
  head,
  proxyPath = req.url,
  proxyPort = GATEWAY_PORT,
) {
  const proxySocket = net.connect(proxyPort, GATEWAY_HOST);
  const clientIp = getForwardedClientIp(req);

  proxySocket.on("connect", () => {
    const requestLines = [
      `${req.method} ${proxyPath} HTTP/${req.httpVersion}`,
      ...serializeUpgradeHeaders(req, clientIp, proxyPort),
      "",
      "",
    ];

    proxySocket.write(requestLines.join("\r\n"));

    if (head && head.length > 0) {
      proxySocket.write(head);
    }

    socket.pipe(proxySocket).pipe(socket);
  });

  proxySocket.on("error", () => {
    if (socket.writable) {
      socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    }
    socket.destroy();
  });

  socket.on("error", () => {
    proxySocket.destroy();
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = parseRequestUrl(req.url || "/");
  const pathname = parsedUrl.pathname;
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const uptimeHuman = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  if (pathname === "/health" || pathname === DASHBOARD_HEALTH_PATH) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        uptime,
        uptimeHuman,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  if (pathname === "/status" || pathname === DASHBOARD_STATUS_PATH) {
    void (async () => {
      const guardianStatus = readGuardianStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: LLM_MODEL,
          whatsapp: {
            configured: guardianStatus.configured,
            connected: guardianStatus.connected,
            pairing: guardianStatus.pairing,
          },
          telegram: normalizeChannelStatus(null, TELEGRAM_ENABLED),
          sync: readSyncStatus(),
          uptime: uptimeHuman,
        }),
      );
    })();
    return;
  }

  if (isDashboardRoute(pathname)) {
    const guardianStatus = readGuardianStatus();
    const initialData = {
      model: LLM_MODEL,
      whatsapp: {
        configured: guardianStatus.configured,
        connected: guardianStatus.connected,
        pairing: guardianStatus.pairing,
      },
      telegram: normalizeChannelStatus(null, TELEGRAM_ENABLED),
      sync: readSyncStatus(),
      uptime: uptimeHuman,
      uptimerobotStatus: getUptimeRobotStatus(),
    };
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderDashboard(initialData));
    return;
  }

  if (isDashboardAppRoute(pathname) || isAppRoute(pathname)) {
    const proxyPath = mapAppProxyPath(pathname) + sanitizeAppProxySearch(parsedUrl);
    proxyHttp(req, res, proxyPath, GATEWAY_PORT);
    return;
  }

  proxyHttp(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const pathname = parseRequestUrl(req.url || "/").pathname;
  if (isLocalRoute(pathname)) {
    socket.destroy();
    return;
  }

  if (isDashboardAppRoute(pathname) || isAppRoute(pathname)) {
    const parsedUrl = parseRequestUrl(req.url || "/");
    const proxyPath = mapAppProxyPath(pathname) + sanitizeAppProxySearch(parsedUrl);
    proxyUpgrade(req, socket, head, proxyPath, GATEWAY_PORT);
    return;
  }

  proxyUpgrade(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Health server listening on port ${PORT}; proxying gateway traffic to ${GATEWAY_HOST}:${GATEWAY_PORT}`,
  );
});

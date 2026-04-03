// Single public entrypoint for HF Spaces: local dashboard + reverse proxy to OpenClaw.
const http = require("http");
const https = require("https");
const fs = require("fs");
const net = require("net");

const PORT = 7861;
const GATEWAY_PORT = 7860;
const GATEWAY_HOST = "127.0.0.1";
const startTime = Date.now();
const LLM_MODEL = process.env.LLM_MODEL || "Not Set";
const SPACE_HOST = process.env.SPACE_HOST || "";
const TELEGRAM_ENABLED = !!process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_ENABLED = /^true$/i.test(process.env.WHATSAPP_ENABLED || "");
const WHATSAPP_STATUS_FILE = "/tmp/huggingclaw-wa-status.json";
const HF_BACKUP_ENABLED = !!(process.env.HF_USERNAME && process.env.HF_TOKEN);
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || "600";
const DASHBOARD_BASE = "/dashboard";
const DASHBOARD_STATUS_PATH = `${DASHBOARD_BASE}/status`;
const DASHBOARD_HEALTH_PATH = `${DASHBOARD_BASE}/health`;
const DASHBOARD_UPTIMEROBOT_PATH = `${DASHBOARD_BASE}/uptimerobot/setup`;
const DASHBOARD_APP_BASE = `${DASHBOARD_BASE}/app`;
const APP_BASE = "/app";

function parseRequestUrl(url) {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}

function isDashboardRoute(pathname) {
  return pathname === "/" || pathname === DASHBOARD_BASE || pathname === `${DASHBOARD_BASE}/`;
}

function isDashboardScopedPath(pathname, suffix) {
  return pathname === `${DASHBOARD_BASE}/${suffix}`;
}

function isDashboardAppRoute(pathname) {
  return pathname === DASHBOARD_APP_BASE || pathname.startsWith(`${DASHBOARD_APP_BASE}/`);
}

function isAppRoute(pathname) {
  return pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`);
}

function isLocalRoute(pathname) {
  return (
    pathname === "/health" ||
    pathname === "/status" ||
    pathname === "/uptimerobot/setup" ||
    pathname === DASHBOARD_HEALTH_PATH ||
    pathname === DASHBOARD_STATUS_PATH ||
    pathname === DASHBOARD_UPTIMEROBOT_PATH ||
    isDashboardRoute(pathname)
  );
}

function stripDashboardAppPrefix(path) {
  if (path === DASHBOARD_APP_BASE) return "/";
  if (path.startsWith(`${DASHBOARD_APP_BASE}/`)) {
    return path.slice(DASHBOARD_APP_BASE.length) || "/";
  }
  if (path === APP_BASE) return "/";
  if (path.startsWith(`${APP_BASE}/`)) {
    return path.slice(APP_BASE.length) || "/";
  }
  return path;
}

function appendForwarded(existingValue, nextValue) {
  const cleanNext = nextValue || "";
  if (!existingValue) return cleanNext;
  if (Array.isArray(existingValue))
    return `${existingValue.join(", ")}, ${cleanNext}`;
  return `${existingValue}, ${cleanNext}`;
}

function buildProxyHeaders(headers, remoteAddress) {
  return {
    ...headers,
    host: headers.host || `${GATEWAY_HOST}:${GATEWAY_PORT}`,
    "x-forwarded-for": appendForwarded(
      headers["x-forwarded-for"],
      remoteAddress,
    ),
    "x-forwarded-host": headers["x-forwarded-host"] || headers.host || "",
    "x-forwarded-proto": headers["x-forwarded-proto"] || "https",
  };
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

  if (syncData.status === "success") {
    badgeClass = "status-online";
    pulseHtml = '<div class="pulse"></div>';
  } else if (syncData.status === "syncing") {
    badgeClass = "status-syncing";
    pulseHtml = '<div class="pulse" style="background:#3b82f6"></div>';
  }

  return `<div class="status-badge ${badgeClass}">${pulseHtml}${String(syncData.status || "unknown").toUpperCase()}</div>`;
}

function renderDashboard(initialData) {
  const controlUiHref = `${DASHBOARD_APP_BASE}/`;
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
        }

        .helper-summary strong {
            color: var(--text);
        }

        .helper-toggle {
            margin-top: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.04);
            color: var(--text);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px 16px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

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
                <span id="wa-status">${renderChannelBadge(initialData.whatsapp, 'Ready to pair')}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Telegram</span>
                <span id="tg-status">${renderChannelBadge(initialData.telegram, 'Configured')}</span>
            </div>
            <a href="${controlUiHref}" id="control-ui-link" class="stat-btn">Open Control UI</a>
        </div>

        <div class="stat-card" style="width: 100%;">
            <span class="stat-label">Workspace Sync Status</span>
            <div id="sync-badge-container">${renderSyncBadge(initialData.sync)}</div>
            <div class="sync-info">
                Last Sync Activity: <span id="sync-time">${initialData.sync.timestamp || "Never"}</span>
                <span id="sync-msg">${initialData.sync.message || "Waiting for first sync..."}</span>
            </div>
        </div>

        <div class="stat-card helper-card">
            <span class="stat-label">Keep Space Awake</span>
            <div class="helper-copy">
                If you use a free Hugging Face Space, it can still sleep.
                To keep it awake, create an external UptimeRobot monitor here.
                Use your <strong>Main API key</strong>.
            </div>
            <div class="helper-copy">
                Do <strong>not</strong> use the Read-only API key or a Monitor-specific API key.
            </div>
            <div id="uptimerobot-summary" class="helper-summary">
                Optional one-time setup. If you already created the monitor before, you do not need to paste the key again.
            </div>
            <button id="uptimerobot-toggle" class="helper-toggle" type="button">
                Set Up Monitor
            </button>
            <div id="uptimerobot-shell" class="helper-shell hidden">
                <div class="helper-row">
                    <input
                        id="uptimerobot-key"
                        class="helper-input"
                        type="password"
                        placeholder="Paste your UptimeRobot Main API key"
                        autocomplete="off"
                    />
                    <button id="uptimerobot-btn" class="helper-button" type="button">
                        Create Monitor
                    </button>
                </div>
                <div class="helper-note">
                    One-time setup. Your key is only used to create the monitor for this Space.
                </div>
            </div>
            <div id="uptimerobot-result" class="helper-result"></div>
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

                if (syncData.status === 'success') {
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

        const monitorStateKey = 'huggingclaw_uptimerobot_setup_v1';

        function setMonitorUiState(isConfigured) {
            const summary = document.getElementById('uptimerobot-summary');
            const shell = document.getElementById('uptimerobot-shell');
            const toggle = document.getElementById('uptimerobot-toggle');

            if (isConfigured) {
                summary.innerHTML = '<strong>Already set up.</strong> Your monitor should keep running from UptimeRobot even after this Space restarts.';
                shell.classList.add('hidden');
                toggle.textContent = 'Set Up Again';
            } else {
                summary.innerHTML = 'Optional one-time setup. If you already created the monitor before, you do not need to paste the key again.';
                toggle.textContent = 'Set Up Monitor';
            }
        }

        function restoreMonitorUiState() {
            try {
                const value = window.localStorage.getItem(monitorStateKey);
                setMonitorUiState(value === 'done');
            } catch {
                setMonitorUiState(false);
            }
        }

        function toggleMonitorSetup() {
            const shell = document.getElementById('uptimerobot-shell');
            shell.classList.toggle('hidden');
        }

        async function setupUptimeRobot() {
            const input = document.getElementById('uptimerobot-key');
            const button = document.getElementById('uptimerobot-btn');
            const result = document.getElementById('uptimerobot-result');
            const apiKey = input.value.trim();

            if (!apiKey) {
                result.className = 'helper-result error';
                result.textContent = 'Paste your UptimeRobot Main API key first.';
                return;
            }

            button.disabled = true;
            button.textContent = 'Creating...';
            result.className = 'helper-result';
            result.textContent = '';

            try {
                const res = await fetch(getDashboardBase() + '/uptimerobot/setup' + getCurrentSearch(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey })
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Failed to create monitor.');
                }

                result.className = 'helper-result ok';
                result.textContent = data.message || 'UptimeRobot monitor is ready.';
                input.value = '';
                try {
                    window.localStorage.setItem(monitorStateKey, 'done');
                } catch {}
                setMonitorUiState(true);
                document.getElementById('uptimerobot-shell').classList.add('hidden');
            } catch (error) {
                result.className = 'helper-result error';
                result.textContent = error.message || 'Failed to create monitor.';
            } finally {
                button.disabled = false;
                button.textContent = 'Create Monitor';
            }
        }

        updateStats();
        setInterval(updateStats, 10000);
        restoreMonitorUiState();
        document.getElementById('control-ui-link').setAttribute('href', getDashboardBase() + '/app/' + getCurrentSearch());
        document.getElementById('uptimerobot-btn').addEventListener('click', setupUptimeRobot);
        document.getElementById('uptimerobot-toggle').addEventListener('click', toggleMonitorSetup);
    </script>
</body>
</html>
  `;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function postUptimeRobot(path, form) {
  const body = new URLSearchParams(form).toString();

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.uptimerobot.com",
        port: 443,
        method: "POST",
        path,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error("Unexpected response from UptimeRobot"));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function createUptimeRobotMonitor(apiKey, host) {
  const cleanHost = String(host || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!cleanHost) {
    throw new Error("Missing Space host.");
  }

  const monitorUrl = `https://${cleanHost}/health`;
  const existing = await postUptimeRobot("/v2/getMonitors", {
    api_key: apiKey,
    format: "json",
    logs: "0",
    response_times: "0",
    response_times_limit: "1",
  });

  const existingMonitor = Array.isArray(existing.monitors)
    ? existing.monitors.find((monitor) => monitor.url === monitorUrl)
    : null;

  if (existingMonitor) {
    return {
      created: false,
      message: `Monitor already exists for ${monitorUrl}`,
    };
  }

  const created = await postUptimeRobot("/v2/newMonitor", {
    api_key: apiKey,
    format: "json",
    type: "1",
    friendly_name: `HuggingClaw ${cleanHost}`,
    url: monitorUrl,
    interval: "300",
  });

  if (created.stat !== "ok") {
    const message =
      created?.error?.message ||
      created?.message ||
      "Failed to create UptimeRobot monitor.";
    throw new Error(message);
  }

  return {
    created: true,
    message: `Monitor created for ${monitorUrl}`,
  };
}

function proxyHttp(req, res, proxyPath = req.url, proxyPort = GATEWAY_PORT) {
  const proxyReq = http.request(
    {
      hostname: GATEWAY_HOST,
      port: proxyPort,
      method: req.method,
      path: proxyPath,
      headers: buildProxyHeaders(req.headers, req.socket.remoteAddress),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "error",
        message: "Gateway unavailable",
        detail: error.message,
      }),
    );
  });

  req.pipe(proxyReq);
}

function serializeUpgradeHeaders(req, remoteAddress) {
  const forwardedHeaders = [];

  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i];
    const value = req.rawHeaders[i + 1];
    const lower = name.toLowerCase();

    if (
      lower === "x-forwarded-for" ||
      lower === "x-forwarded-host" ||
      lower === "x-forwarded-proto"
    ) {
      continue;
    }

    forwardedHeaders.push(`${name}: ${value}`);
  }

  forwardedHeaders.push(
    `X-Forwarded-For: ${appendForwarded(req.headers["x-forwarded-for"], remoteAddress)}`,
  );
  forwardedHeaders.push(
    `X-Forwarded-Host: ${req.headers["x-forwarded-host"] || req.headers.host || ""}`,
  );
  forwardedHeaders.push(
    `X-Forwarded-Proto: ${req.headers["x-forwarded-proto"] || "https"}`,
  );

  return forwardedHeaders;
}

function proxyUpgrade(req, socket, head, proxyPath = req.url, proxyPort = GATEWAY_PORT) {
  const proxySocket = net.connect(proxyPort, GATEWAY_HOST);

  proxySocket.on("connect", () => {
    const requestLines = [
      `${req.method} ${proxyPath} HTTP/${req.httpVersion}`,
      ...serializeUpgradeHeaders(req, req.socket.remoteAddress),
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

  if (pathname === "/uptimerobot/setup" || pathname === DASHBOARD_UPTIMEROBOT_PATH) {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Method not allowed" }));
      return;
    }

    void (async () => {
      try {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body || "{}");
        const apiKey = String(parsed.apiKey || "").trim();

        if (!apiKey) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Paste your UptimeRobot Main API key first.",
            }),
          );
          return;
        }

        const result = await createUptimeRobotMonitor(apiKey, req.headers.host);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message:
              error && error.message
                ? error.message
                : "Failed to create UptimeRobot monitor.",
          }),
        );
      }
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
    };
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderDashboard(initialData));
    return;
  }

  if (isDashboardAppRoute(pathname) || isAppRoute(pathname)) {
    const proxyPath =
      stripDashboardAppPrefix(pathname) + (parsedUrl.search || "");
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
    const proxyPath =
      stripDashboardAppPrefix(pathname) + (parsedUrl.search || "");
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

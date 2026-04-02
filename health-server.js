// Single public entrypoint for HF Spaces: local dashboard + reverse proxy to OpenClaw.
const http = require("http");
const fs = require("fs");
const net = require("net");
const { randomUUID } = require("node:crypto");

const PORT = 7861;
const GATEWAY_PORT = 7860;
const GATEWAY_HOST = "127.0.0.1";
const GATEWAY_ORIGIN = `http://${GATEWAY_HOST}:${GATEWAY_PORT}`;
const startTime = Date.now();
const LLM_MODEL = process.env.LLM_MODEL || "Not Set";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";
const TELEGRAM_ENABLED = !!process.env.TELEGRAM_BOT_TOKEN;
const GATEWAY_STATUS_CACHE_MS = 5000;

let gatewayStatusCache = {
  expiresAt: 0,
  value: {
    whatsapp: { configured: true, connected: false },
    telegram: { configured: TELEGRAM_ENABLED, connected: false },
  },
};

function parseRequestUrl(url) {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}

function isDashboardRoute(pathname) {
  return pathname === "/dashboard" || pathname === "/dashboard/";
}

function isLocalRoute(pathname) {
  return pathname === "/health" || pathname === "/status" || isDashboardRoute(pathname);
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
  return { status: "unknown", message: "No sync data yet" };
}

function normalizeChannelStatus(channel, configured) {
  return {
    configured: configured || !!channel,
    connected: !!(channel && channel.connected),
  };
}

function extractErrorMessage(msg) {
  if (!msg || typeof msg !== "object") return "Unknown error";
  if (typeof msg.error === "string") return msg.error;
  if (msg.error && typeof msg.error.message === "string") return msg.error.message;
  if (typeof msg.message === "string") return msg.message;
  return "Unknown error";
}

function createGatewayConnection() {
  return new Promise((resolve, reject) => {
    const { WebSocket } = require("/home/node/.openclaw/openclaw-app/node_modules/ws");
    const ws = new WebSocket(
      `ws://${GATEWAY_HOST}:${GATEWAY_PORT}/?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
      {
        headers: { Origin: GATEWAY_ORIGIN },
      },
    );
    let resolved = false;

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === "event" && msg.event === "connect.challenge") {
        ws.send(JSON.stringify({
          type: "req",
          id: randomUUID(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            auth: { token: GATEWAY_TOKEN },
            client: { id: "huggingclaw-dashboard", platform: "web", mode: "ui", version: "1.0.0" },
            scopes: ["operator.read"],
          },
        }));
        return;
      }

      if (!resolved && msg.type === "res" && msg.ok === false) {
        resolved = true;
        ws.close();
        reject(new Error(extractErrorMessage(msg)));
        return;
      }

      if (!resolved && msg.type === "res" && msg.ok) {
        resolved = true;
        resolve(ws);
      }
    });

    ws.on("error", (error) => {
      if (!resolved) reject(error);
    });

    setTimeout(() => {
      if (!resolved) {
        ws.close();
        reject(new Error("Timeout"));
      }
    }, 10000);
  });
}

function callGatewayRpc(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeListener("message", handler);
        resolve(msg);
      }
    };

    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "req", id, method, params }));

    setTimeout(() => {
      ws.removeListener("message", handler);
      reject(new Error("RPC Timeout"));
    }, 15000);
  });
}

async function getGatewayChannelStatus() {
  if (Date.now() < gatewayStatusCache.expiresAt) {
    return gatewayStatusCache.value;
  }

  let ws;
  try {
    ws = await createGatewayConnection();
    const statusRes = await callGatewayRpc(ws, "channels.status", {});
    const channels = (statusRes.payload || statusRes.result)?.channels || {};
    const value = {
      whatsapp: normalizeChannelStatus(channels.whatsapp, true),
      telegram: normalizeChannelStatus(channels.telegram, TELEGRAM_ENABLED),
    };
    gatewayStatusCache = {
      expiresAt: Date.now() + GATEWAY_STATUS_CACHE_MS,
      value,
    };
    return value;
  } catch {
    return gatewayStatusCache.value;
  } finally {
    if (ws) ws.close();
  }
}

function renderDashboard() {
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
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
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
                <span class="stat-value" id="model-id">Loading...</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Uptime</span>
                <span class="stat-value" id="uptime">Loading...</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">WhatsApp</span>
                <span id="wa-status">Loading...</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Telegram</span>
                <span id="tg-status">Loading...</span>
            </div>
            <a href="/" class="stat-btn">Open Control UI</a>
        </div>

        <div class="stat-card" style="width: 100%;">
            <span class="stat-label">Workspace Sync Status</span>
            <div id="sync-badge-container"></div>
            <div class="sync-info">
                Last Sync Activity: <span id="sync-time">Never</span>
                <span id="sync-msg">Initializing synchronization...</span>
            </div>
        </div>

        <div class="footer">
            Live updates every 10s
        </div>
    </div>

    <script>
        async function updateStats() {
            try {
                const res = await fetch('/status');
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

        updateStats();
        setInterval(updateStats, 10000);
    </script>
</body>
</html>
  `;
}

function proxyHttp(req, res) {
  const proxyReq = http.request(
    {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      method: req.method,
      path: req.url,
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

function proxyUpgrade(req, socket, head) {
  const proxySocket = net.connect(GATEWAY_PORT, GATEWAY_HOST);

  proxySocket.on("connect", () => {
    const requestLines = [
      `${req.method} ${req.url} HTTP/${req.httpVersion}`,
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

  if (pathname === "/health") {
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

  if (pathname === "/status") {
    void (async () => {
      const channelStatus = await getGatewayChannelStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: LLM_MODEL,
          whatsapp: channelStatus.whatsapp,
          telegram: channelStatus.telegram,
          sync: readSyncStatus(),
          uptime: uptimeHuman,
        }),
      );
    })();
    return;
  }

  if (isDashboardRoute(pathname)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderDashboard());
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

  proxyUpgrade(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Health server listening on port ${PORT}; proxying gateway traffic to ${GATEWAY_HOST}:${GATEWAY_PORT}`,
  );
});

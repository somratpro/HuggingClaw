/**
 * HuggingClaw WhatsApp Guardian
 *
 * Automates the WhatsApp pairing process on HuggingFace Spaces.
 * Handles the "515 Restart" by monitoring the channel status and
 * re-applying the configuration after a successful scan.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { WebSocket } = require('/home/node/.openclaw/openclaw-app/node_modules/ws');
const { randomUUID } = require('node:crypto');

const GATEWAY_URL = "ws://127.0.0.1:7860";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "huggingclaw";
const WHATSAPP_ENABLED = /^true$/i.test(process.env.WHATSAPP_ENABLED || "");
const CHECK_INTERVAL = 5000;
const WAIT_TIMEOUT = 120000;
const POST_515_NO_LOGOUT_MS = 90 * 1000;
const SUCCESS_COOLDOWN_MS = 60 * 1000;
const RESET_MARKER_PATH = path.join(
  process.env.HOME || "/home/node",
  ".openclaw",
  "workspace",
  ".reset_credentials",
);
const STATUS_FILE_PATH = "/tmp/huggingclaw-wa-status.json";

let isWaiting = false;
let hasShownWaitMessage = false;
let last515At = 0;
let lastConnectedAt = 0;
let shouldStop = false;

function extractErrorMessage(msg) {
  if (!msg || typeof msg !== "object") return "Unknown error";
  if (typeof msg.error === "string") return msg.error;
  if (msg.error && typeof msg.error.message === "string") return msg.error.message;
  if (typeof msg.message === "string") return msg.message;
  return "Unknown error";
}

function writeResetMarker() {
  try {
    fs.mkdirSync(path.dirname(RESET_MARKER_PATH), { recursive: true });
    fs.writeFileSync(RESET_MARKER_PATH, "reset\n");
    console.log(`[guardian] Created backup reset marker at ${RESET_MARKER_PATH}`);
  } catch (error) {
    console.log(`[guardian] Failed to write backup reset marker: ${error.message}`);
  }
}

function writeStatus(partial) {
  try {
    const current = fs.existsSync(STATUS_FILE_PATH)
      ? JSON.parse(fs.readFileSync(STATUS_FILE_PATH, "utf8"))
      : {};
    const next = {
      configured: true,
      connected: false,
      pairing: false,
      updatedAt: new Date().toISOString(),
      ...current,
      ...partial,
    };
    fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(next));
  } catch (error) {
    console.log(`[guardian] Failed to write status file: ${error.message}`);
  }
}

async function createConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL);
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
            client: {
              id: "gateway-client",
              version: "1.0.0",
              platform: "linux",
              mode: "backend",
            },
            caps: [],
            auth: { token: GATEWAY_TOKEN },
            role: "operator",
            scopes: ["operator.read", "operator.write", "operator.admin", "operator.pairing"],
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

    ws.on("error", (e) => { if (!resolved) reject(e); });
    setTimeout(() => { if (!resolved) { ws.close(); reject(new Error("Timeout")); } }, 10000);
  });
}

async function callRpc(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeListener("message", handler);
        if (msg.ok === false) {
          reject(new Error(extractErrorMessage(msg)));
          return;
        }
        resolve(msg);
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
    setTimeout(() => { ws.removeListener("message", handler); reject(new Error("RPC Timeout")); }, WAIT_TIMEOUT + 5000);
  });
}

async function checkStatus() {
  if (shouldStop) return;
  if (isWaiting) return;
  if (lastConnectedAt && Date.now() - lastConnectedAt < SUCCESS_COOLDOWN_MS) return;

  let ws;
  try {
    ws = await createConnection();

    const statusRes = await callRpc(ws, "channels.status", {});
    const channels = (statusRes.payload || statusRes.result)?.channels || {};
    const wa = channels.whatsapp;

    if (!wa) {
      hasShownWaitMessage = false;
      writeStatus({ configured: true, connected: false, pairing: false });
      return;
    }

    if (wa.connected) {
      hasShownWaitMessage = false;
      lastConnectedAt = Date.now();
      writeStatus({ configured: true, connected: true, pairing: false });
      shouldStop = true;
      setTimeout(() => process.exit(0), 1000);
      return;
    }

    isWaiting = true;
    writeStatus({ configured: true, connected: false, pairing: true });
    if (!hasShownWaitMessage) {
      console.log("\n[guardian] 📱 WhatsApp pairing in progress. Please scan the QR code in the Control UI.");
      hasShownWaitMessage = true;
    }

    console.log("[guardian] Waiting for pairing completion...");
    const waitRes = await callRpc(ws, "web.login.wait", { timeoutMs: WAIT_TIMEOUT });
    const result = waitRes.payload || waitRes.result;
    const message = result?.message || "";
    const linkedAfter515 = !result?.connected && message.includes("515");

    if (linkedAfter515) {
      last515At = Date.now();
    }

    if (result && (result.connected || linkedAfter515)) {
      hasShownWaitMessage = false;
      lastConnectedAt = Date.now();
      writeStatus({ configured: true, connected: true, pairing: false });

      if (linkedAfter515) {
        console.log("[guardian] 515 after scan: credentials saved, reloading config to start WhatsApp...");
      } else {
        console.log("[guardian] ✅ Pairing completed! Reloading config...");
      }

      const getRes = await callRpc(ws, "config.get", {});
      if (getRes.payload?.raw && getRes.payload?.hash) {
        await callRpc(ws, "config.apply", { raw: getRes.payload.raw, baseHash: getRes.payload.hash });
        console.log("[guardian] Configuration re-applied.");
      }

      shouldStop = true;
      setTimeout(() => process.exit(0), 1000);
    } else if (!message.includes("No active") && !message.includes("Still waiting")) {
      console.log(`[guardian] Wait result: ${message}`);
    }

  } catch (e) {
    const message = e && e.message ? e.message : "";
    if (
      /401|unauthorized|logged out|440|conflict/i.test(message) &&
      Date.now() - last515At >= POST_515_NO_LOGOUT_MS
    ) {
      console.log("[guardian] Clearing invalid WhatsApp session so a fresh QR can be used...");
      try {
        if (ws) {
          await callRpc(ws, "channels.logout", { channel: "whatsapp" });
          writeResetMarker();
          hasShownWaitMessage = false;
          console.log("[guardian] Logged out invalid WhatsApp session.");
        }
      } catch (error) {
        console.log(`[guardian] Failed to log out invalid session: ${error.message}`);
      }
    }
    if (!/RPC Timeout/i.test(message)) {
      writeStatus({ configured: true, connected: false, pairing: false });
    }
    // Normal timeout or gateway starting up; retry on the next interval.
  } finally {
    isWaiting = false;
    if (ws) ws.close();
  }
}

if (!WHATSAPP_ENABLED) {
  writeStatus({ configured: false, connected: false, pairing: false });
  process.exit(0);
}

writeStatus({ configured: true, connected: false, pairing: false });
console.log("[guardian] ⚔️ WhatsApp Guardian active. Monitoring pairing status...");
setInterval(checkStatus, CHECK_INTERVAL);
setTimeout(checkStatus, 15000);

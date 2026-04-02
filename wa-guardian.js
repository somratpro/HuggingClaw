/**
 * HuggingClaw WhatsApp Guardian
 *
 * Automates the WhatsApp pairing process on HuggingFace Spaces.
 * Handles the "515 Restart" by monitoring the channel status and
 * re-applying the configuration after a successful scan.
 */
"use strict";

const { WebSocket } = require('/home/node/.openclaw/openclaw-app/node_modules/ws');
const { randomUUID } = require('node:crypto');

const GATEWAY_URL = "ws://127.0.0.1:7860";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "huggingclaw";
const CHECK_INTERVAL = 5000;
const WAIT_TIMEOUT = 120000;
const AUTH_FAILURE_COOLDOWN = 5 * 60 * 1000;

let isWaiting = false;
let hasShownWaitMessage = false;
let authFailureUntil = 0;
let authFailureLogged = false;

function extractErrorMessage(msg) {
  if (!msg || typeof msg !== "object") return "Unknown error";
  if (typeof msg.error === "string") return msg.error;
  if (msg.error && typeof msg.error.message === "string") return msg.error.message;
  if (typeof msg.message === "string") return msg.message;
  return "Unknown error";
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
            auth: { token: GATEWAY_TOKEN },
            client: { id: "wa-guardian", platform: "linux", mode: "backend", version: "1.0.0" },
            scopes: ["operator.admin", "operator.pairing", "operator.read", "operator.write"]
          }
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
        resolve(msg);
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
    setTimeout(() => { ws.removeListener("message", handler); reject(new Error("RPC Timeout")); }, WAIT_TIMEOUT + 5000);
  });
}

async function checkStatus() {
  if (isWaiting) return;
  if (Date.now() < authFailureUntil) return;

  let ws;
  try {
    ws = await createConnection();
    authFailureUntil = 0;
    authFailureLogged = false;

    // Check if WhatsApp channel exists and its status
    const statusRes = await callRpc(ws, "channels.status", {});
    const channels = (statusRes.payload || statusRes.result)?.channels || {};
    const wa = channels.whatsapp;

    if (!wa) {
      ws.close();
      return;
    }

    // If connected, we are good
    if (wa.connected) {
      ws.close();
      return;
    }

    // If "Ready to pair", we wait for the scan
    isWaiting = true;
    if (!hasShownWaitMessage) {
      console.log("\n[guardian] 📱 WhatsApp pairing in progress. Please scan the QR code in the Control UI.");
      hasShownWaitMessage = true;
    }

    console.log("[guardian] Waiting for pairing completion...");
    const waitRes = await callRpc(ws, "web.login.wait", { timeoutMs: WAIT_TIMEOUT });
    const result = waitRes.payload || waitRes.result;

    if (result && (result.connected || (result.message && result.message.includes("515")))) {
      console.log("[guardian] ✅ Pairing completed! Saving session and restarting gateway...");
      hasShownWaitMessage = false;
      
      // Auto-reapply config to finalize pairing
      const getRes = await callRpc(ws, "config.get", {});
      if (getRes.ok) {
        await callRpc(ws, "config.apply", { raw: getRes.payload.raw, baseHash: getRes.payload.hash });
        console.log("[guardian] Configuration re-applied.");
      }
    }

  } catch (e) {
    const message = e && e.message ? e.message : "";
    if (/unauthorized|authentication|too many failed/i.test(message)) {
      authFailureUntil = Date.now() + AUTH_FAILURE_COOLDOWN;
      if (!authFailureLogged) {
        console.log(`[guardian] Authentication failed (${message}). Pausing guardian retries for ${AUTH_FAILURE_COOLDOWN / 60000} minutes.`);
        authFailureLogged = true;
      }
    }
    // Normal timeout or gateway starting up
  } finally {
    isWaiting = false;
    if (ws) ws.close();
  }
}

console.log("[guardian] ⚔️ WhatsApp Guardian active. Monitoring pairing status...");
setInterval(checkStatus, CHECK_INTERVAL);
setTimeout(checkStatus, 10000);

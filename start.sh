#!/bin/bash
set -euo pipefail

umask 0077

# ════════════════════════════════════════════════════════════════
# HuggingClaw — OpenClaw Gateway for HF Spaces
# ════════════════════════════════════════════════════════════════

# ── Startup Banner ──
OPENCLAW_VERSION="${OPENCLAW_VERSION:-latest}"
OPENCLAW_APP_DIR="/home/node/.openclaw/openclaw-app"
OPENCLAW_RUNTIME_VERSION=""
WHATSAPP_ENABLED="${WHATSAPP_ENABLED:-false}"
WHATSAPP_ENABLED_NORMALIZED=$(printf '%s' "$WHATSAPP_ENABLED" | tr '[:upper:]' '[:lower:]')
SYNC_INTERVAL="${SYNC_INTERVAL:-180}"
if [ -n "${SPACE_HOST:-}" ]; then
  OPENCLAW_CONSOLE_LOG_LEVEL="${OPENCLAW_CONSOLE_LOG_LEVEL:-warn}"
  OPENCLAW_FILE_LOG_LEVEL="${OPENCLAW_FILE_LOG_LEVEL:-info}"
  OPENCLAW_CONSOLE_LOG_STYLE="${OPENCLAW_CONSOLE_LOG_STYLE:-compact}"
  BROWSER_PLUGIN_MODE="${BROWSER_PLUGIN_MODE:-disabled}"
  ACP_PLUGIN_MODE="${ACP_PLUGIN_MODE:-disabled}"
  # HF Spaces does not benefit from Bonjour discovery, and the retries add noise.
  export OPENCLAW_DISABLE_BONJOUR="${OPENCLAW_DISABLE_BONJOUR:-1}"
else
  OPENCLAW_CONSOLE_LOG_LEVEL="${OPENCLAW_CONSOLE_LOG_LEVEL:-info}"
  OPENCLAW_FILE_LOG_LEVEL="${OPENCLAW_FILE_LOG_LEVEL:-info}"
  OPENCLAW_CONSOLE_LOG_STYLE="${OPENCLAW_CONSOLE_LOG_STYLE:-pretty}"
  BROWSER_PLUGIN_MODE="${BROWSER_PLUGIN_MODE:-auto}"
  ACP_PLUGIN_MODE="${ACP_PLUGIN_MODE:-auto}"
fi
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║          🦞 HuggingClaw Gateway          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Validate required secrets ──
ERRORS=""
if [ -z "$LLM_API_KEY" ]; then
  ERRORS="${ERRORS}  - LLM_API_KEY is not set\n"
fi
if [ -z "$LLM_MODEL" ]; then
  ERRORS="${ERRORS}  - LLM_MODEL is not set (e.g. google/gemini-2.5-flash, anthropic/claude-sonnet-4-5, openai/gpt-4)\n"
fi
if [ -z "$GATEWAY_TOKEN" ]; then
  ERRORS="${ERRORS}  - GATEWAY_TOKEN is not set (generate: openssl rand -hex 32)\n"
fi
if [ -n "$ERRORS" ]; then
  echo "Missing required secrets:"
  echo -e "$ERRORS"
echo "Add them in HF Spaces → Settings → Secrets"
  exit 1
fi

# Resolve the actual bundled OpenClaw version so the banner reflects what is
# inside the image, not just the requested tag.
if [ -f "$OPENCLAW_APP_DIR/package.json" ]; then
  OPENCLAW_RUNTIME_VERSION=$(node -p "require('$OPENCLAW_APP_DIR/package.json').version" 2>/dev/null || true)
fi

if [ -n "$OPENCLAW_RUNTIME_VERSION" ]; then
  OPENCLAW_DISPLAY_VERSION="$OPENCLAW_RUNTIME_VERSION"
  if [ "$OPENCLAW_VERSION" != "$OPENCLAW_RUNTIME_VERSION" ]; then
    OPENCLAW_DISPLAY_VERSION="$OPENCLAW_RUNTIME_VERSION (tag: $OPENCLAW_VERSION)"
  fi
else
  OPENCLAW_DISPLAY_VERSION="$OPENCLAW_VERSION"
fi

# ── Set LLM env based on model name ──

# Auto-correct Gemini models to use google/ prefix if anthropic/ was mistakenly used
if [[ "$LLM_MODEL" == "anthropic/gemini"* ]]; then
  LLM_MODEL=$(echo "$LLM_MODEL" | sed 's/^anthropic\//google\//')
  echo "Note: corrected model from anthropic/gemini* to google/gemini*"
fi

# Extract provider prefix from model name (e.g. "google/gemini-2.5-flash" → "google")
LLM_PROVIDER=$(echo "$LLM_MODEL" | cut -d'/' -f1)

# Map provider prefix to the correct API key environment variable
# Based on OpenClaw provider system: /usr/local/lib/node_modules/openclaw/docs/concepts/model-providers.md
# Note: OpenClaw normalizes some prefixes (z-ai → zai, z.ai → zai, etc.)
case "$LLM_PROVIDER" in
  # ── Core Providers ──
  anthropic)                    export ANTHROPIC_API_KEY="$LLM_API_KEY" ;;
  openai|openai-codex)          export OPENAI_API_KEY="$LLM_API_KEY" ;;
  google|google-vertex)         export GEMINI_API_KEY="$LLM_API_KEY" ;;
  deepseek)                     export DEEPSEEK_API_KEY="$LLM_API_KEY" ;;
  # ── OpenCode Providers ──
  opencode)                     export OPENCODE_API_KEY="$LLM_API_KEY" ;;
  opencode-go)                  export OPENCODE_API_KEY="$LLM_API_KEY" ;;
  # ── Gateway/Router Providers ──
  openrouter)                   export OPENROUTER_API_KEY="$LLM_API_KEY" ;;
  kilocode)                     export KILOCODE_API_KEY="$LLM_API_KEY" ;;
  vercel-ai-gateway)            export AI_GATEWAY_API_KEY="$LLM_API_KEY" ;;
  # ── Chinese/Asian Providers ──
  zai|z-ai|z.ai|zhipu)          export ZAI_API_KEY="$LLM_API_KEY" ;;
  moonshot)                     export MOONSHOT_API_KEY="$LLM_API_KEY" ;;
  kimi-coding)                  export KIMI_API_KEY="$LLM_API_KEY" ;;
  minimax)                      export MINIMAX_API_KEY="$LLM_API_KEY" ;;
  qwen|modelstudio)             export MODELSTUDIO_API_KEY="$LLM_API_KEY" ;;
  xiaomi)                       export XIAOMI_API_KEY="$LLM_API_KEY" ;;
  volcengine|volcengine-plan)   export VOLCANO_ENGINE_API_KEY="$LLM_API_KEY" ;;
  byteplus|byteplus-plan)       export BYTEPLUS_API_KEY="$LLM_API_KEY" ;;
  qianfan)                      export QIANFAN_API_KEY="$LLM_API_KEY" ;;
  # ── Western Providers ──
  mistral|mistralai)            export MISTRAL_API_KEY="$LLM_API_KEY" ;;
  xai|x-ai)                    export XAI_API_KEY="$LLM_API_KEY" ;;
  nvidia)                       export NVIDIA_API_KEY="$LLM_API_KEY" ;;
  cohere)                       export COHERE_API_KEY="$LLM_API_KEY" ;;
  groq)                         export GROQ_API_KEY="$LLM_API_KEY" ;;
  together)                     export TOGETHER_API_KEY="$LLM_API_KEY" ;;
  huggingface)                  export HUGGINGFACE_HUB_TOKEN="$LLM_API_KEY" ;;
  cerebras)                     export CEREBRAS_API_KEY="$LLM_API_KEY" ;;
  venice)                       export VENICE_API_KEY="$LLM_API_KEY" ;;
  synthetic)                    export SYNTHETIC_API_KEY="$LLM_API_KEY" ;;
  github-copilot)               export COPILOT_GITHUB_TOKEN="$LLM_API_KEY" ;;
  # ── Fallback: Anthropic (default) ──
  *)
    export ANTHROPIC_API_KEY="$LLM_API_KEY"
    ;;
esac

# ── Setup directories ──
mkdir -p /home/node/.openclaw/agents/main/sessions
mkdir -p /home/node/.openclaw/credentials
mkdir -p /home/node/.openclaw/memory
mkdir -p /home/node/.openclaw/extensions
mkdir -p /home/node/.openclaw/workspace
chmod 700 /home/node/.openclaw
chmod 700 /home/node/.openclaw/credentials

# ── Restore workspace/state from HF Dataset ──
BACKUP_DATASET="${BACKUP_DATASET_NAME:-huggingclaw-backup}"
if [ -n "${HF_TOKEN:-}" ]; then
  echo "Restoring workspace from HF Dataset..."
  python3 /home/node/app/workspace-sync.py restore || true
else
  echo "HF_TOKEN not set — running without dataset persistence."
fi

CLOUDFLARE_WORKERS_TOKEN="${CLOUDFLARE_WORKERS_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
export CLOUDFLARE_WORKERS_TOKEN
CF_PROXY_ENV_FILE="/tmp/huggingclaw-cloudflare-proxy.env"
if [ -n "${CLOUDFLARE_WORKERS_TOKEN:-}" ] || [ -n "${CLOUDFLARE_PROXY_URL:-}" ]; then
  export CLOUDFLARE_PROXY_DOMAINS="${CLOUDFLARE_PROXY_DOMAINS:-api.telegram.org,web.whatsapp.com,googleapis.com}"
  # Default debug off for production. Set CLOUDFLARE_PROXY_DEBUG=true in HF
  # Space secrets to surface per-request "Redirecting" + error-cause logs.
  export CLOUDFLARE_PROXY_DEBUG="${CLOUDFLARE_PROXY_DEBUG:-false}"
  echo "Preparing Cloudflare outbound proxy..."
  python3 /home/node/app/cloudflare-proxy-setup.py || true
  if [ -f "$CF_PROXY_ENV_FILE" ]; then
    . "$CF_PROXY_ENV_FILE"
  fi
fi

# ── Build config ──
CONFIG_JSON=$(cat <<'CONFIGEOF'
{
  "gateway": {
    "mode": "local",
    "port": 7860,
    "bind": "lan",
    "auth": {
      "token": ""
    },
    "controlUi": {
      "allowInsecureAuth": true,
      "basePath": "/app"
    },
    "trustedProxies": ["127.0.0.1/8", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  },
  "channels": {},
  "plugins": {
    "entries": {}
  },
  "logging": {
    "level": "info",
    "consoleLevel": "warn",
    "consoleStyle": "compact"
  }
}
CONFIGEOF
)

# Apply gateway token, model, and logging in a single jq pass.
# Uses --arg so values containing quotes/backslashes can't break the JSON or
# inject jq filters (relevant for OPENCLAW_PASSWORD/GATEWAY_TOKEN below too).
CONFIG_JSON=$(jq \
  --arg token "$GATEWAY_TOKEN" \
  --arg model "$LLM_MODEL" \
  --arg fileLevel "$OPENCLAW_FILE_LOG_LEVEL" \
  --arg consoleLevel "$OPENCLAW_CONSOLE_LOG_LEVEL" \
  --arg consoleStyle "$OPENCLAW_CONSOLE_LOG_STYLE" \
  '.gateway.auth.token = $token
   | .agents.defaults.model = $model
   | .logging.level = $fileLevel
   | .logging.consoleLevel = $consoleLevel
   | .logging.consoleStyle = $consoleStyle' <<<"$CONFIG_JSON")

# Optional: dynamic custom OpenAI-compatible provider registration
CUSTOM_PROVIDER_NAME="${CUSTOM_PROVIDER_NAME:-}"
CUSTOM_BASE_URL="${CUSTOM_BASE_URL:-}"
CUSTOM_MODEL_ID="${CUSTOM_MODEL_ID:-}"
CUSTOM_MODEL_NAME="${CUSTOM_MODEL_NAME:-$CUSTOM_MODEL_ID}"
CUSTOM_API_KEY="${CUSTOM_API_KEY:-$LLM_API_KEY}"
CUSTOM_API_TYPE="${CUSTOM_API_TYPE:-openai-completions}"
CUSTOM_CONTEXT_WINDOW="${CUSTOM_CONTEXT_WINDOW:-128000}"
CUSTOM_MAX_TOKENS="${CUSTOM_MAX_TOKENS:-500}"

if [ -n "$CUSTOM_PROVIDER_NAME" ] || [ -n "$CUSTOM_BASE_URL" ] || [ -n "$CUSTOM_MODEL_ID" ]; then
  CUSTOM_PROVIDER_NORMALIZED=$(printf '%s' "$CUSTOM_PROVIDER_NAME" | tr '[:upper:]' '[:lower:]')
  CUSTOM_BASE_URL_NORMALIZED="${CUSTOM_BASE_URL%/}"
  CUSTOM_PROVIDER_OK=true

  if [ -z "$CUSTOM_PROVIDER_NAME" ] || [ -z "$CUSTOM_BASE_URL" ] || [ -z "$CUSTOM_MODEL_ID" ]; then
    echo "Warning: custom provider skipped: set CUSTOM_PROVIDER_NAME, CUSTOM_BASE_URL, and CUSTOM_MODEL_ID together."
    CUSTOM_PROVIDER_OK=false
  fi

  case "$CUSTOM_PROVIDER_NORMALIZED" in
    anthropic|openai|openai-codex|google|google-vertex|deepseek|opencode|opencode-go|openrouter|kilocode|vercel-ai-gateway|zai|z-ai|z.ai|zhipu|moonshot|kimi-coding|minimax|qwen|modelstudio|xiaomi|volcengine|volcengine-plan|byteplus|byteplus-plan|qianfan|mistral|mistralai|xai|x-ai|nvidia|cohere|groq|together|huggingface|cerebras|venice|synthetic|github-copilot)
      echo "Warning: custom provider skipped: CUSTOM_PROVIDER_NAME='$CUSTOM_PROVIDER_NAME' conflicts with a built-in provider."
      CUSTOM_PROVIDER_OK=false
      ;;
  esac

  if [[ "$CUSTOM_BASE_URL_NORMALIZED" == */chat/completions ]] || [[ "$CUSTOM_BASE_URL_NORMALIZED" == */completions ]]; then
    echo "Warning: custom provider skipped: CUSTOM_BASE_URL should be the API base URL, not a completions endpoint."
    CUSTOM_PROVIDER_OK=false
  fi

  if ! [[ "$CUSTOM_CONTEXT_WINDOW" =~ ^[0-9]+$ ]] || ! [[ "$CUSTOM_MAX_TOKENS" =~ ^[0-9]+$ ]]; then
    echo "Warning: custom provider skipped: CUSTOM_CONTEXT_WINDOW and CUSTOM_MAX_TOKENS must be whole numbers."
    CUSTOM_PROVIDER_OK=false
  fi

  if [ "$CUSTOM_PROVIDER_OK" = "true" ]; then
    echo "Registering custom provider: $CUSTOM_PROVIDER_NAME -> $CUSTOM_BASE_URL_NORMALIZED"
    CONFIG_JSON=$(jq \
      --arg provider "$CUSTOM_PROVIDER_NAME" \
      --arg baseUrl "$CUSTOM_BASE_URL_NORMALIZED" \
      --arg apiKey "$CUSTOM_API_KEY" \
      --arg apiType "$CUSTOM_API_TYPE" \
      --arg modelId "$CUSTOM_MODEL_ID" \
      --arg modelName "$CUSTOM_MODEL_NAME" \
      --argjson contextWindow "$CUSTOM_CONTEXT_WINDOW" \
      --argjson maxTokens "$CUSTOM_MAX_TOKENS" \
      '.models.mode = "merge" |
       .models.providers[$provider] = {
         "baseUrl": $baseUrl,
         "apiKey": $apiKey,
         "api": $apiType,
         "models": [{
           "id": $modelId,
           "name": $modelName,
           "contextWindow": $contextWindow,
           "maxTokens": $maxTokens
         }]
       }' <<<"$CONFIG_JSON")

    if [[ "$LLM_MODEL" != "$CUSTOM_PROVIDER_NAME/"* ]]; then
      echo "Warning: custom provider registered, but LLM_MODEL='$LLM_MODEL' does not start with '$CUSTOM_PROVIDER_NAME/'."
    fi
  fi
fi

# Browser configuration (managed local Chromium in HF/Docker)
BROWSER_EXECUTABLE_PATH=""
for candidate in /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
  if [ -x "$candidate" ]; then
    BROWSER_EXECUTABLE_PATH="$candidate"
    break
  fi
done

BROWSER_SHOULD_ENABLE=false
if [ "$BROWSER_PLUGIN_MODE" = "enabled" ] && [ -n "$BROWSER_EXECUTABLE_PATH" ] && [ -x "$BROWSER_EXECUTABLE_PATH" ]; then
  BROWSER_SHOULD_ENABLE=true
elif [ "$BROWSER_PLUGIN_MODE" = "auto" ] && [ -n "$BROWSER_EXECUTABLE_PATH" ] && [ -x "$BROWSER_EXECUTABLE_PATH" ]; then
  BROWSER_SHOULD_ENABLE=true
fi

# Plugin allow/deny rationale:
#   ALLOW: device-pair, phone-control, talk-voice are the minimum bundled
#          plugins that the Control UI/dashboard needs to render correctly
#          on HF Spaces. Without these the UI shows blank panels.
#          telegram/whatsapp/browser/acpx are added conditionally below.
#   DENY:  lmstudio crashes on boot when no local server is reachable;
#          xai PLUGIN (separate from the xai model PROVIDER) is broken in
#          current OpenClaw releases and prevents gateway start. Disabling
#          the plugin does NOT affect xai-as-a-model-provider.
PLUGIN_ALLOW_JSON='["device-pair","phone-control","talk-voice"]'
if [ "$ACP_PLUGIN_MODE" = "enabled" ] || [ "$ACP_PLUGIN_MODE" = "auto" ]; then
  PLUGIN_ALLOW_JSON=$(jq '. + ["acpx"]' <<<"$PLUGIN_ALLOW_JSON")
fi
if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then
  PLUGIN_ALLOW_JSON=$(jq '. + ["browser"]' <<<"$PLUGIN_ALLOW_JSON")
fi
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  PLUGIN_ALLOW_JSON=$(jq '. + ["telegram"]' <<<"$PLUGIN_ALLOW_JSON")
fi
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  PLUGIN_ALLOW_JSON=$(jq '. + ["whatsapp"]' <<<"$PLUGIN_ALLOW_JSON")
fi

# Apply plugin allow/deny + per-entry toggles in one jq pass.
ACPX_DISABLED=false
if [ "$ACP_PLUGIN_MODE" = "disabled" ]; then ACPX_DISABLED=true; fi
BROWSER_DISABLED=true
if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then BROWSER_DISABLED=false; fi

CONFIG_JSON=$(jq \
  --argjson allow "$PLUGIN_ALLOW_JSON" \
  --argjson acpxDisabled "$ACPX_DISABLED" \
  --argjson browserDisabled "$BROWSER_DISABLED" \
  '.plugins.allow = $allow
   | .plugins.deny = ["lmstudio","xai"]
   | .plugins.entries.lmstudio.enabled = false
   | .plugins.entries.xai.enabled = false
   | (if $acpxDisabled then .plugins.entries.acpx.enabled = false else . end)
   | (if $browserDisabled then
        .plugins.entries.browser.enabled = false | .browser.enabled = false
      else . end)' <<<"$CONFIG_JSON")

if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then
  CONFIG_JSON=$(jq \
    --arg execPath "$BROWSER_EXECUTABLE_PATH" \
    '.browser = {
       "enabled": true,
       "defaultProfile": "openclaw",
       "headless": true,
       "noSandbox": true,
       "executablePath": $execPath
     }
     | .agents.defaults.sandbox.browser.allowHostControl = true' <<<"$CONFIG_JSON")
fi

# Control UI origin (allow HF Space URL for web UI access).
# Disable device auth (pairing) for headless Docker — token-only auth.
# Combined into one jq pass; --arg keeps password/host injection-safe.
CONFIG_JSON=$(jq \
  --arg spaceHost "${SPACE_HOST:-}" \
  --arg password "${OPENCLAW_PASSWORD:-}" \
  '.gateway.controlUi.dangerouslyDisableDeviceAuth = true
   | (if $spaceHost != "" then
        .gateway.controlUi.allowedOrigins = ["https://" + $spaceHost]
      else . end)
   | (if $password != "" then
        .gateway.auth.mode = "password" | .gateway.auth.password = $password
      else . end)' <<<"$CONFIG_JSON")

# Trusted proxies (optional — fixes "Proxy headers detected from untrusted address" on HF Spaces)
# Set TRUSTED_PROXIES as comma-separated IPs/CIDRs, e.g. "10.20.31.87,10.20.26.157"
# Loopback proxies stay trusted by default so the local dashboard reverse proxy works correctly.
if [ -n "${TRUSTED_PROXIES:-}" ]; then
  PROXIES_JSON=$(echo "$TRUSTED_PROXIES" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.trustedProxies += $PROXIES_JSON | .gateway.trustedProxies |= unique")
fi

# Allowed origins (optional — lock down Control UI to specific URLs)
# Set ALLOWED_ORIGINS as comma-separated URLs, e.g. "https://your-space.hf.space"
if [ -n "${ALLOWED_ORIGINS:-}" ]; then
  ORIGINS_JSON=$(echo "$ALLOWED_ORIGINS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.allowedOrigins = $ORIGINS_JSON")
fi

# Telegram (supports multiple user IDs, comma-separated)
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq '.plugins.entries.telegram = {"enabled": true}')
  # Trim spaces and ensure it is exported for the plugin
  CLEAN_TG_TOKEN=$(echo "$TELEGRAM_BOT_TOKEN" | tr -d '[:space:]')
  export TELEGRAM_BOT_TOKEN="$CLEAN_TG_TOKEN"
  
  export OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1
  export OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first
  # Force ipv4 for Telegram specifically as HF IPv6 often times out
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"
  
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg token "$CLEAN_TG_TOKEN" --arg proxy_url "${CLOUDFLARE_PROXY_URL:-}" '
    .channels.telegram.enabled = true
    | .channels.telegram.botToken = $token
    | .channels.telegram.commands.native = false
    | .channels.telegram.timeoutSeconds = 60
    | (if $proxy_url != "" then .channels.telegram.apiRoot = $proxy_url else .channels.telegram.apiRoot = "https://api.telegram.org" end)
    | .channels.telegram.retry = {
        "attempts": 5,
        "minDelayMs": 800,
        "maxDelayMs": 30000,
        "jitter": 0.2
      }
  ')
  
  if [ -n "${TELEGRAM_USER_IDS:-}" ]; then
    # Convert comma-separated IDs to JSON array (already safe — jq -R parses).
    IDS_JSON=$(echo "$TELEGRAM_USER_IDS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
    CONFIG_JSON=$(jq \
      --argjson ids "$IDS_JSON" \
      '.channels.telegram += {"dmPolicy": "allowlist", "allowFrom": $ids}' <<<"$CONFIG_JSON")
  elif [ -n "${TELEGRAM_USER_ID:-}" ]; then
    # Single user (backward compatible). --arg keeps quotes/odd chars safe.
    CONFIG_JSON=$(jq \
      --arg userId "$TELEGRAM_USER_ID" \
      '.channels.telegram += {"dmPolicy": "allowlist", "allowFrom": [$userId]}' <<<"$CONFIG_JSON")
  fi
fi

# WhatsApp (optional)
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq '.plugins.entries.whatsapp = {"enabled": true}')
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq '.channels.whatsapp = {"dmPolicy": "pairing"}')
fi

# Write config
echo "$CONFIG_JSON" > "/home/node/.openclaw/openclaw.json"
chmod 600 /home/node/.openclaw/openclaw.json

# ── Enable Gateway Preload Fixes ──
# This preload script keeps iframe embedding working on HF Spaces.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require /home/node/app/iframe-fix.cjs"

# ── Startup Summary ──
echo ""
echo "Version   : ${OPENCLAW_DISPLAY_VERSION}"
echo "Model     : ${LLM_MODEL}"
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "Telegram  : enabled"
else
  echo "Telegram  : not configured"
fi
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  echo "WhatsApp  : enabled"
else
  echo "WhatsApp  : disabled"
fi
if [ -n "${HF_TOKEN:-}" ]; then
  echo "Backup    : ${BACKUP_DATASET:-huggingclaw-backup} (every ${SYNC_INTERVAL:-180}s)"
else
  echo "Backup    : disabled"
fi
if [ -n "${CLOUDFLARE_PROXY_URL:-}" ]; then
  echo "Proxy     : ${CLOUDFLARE_PROXY_URL}"
fi
if [ -n "${SPACE_HOST:-}" ]; then
  echo "Control UI: https://${SPACE_HOST}/app"
fi
echo ""

# ── Trigger Webhook on Restart ──
if [ -n "${WEBHOOK_URL:-}" ]; then
  curl -s -X POST "$WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d '{"event":"restart", "status":"success", "message":"HuggingClaw gateway has started/restarted.", "model": "'"$LLM_MODEL"'"}' >/dev/null 2>&1 &
fi

# ── Trap SIGTERM for graceful shutdown ──
graceful_shutdown() {
  echo "Shutting down..."
  if [ -f "/home/node/app/workspace-sync.py" ]; then
    echo "Saving state before exit..."
    python3 /home/node/app/workspace-sync.py sync-once || \
      echo "Warning: could not complete shutdown sync"
  fi
  kill $(jobs -p) 2>/dev/null
  exit 0
}
trap graceful_shutdown SIGTERM SIGINT

warmup_browser() {
  [ "$BROWSER_SHOULD_ENABLE" = "true" ] || return 0

  (
    sleep 5

    local attempt
    for attempt in 1 2 3 4 5; do
      if openclaw browser --browser-profile openclaw start >/dev/null 2>&1; then
        openclaw browser --browser-profile openclaw open about:blank >/dev/null 2>&1 || true
        echo "Managed browser ready."
        return 0
      fi
      sleep 2
    done

    echo "Warning: managed browser warm-up did not complete; first browser action may need a retry."
  ) &
}

# ── Start background services ──
export LLM_MODEL="$LLM_MODEL"
# 10. Start Health Server & Dashboard
node /home/node/app/health-server.js &
HEALTH_PID=$!

# ── Launch gateway ──
echo "Launching OpenClaw gateway on port 7860..."

GATEWAY_ARGS=(gateway run --port 7860 --bind lan)
if [ "${GATEWAY_VERBOSE:-0}" = "1" ]; then
  GATEWAY_ARGS+=(--verbose)
  echo "Gateway verbose logging enabled (GATEWAY_VERBOSE=1)"
fi

# Use stdbuf -oL -eL to ensure logs are not buffered and appear immediately
# in the console. NOTE: $! captures the LAST pipeline element (tee), not
# openclaw — fine for passing to `wait` (waits for the whole pipeline to
# finish), but kill -0 on it is uninformative. We probe TCP instead.
stdbuf -oL -eL openclaw "${GATEWAY_ARGS[@]}" 2>&1 | tee -a /home/node/.openclaw/gateway.log &
GATEWAY_PID=$!

# Poll for the gateway to start listening on 7860. OpenClaw can take 20-30s
# on cold start (plugin install + auto-restore). Bail out early if the
# pipeline died.
GATEWAY_READY_TIMEOUT="${GATEWAY_READY_TIMEOUT:-90}"
ready=false
for ((i=0; i<GATEWAY_READY_TIMEOUT; i++)); do
  if (echo > /dev/tcp/127.0.0.1/7860) 2>/dev/null; then
    ready=true
    break
  fi
  if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ "$ready" != "true" ]; then
  echo ""
  echo "Gateway failed to start. Last 30 lines of log:"
  echo "────────────────────────────────────────────"
  tail -30 /home/node/.openclaw/gateway.log
  exit 1
fi

# 11. Start WhatsApp Guardian after the gateway is accepting connections
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  node /home/node/app/wa-guardian.js &
  GUARDIAN_PID=$!
  echo "WhatsApp Guardian started (PID: $GUARDIAN_PID)"
fi

# 11.5 Warm up the managed browser so first browser actions have a live tab
warmup_browser

# 12. Start Workspace Sync after startup settles
if [ -n "${HF_TOKEN:-}" ]; then
  python3 -u /home/node/app/workspace-sync.py loop &
fi

# Wait for gateway (allows trap to fire)
wait $GATEWAY_PID

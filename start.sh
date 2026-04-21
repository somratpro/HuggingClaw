#!/bin/bash
set -e

# ════════════════════════════════════════════════════════════════
# HuggingClaw — OpenClaw Gateway for HF Spaces
# ════════════════════════════════════════════════════════════════

# ── Startup Banner ──
OPENCLAW_VERSION="${OPENCLAW_VERSION:-latest}"
WHATSAPP_ENABLED="${WHATSAPP_ENABLED:-false}"
WHATSAPP_ENABLED_NORMALIZED=$(printf '%s' "$WHATSAPP_ENABLED" | tr '[:upper:]' '[:lower:]')
SYNC_INTERVAL="${SYNC_INTERVAL:-180}"
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║          🦞 HuggingClaw Gateway          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Validate required secrets ──
ERRORS=""
if [ -z "$LLM_API_KEY" ]; then
  ERRORS="${ERRORS}  ❌ LLM_API_KEY is not set\n"
fi
if [ -z "$LLM_MODEL" ]; then
  ERRORS="${ERRORS}  ❌ LLM_MODEL is not set (e.g. google/gemini-2.5-flash, anthropic/claude-sonnet-4-5, openai/gpt-4)\n"
fi
if [ -z "$GATEWAY_TOKEN" ]; then
  ERRORS="${ERRORS}  ❌ GATEWAY_TOKEN is not set (generate: openssl rand -hex 32)\n"
fi
if [ -n "$ERRORS" ]; then
  echo "Missing required secrets:"
  echo -e "$ERRORS"
  echo "Add them in HF Spaces → Settings → Secrets"
  exit 1
fi

# ── Set LLM env based on model name ──

# Auto-correct Gemini models to use google/ prefix if anthropic/ was mistakenly used
if [[ "$LLM_MODEL" == "anthropic/gemini"* ]]; then
  LLM_MODEL=$(echo "$LLM_MODEL" | sed 's/^anthropic\//google\//')
  echo "⚠️  Corrected model from anthropic/gemini* to google/gemini*"
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

# ── Validate HF token (if provided) ──
if [ -n "$HF_TOKEN" ]; then
  echo "🔑 Validating HF token..."
  HF_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $HF_TOKEN" https://huggingface.co/api/repos/create --max-time 10 2>/dev/null || echo "000")
  if [ "$HF_AUTH_STATUS" = "401" ]; then
    echo "  ⚠️  HF token is invalid or expired! Workspace backup will not work."
    echo "  Get a new token: https://huggingface.co/settings/tokens"
  else
    echo "  ✅ HF token is valid"
  fi
fi

# ── Auto-create + Restore workspace from HF Dataset ──
if [ -n "$HF_USERNAME" ] && [ -n "$HF_TOKEN" ]; then
  BACKUP_DATASET="${BACKUP_DATASET_NAME:-huggingclaw-backup}"
  BACKUP_URL="https://${HF_USERNAME}:${HF_TOKEN}@huggingface.co/datasets/${HF_USERNAME}/${BACKUP_DATASET}"
  
  # Auto-create the dataset if it doesn't exist
  echo "📦 Checking HF Dataset: ${HF_USERNAME}/${BACKUP_DATASET}..."
  DATASET_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $HF_TOKEN" \
    "https://huggingface.co/api/datasets/${HF_USERNAME}/${BACKUP_DATASET}" \
    --max-time 10 2>/dev/null || echo "000")
  
  if [ "$DATASET_CHECK" = "404" ]; then
    echo "  📝 Dataset not found, creating ${HF_USERNAME}/${BACKUP_DATASET}..."
    CREATE_RESULT=$(curl -s -w "\n%{http_code}" \
      -X POST "https://huggingface.co/api/repos/create" \
      -H "Authorization: Bearer $HF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"dataset\",\"name\":\"${BACKUP_DATASET}\",\"private\":true}" \
      --max-time 15 2>/dev/null || echo "error")
    CREATE_STATUS=$(echo "$CREATE_RESULT" | tail -1)
    if [ "$CREATE_STATUS" = "200" ] || [ "$CREATE_STATUS" = "201" ]; then
      echo "  ✅ Dataset created: ${HF_USERNAME}/${BACKUP_DATASET} (private)"
    else
      echo "  ⚠️  Could not create dataset (HTTP $CREATE_STATUS). Create it manually:"
      echo "     https://huggingface.co/datasets/create"
    fi
  elif [ "$DATASET_CHECK" = "200" ]; then
    echo "  ✅ Dataset exists"
  else
    echo "  ⚠️  Could not check dataset (HTTP $DATASET_CHECK)"
  fi
  
  # Restore workspace
  echo "📦 Restoring workspace..."
  WORKSPACE="/home/node/.openclaw/workspace"
  GIT_USER_EMAIL="${WORKSPACE_GIT_USER:-openclaw@example.com}"
  GIT_USER_NAME="${WORKSPACE_GIT_NAME:-OpenClaw Bot}"
  
  cd "$WORKSPACE"
  if [ ! -d ".git" ]; then
    git init -q
    git remote add origin "$BACKUP_URL"
  else
    git remote set-url origin "$BACKUP_URL"
  fi
  
  git config user.email "$GIT_USER_EMAIL"
  git config user.name "$GIT_USER_NAME"
  
  if git fetch origin main 2>/dev/null; then
    git reset --hard origin/main 2>/dev/null && echo "  ✅ Workspace restored!"
  else
    echo "  ⚠️ No remote data yet, starting fresh."
  fi
  cd /
fi

# ── Restore persisted OpenClaw state (if present) ──
STATE_BACKUP_ROOT="/home/node/.openclaw/workspace/.huggingclaw-state/openclaw"
if [ -d "$STATE_BACKUP_ROOT" ]; then
  echo "🧠 Restoring OpenClaw state..."
  for source_path in "$STATE_BACKUP_ROOT"/*; do
    [ -e "$source_path" ] || continue
    name="$(basename "$source_path")"
    target_path="/home/node/.openclaw/${name}"

    rm -rf "$target_path"
    mkdir -p "$(dirname "$target_path")"
    cp -R "$source_path" "$target_path"
  done
  echo "  ✅ OpenClaw state restored"
fi

# ── Restore persisted WhatsApp credentials (if present) ──
WA_BACKUP_DIR="/home/node/.openclaw/workspace/.huggingclaw-state/credentials/whatsapp/default"
WA_CREDS_DIR="/home/node/.openclaw/credentials/whatsapp/default"
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ] && [ -d "$WA_BACKUP_DIR" ]; then
  WA_FILE_COUNT=$(find "$WA_BACKUP_DIR" -type f | wc -l | tr -d ' ')
  if [ "$WA_FILE_COUNT" -ge 2 ]; then
    echo "📱 Restoring WhatsApp credentials..."
    rm -rf "$WA_CREDS_DIR"
    mkdir -p "$(dirname "$WA_CREDS_DIR")"
    cp -R "$WA_BACKUP_DIR" "$WA_CREDS_DIR"
    chmod -R go-rwx /home/node/.openclaw/credentials/whatsapp 2>/dev/null || true
    echo "  ✅ WhatsApp credentials restored"
  else
    echo "  ⚠️  Saved WhatsApp credentials look incomplete (${WA_FILE_COUNT} files), skipping restore."
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
  }
}
CONFIGEOF
)

# Gateway token
CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.auth.token = \"$GATEWAY_TOKEN\"")

# Model configuration at top level
CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".agents.defaults.model = \"$LLM_MODEL\"")

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
    echo "⚠️  Custom provider skipped: set CUSTOM_PROVIDER_NAME, CUSTOM_BASE_URL, and CUSTOM_MODEL_ID together."
    CUSTOM_PROVIDER_OK=false
  fi

  case "$CUSTOM_PROVIDER_NORMALIZED" in
    anthropic|openai|openai-codex|google|google-vertex|deepseek|opencode|opencode-go|openrouter|kilocode|vercel-ai-gateway|zai|z-ai|z.ai|zhipu|moonshot|kimi-coding|minimax|qwen|modelstudio|xiaomi|volcengine|volcengine-plan|byteplus|byteplus-plan|qianfan|mistral|mistralai|xai|x-ai|nvidia|cohere|groq|together|huggingface|cerebras|venice|synthetic|github-copilot)
      echo "⚠️  Custom provider skipped: CUSTOM_PROVIDER_NAME='$CUSTOM_PROVIDER_NAME' conflicts with a built-in provider."
      CUSTOM_PROVIDER_OK=false
      ;;
  esac

  if [[ "$CUSTOM_BASE_URL_NORMALIZED" == */chat/completions ]] || [[ "$CUSTOM_BASE_URL_NORMALIZED" == */completions ]]; then
    echo "⚠️  Custom provider skipped: CUSTOM_BASE_URL should be the API base URL, not a completions endpoint."
    CUSTOM_PROVIDER_OK=false
  fi

  if ! [[ "$CUSTOM_CONTEXT_WINDOW" =~ ^[0-9]+$ ]] || ! [[ "$CUSTOM_MAX_TOKENS" =~ ^[0-9]+$ ]]; then
    echo "⚠️  Custom provider skipped: CUSTOM_CONTEXT_WINDOW and CUSTOM_MAX_TOKENS must be whole numbers."
    CUSTOM_PROVIDER_OK=false
  fi

  if [ "$CUSTOM_PROVIDER_OK" = "true" ]; then
    echo "🔧 Registering custom provider: $CUSTOM_PROVIDER_NAME → $CUSTOM_BASE_URL_NORMALIZED"
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
      echo "⚠️  Custom provider registered, but LLM_MODEL='$LLM_MODEL' does not start with '$CUSTOM_PROVIDER_NAME/'."
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
if [ -n "$BROWSER_EXECUTABLE_PATH" ] && [ -x "$BROWSER_EXECUTABLE_PATH" ]; then
  BROWSER_SHOULD_ENABLE=true
fi

if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq \
    ".browser = {
      \"enabled\": true,
      \"defaultProfile\": \"openclaw\",
      \"headless\": true,
      \"noSandbox\": true,
      \"executablePath\": \"$BROWSER_EXECUTABLE_PATH\"
    } | .agents.defaults.sandbox.browser.allowHostControl = true")
fi

# Control UI origin (allow HF Space URL for web UI access)
if [ -n "$SPACE_HOST" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.allowedOrigins = [\"https://${SPACE_HOST}\"]")
fi

# Disable device auth (pairing) for headless Docker — token-only auth
CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.dangerouslyDisableDeviceAuth = true")

# Password auth (optional — simpler alternative to token for casual users)
if [ -n "$OPENCLAW_PASSWORD" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.auth.mode = \"password\" | .gateway.auth.password = \"$OPENCLAW_PASSWORD\"")
fi

# Trusted proxies (optional — fixes "Proxy headers detected from untrusted address" on HF Spaces)
# Set TRUSTED_PROXIES as comma-separated IPs/CIDRs, e.g. "10.20.31.87,10.20.26.157"
# Loopback proxies stay trusted by default so the local dashboard reverse proxy works correctly.
if [ -n "$TRUSTED_PROXIES" ]; then
  PROXIES_JSON=$(echo "$TRUSTED_PROXIES" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.trustedProxies += $PROXIES_JSON | .gateway.trustedProxies |= unique")
fi

# Allowed origins (optional — lock down Control UI to specific URLs)
# Set ALLOWED_ORIGINS as comma-separated URLs, e.g. "https://your-space.hf.space"
if [ -n "$ALLOWED_ORIGINS" ]; then
  ORIGINS_JSON=$(echo "$ALLOWED_ORIGINS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.allowedOrigins = $ORIGINS_JSON")
fi

# Telegram (supports multiple user IDs, comma-separated)
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq '.plugins.entries.telegram = {"enabled": true}')
  export TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
  
  if [ -n "$TELEGRAM_USER_IDS" ]; then
    # Convert comma-separated IDs to JSON array
    IDS_JSON=$(echo "$TELEGRAM_USER_IDS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
    CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".channels.telegram = {\"dmPolicy\": \"allowlist\", \"allowFrom\": $IDS_JSON}")
  elif [ -n "$TELEGRAM_USER_ID" ]; then
    # Single user (backward compatible)
    CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".channels.telegram = {\"dmPolicy\": \"allowlist\", \"allowFrom\": [\"$TELEGRAM_USER_ID\"]}")
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
echo "  ┌──────────────────────────────────────────┐"
echo "  │  📋 Configuration Summary                │"
echo "  ├──────────────────────────────────────────┤"
printf "  │  %-40s │\n" "OpenClaw: $OPENCLAW_VERSION"
printf "  │  %-40s │\n" "Model: $LLM_MODEL"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
printf "  │  %-40s │\n" "Telegram: ✅ enabled"
else
printf "  │  %-40s │\n" "Telegram: ❌ not configured"
fi
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
printf "  │  %-40s │\n" "WhatsApp: ✅ enabled"
else
printf "  │  %-40s │\n" "WhatsApp: ❌ disabled"
fi
if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then
printf "  │  %-40s │\n" "Browser: ✅ ${BROWSER_EXECUTABLE_PATH}"
else
printf "  │  %-40s │\n" "Browser: ❌ unavailable"
fi
if [ -n "$HF_USERNAME" ] && [ -n "$HF_TOKEN" ]; then
printf "  │  %-40s │\n" "Backup: ✅ ${HF_USERNAME}/${BACKUP_DATASET:-huggingclaw-backup}"
else
printf "  │  %-40s │\n" "Backup: ❌ not configured"
fi
if [ -n "$OPENCLAW_PASSWORD" ]; then
printf "  │  %-40s │\n" "Auth: 🔑 password"
else
printf "  │  %-40s │\n" "Auth: 🔐 token"
fi
if [ -n "$SPACE_HOST" ]; then
printf "  │  %-40s │\n" "Control UI: https://${SPACE_HOST}/app"
printf "  │  %-40s │\n" "Dashboard: https://${SPACE_HOST}"
fi
SYNC_STATUS="❌ disabled"
if [ -n "$HF_USERNAME" ] && [ -n "$HF_TOKEN" ]; then
  SYNC_STATUS="✅ every ${SYNC_INTERVAL:-180}s"
fi
printf "  │  %-40s │\n" "Auto-sync: $SYNC_STATUS"
if [ -n "$WEBHOOK_URL" ]; then
printf "  │  %-40s │\n" "Webhooks: ✅ enabled"
fi
echo "  └──────────────────────────────────────────┘"
echo ""

# ── Trigger Webhook on Restart ──
if [ -n "$WEBHOOK_URL" ]; then
  echo "🔔 Sending restart webhook..."
  curl -s -X POST "$WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d '{"event":"restart", "status":"success", "message":"HuggingClaw gateway has started/restarted.", "model": "'"$LLM_MODEL"'"}' >/dev/null 2>&1 &
fi

# ── Trap SIGTERM for graceful shutdown ──
graceful_shutdown() {
  echo ""
  echo "🛑 Shutting down gracefully..."

  if [ -f "/home/node/app/workspace-sync.py" ]; then
    echo "💾 Saving OpenClaw state before exit..."
    python3 /home/node/app/workspace-sync.py --sync-once || \
      echo "  ⚠️ Could not complete shutdown sync"
  fi
  
  # Kill background processes
  kill $(jobs -p) 2>/dev/null
  echo "👋 Goodbye!"
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
        echo "  ✅ Managed browser ready"
        return 0
      fi
      sleep 2
    done

    echo "  ⚠️ Managed browser warm-up did not complete; first browser action may need a retry"
  ) &
}

# ── Start background services ──
export LLM_MODEL="$LLM_MODEL"
# 10. Start Health Server & Dashboard
node /home/node/app/health-server.js &
HEALTH_PID=$!

# ── Launch gateway ──
echo "🚀 Launching OpenClaw gateway on port 7860..."
echo ""

GATEWAY_ARGS=(gateway run --port 7860 --bind lan)
if [ "${GATEWAY_VERBOSE:-0}" = "1" ]; then
  GATEWAY_ARGS+=(--verbose)
  echo "🔎 Gateway verbose logging enabled (GATEWAY_VERBOSE=1)"
fi

openclaw "${GATEWAY_ARGS[@]}" 2>&1 | tee -a /home/node/.openclaw/gateway.log &
GATEWAY_PID=$!

# Wait a moment for startup errors
sleep 3
if ! kill -0 $GATEWAY_PID 2>/dev/null; then
  echo ""
  echo "❌ Gateway failed to start. Last 30 lines of log:"
  echo "────────────────────────────────────────────"
  tail -30 /home/node/.openclaw/gateway.log
  exit 1
fi

# 11. Start WhatsApp Guardian after the gateway is accepting connections
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  node /home/node/app/wa-guardian.js &
  GUARDIAN_PID=$!
  echo "🛡️ WhatsApp Guardian started (PID: $GUARDIAN_PID)"
fi

# 11.5 Warm up the managed browser so first browser actions have a live tab
warmup_browser

# 12. Start Workspace Sync after startup settles
python3 -u /home/node/app/workspace-sync.py &

# Wait for gateway (allows trap to fire)
wait $GATEWAY_PID

#!/bin/bash
set -e

# ════════════════════════════════════════════════════════════════
# HuggingClaw — OpenClaw Gateway for HF Spaces
# ════════════════════════════════════════════════════════════════

# ── Startup Banner ──
OPENCLAW_VERSION="${OPENCLAW_VERSION:-latest}"
WHATSAPP_ENABLED="${WHATSAPP_ENABLED:-false}"
WHATSAPP_ENABLED_NORMALIZED=$(printf '%s' "$WHATSAPP_ENABLED" | tr '[:upper:]' '[:lower:]')
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
restore_state_dir() {
  local name="$1"
  local source_dir="${STATE_BACKUP_ROOT}/${name}"
  local target_dir="/home/node/.openclaw/${name}"

  if [ ! -d "$source_dir" ]; then
    return
  fi

  echo "🧠 Restoring OpenClaw ${name} state..."
  rm -rf "$target_dir"
  mkdir -p "$(dirname "$target_dir")"
  cp -R "$source_dir" "$target_dir"
  echo "  ✅ ${name} restored"
}

restore_state_dir "agents"
restore_state_dir "memory"
restore_state_dir "extensions"

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

# ── Patch OpenClaw scope-clearing bug for headless HF auth ──
# OpenClaw can clear requested operator scopes after allowing a token-auth
# connection without device identity, which breaks the WhatsApp guardian's
# web.login.wait / channels.status calls on Spaces.
patch_openclaw_scope_bug() {
  local roots=(
    "/home/node/.openclaw/openclaw-app"
    "/usr/local/lib/node_modules/openclaw"
  )
  local target=""
  local updated=0

  for root in "${roots[@]}"; do
    [ -d "$root/dist" ] || continue
    target=$(find "$root/dist" -maxdepth 1 -type f -name 'gateway-cli-*.js' | head -n 1)
    [ -n "$target" ] || continue

    if grep -q 'return params.decision.kind !== "allow" || !params.controlUiAuthPolicy.allowBypass' "$target"; then
      perl -0pi -e 's@return params\.decision\.kind !== "allow" \|\| !params\.controlUiAuthPolicy\.allowBypass && !params\.preserveInsecureLocalControlUiScopes && \(params\.authMethod === "token" \|\| params\.authMethod === "password" \|\| params\.authMethod === "trusted-proxy" \|\| params\.trustedProxyAuthOk === true\);@return params.decision.kind !== "allow";@g' "$target"

      if grep -q 'return params.decision.kind !== "allow";' "$target"; then
        echo "🔧 Patched OpenClaw scope-clearing bug in $(basename "$target")"
        updated=1
        break
      fi
    fi
  done

  if [ "$updated" -eq 0 ]; then
    echo "⚠️  OpenClaw scope patch not applied (bundle format may have changed)"
  fi
}

patch_openclaw_scope_bug

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
  SYNC_STATUS="✅ every ${SYNC_INTERVAL:-600}s"
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
  
  # Commit any unsaved workspace changes
  if [ -d "/home/node/.openclaw/workspace/.git" ]; then
    echo "💾 Saving workspace before exit..."
    cd /home/node/.openclaw/workspace
    git add -A 2>/dev/null
    if ! git diff --cached --quiet 2>/dev/null; then
      TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      git commit -m "Shutdown sync ${TIMESTAMP}" 2>/dev/null
      git push origin main 2>/dev/null && echo "  ✅ Workspace saved!" || echo "  ⚠️ Push failed"
    else
      echo "  ✅ No unsaved changes"
    fi
  fi
  
  # Kill background processes
  kill $(jobs -p) 2>/dev/null
  echo "👋 Goodbye!"
  exit 0
}
trap graceful_shutdown SIGTERM SIGINT

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

# 12. Start Workspace Sync after startup settles
python3 -u /home/node/app/workspace-sync.py &

# Wait for gateway (allows trap to fire)
wait $GATEWAY_PID

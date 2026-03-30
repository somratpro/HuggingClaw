#!/bin/bash
set -e

# ════════════════════════════════════════════════════════════════
# HuggingClaw — OpenClaw Gateway for HF Spaces
# ════════════════════════════════════════════════════════════════

# ── Startup Banner ──
OPENCLAW_VERSION="${OPENCLAW_VERSION:-latest}"
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
if [ -z "$GATEWAY_TOKEN" ]; then
  ERRORS="${ERRORS}  ❌ GATEWAY_TOKEN is not set (generate: openssl rand -hex 32)\n"
fi
if [ -n "$ERRORS" ]; then
  echo "Missing required secrets:"
  echo -e "$ERRORS"
  echo "Add them in HF Spaces → Settings → Secrets"
  exit 1
fi

# ── Set LLM env based on provider ──
LLM_PROVIDER="${LLM_PROVIDER:-anthropic}"
LLM_MODEL="${LLM_MODEL:-anthropic/claude-haiku-4-5}"

case "$LLM_PROVIDER" in
  anthropic) export ANTHROPIC_API_KEY="$LLM_API_KEY" ;;
  openai)    export OPENAI_API_KEY="$LLM_API_KEY" ;;
  google)    export GOOGLE_API_KEY="$LLM_API_KEY" ;;
  *)         export LLM_API_KEY="$LLM_API_KEY" ;;
esac

# ── Setup directories ──
mkdir -p /home/node/.openclaw/agents/main/sessions
mkdir -p /home/node/.openclaw/credentials
mkdir -p /home/node/.openclaw/workspace
chmod 700 /home/node/.openclaw

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
      "allowInsecureAuth": true
    },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  },
  "channels": {},
  "plugins": {
    "entries": {}
  }
}
CONFIGEOF
)

# Gateway token + model
CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.auth.token = \"$GATEWAY_TOKEN\"")
CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".agents.defaults.model = \"$LLM_MODEL\"")

# Control UI origin (allow HF Space URL for web UI access)
if [ -n "$SPACE_HOST" ]; then
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.allowedOrigins = [\"https://${SPACE_HOST}\"]")
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

# Write config
echo "$CONFIG_JSON" > "/home/node/.openclaw/openclaw.json"

# ── Startup Summary ──
echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "  │  📋 Configuration Summary                │"
echo "  ├──────────────────────────────────────────┤"
printf "  │  %-40s │\n" "LLM: $LLM_PROVIDER"
printf "  │  %-40s │\n" "Model: $LLM_MODEL"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
printf "  │  %-40s │\n" "Telegram: ✅ enabled"
else
printf "  │  %-40s │\n" "Telegram: ❌ not configured"
fi
if [ -n "$HF_USERNAME" ] && [ -n "$HF_TOKEN" ]; then
printf "  │  %-40s │\n" "Backup: ✅ ${HF_USERNAME}/${BACKUP_DATASET:-huggingclaw-backup}"
else
printf "  │  %-40s │\n" "Backup: ❌ not configured"
fi
if [ -n "$SPACE_HOST" ]; then
printf "  │  %-40s │\n" "Keep-alive: ✅ every ${KEEP_ALIVE_INTERVAL:-300}s"
printf "  │  %-40s │\n" "Control UI: https://${SPACE_HOST}"
else
printf "  │  %-40s │\n" "Keep-alive: ⏸️  local mode"
fi
SYNC_STATUS="❌ disabled"
if [ -n "$HF_USERNAME" ] && [ -n "$HF_TOKEN" ]; then
  SYNC_STATUS="✅ every ${SYNC_INTERVAL:-600}s"
fi
printf "  │  %-40s │\n" "Auto-sync: $SYNC_STATUS"
echo "  └──────────────────────────────────────────┘"
echo ""

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
node /home/node/app/health-server.js &
/home/node/app/keep-alive.sh &
/home/node/app/workspace-sync.sh &

# ── Launch gateway ──
echo "🚀 Launching OpenClaw gateway on port 7860..."
echo ""
openclaw gateway run --port 7860 --bind lan --verbose &
GATEWAY_PID=$!

# Wait for gateway (allows trap to fire)
wait $GATEWAY_PID

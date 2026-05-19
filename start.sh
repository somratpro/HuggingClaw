#!/bin/bash
set -euo pipefail

umask 0077

# ════════════════════════════════════════════════════════════════
# HuggingClaw — OpenClaw Gateway for HF Spaces
# ════════════════════════════════════════════════════════════════

# ── Startup Banner ──
trim_var() {
  # Trim leading/trailing whitespace from a value.
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

hc_is_true() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

load_env_bundle() {
  # HUGGINGCLAW_ENV_BUNDLE is a single base64url-encoded JSON object generated
  # by /env-builder. Existing individual env vars win over bundled values.
  local bundle="${HUGGINGCLAW_ENV_BUNDLE:-${ENV_BUNDLE:-}}"
  [ -n "$bundle" ] || return 0
  eval "$(HUGGINGCLAW_ENV_BUNDLE="$bundle" python3 - <<'PYBUNDLE'
import base64, json, os, re, shlex, sys

raw = os.environ.get("HUGGINGCLAW_ENV_BUNDLE", "").strip()
try:
    if raw.startswith("{"):
        data = json.loads(raw)
    else:
        padded = raw + "=" * (-len(raw) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    if not isinstance(data, dict):
        raise ValueError("bundle must decode to a JSON object")
    for key, value in data.items():
        if not re.fullmatch(r"[A-Z_][A-Z0-9_]*", str(key)):
            continue
        if str(key) in {"HUGGINGCLAW_ENV_BUNDLE", "ENV_BUNDLE"}:
            continue
        if os.environ.get(str(key), ""):
            continue
        if value is None or isinstance(value, (dict, list)):
            continue
        print(f"export {key}={shlex.quote(str(value))}")
except Exception as exc:
    print(f"Warning: invalid HUGGINGCLAW_ENV_BUNDLE ignored: {exc}", file=sys.stderr)
PYBUNDLE
)"
}

load_env_bundle

# Normalize core env values so accidental surrounding spaces in HF Variables
# do not block updates or cause stale comparisons/merges.
LLM_MODEL="$(trim_var "${LLM_MODEL:-}")"
GATEWAY_TOKEN="$(trim_var "${GATEWAY_TOKEN:-}")"
OPENCLAW_PASSWORD="$(trim_var "${OPENCLAW_PASSWORD:-}")"
LLM_API_KEY="$(trim_var "${LLM_API_KEY:-}")"
CLOUDFLARE_PROXY_URL="$(trim_var "${CLOUDFLARE_PROXY_URL:-}")"

OPENCLAW_VERSION="${OPENCLAW_VERSION:-latest}"
APP_BASE="$(trim_var "${APP_BASE:-/app}")"
JUPYTER_BASE="$(trim_var "${JUPYTER_BASE:-/terminal}")"
PORT="$(trim_var "${PORT:-7861}")"
GATEWAY_PORT="$(trim_var "${GATEWAY_PORT:-7860}")"
JUPYTER_PORT="$(trim_var "${JUPYTER_PORT:-8888}")"
BACKUP_DATASET_NAME="$(trim_var "${BACKUP_DATASET_NAME:-${BACKUP_DATASET:-huggingclaw-backup}}")"
SPACE_AUTHOR_NAME="$(trim_var "${SPACE_AUTHOR_NAME:-}")"
SPACE_HOST="$(trim_var "${SPACE_HOST:-}")"
OPENCLAW_APP_DIR="/home/node/.openclaw/openclaw-app"
OPENCLAW_RUNTIME_VERSION=""
OPENCLAW_FILE_LOG_LEVEL_CONFIGURED=false
OPENCLAW_CONSOLE_LOG_LEVEL_CONFIGURED=false
OPENCLAW_CONSOLE_LOG_STYLE_CONFIGURED=false
WHATSAPP_ENABLED_CONFIGURED=false
[ "${OPENCLAW_FILE_LOG_LEVEL+x}" = "x" ] && OPENCLAW_FILE_LOG_LEVEL_CONFIGURED=true
[ "${OPENCLAW_CONSOLE_LOG_LEVEL+x}" = "x" ] && OPENCLAW_CONSOLE_LOG_LEVEL_CONFIGURED=true
[ "${OPENCLAW_CONSOLE_LOG_STYLE+x}" = "x" ] && OPENCLAW_CONSOLE_LOG_STYLE_CONFIGURED=true
[ "${WHATSAPP_ENABLED+x}" = "x" ] && WHATSAPP_ENABLED_CONFIGURED=true
WHATSAPP_ENABLED="${WHATSAPP_ENABLED:-false}"
WHATSAPP_ENABLED_NORMALIZED=$(printf '%s' "$WHATSAPP_ENABLED" | tr '[:upper:]' '[:lower:]')
DEV_MODE_RAW="${DEV_MODE:-false}"
DEV_MODE_NORMALIZED=$(printf '%s' "$DEV_MODE_RAW" | tr '[:upper:]' '[:lower:]')
DEV_MODE_ENABLED=false
if hc_is_true "$DEV_MODE_NORMALIZED"; then
  DEV_MODE_ENABLED=true
fi
SYNC_INTERVAL="$(trim_var "${SYNC_INTERVAL:-180}")"
DEVDATA_DATASET_NAME="$(trim_var "${DEVDATA_DATASET_NAME:-huggingclaw-devdata}")"
DEVDATA_SYNC_INTERVAL="$(trim_var "${DEVDATA_SYNC_INTERVAL:-180}")"
DEVDATA_RAW="$(trim_var "${DEVDATA:-on}")"
DEVDATA_NORMALIZED=$(printf '%s' "$DEVDATA_RAW" | tr '[:upper:]' '[:lower:]')
DEVDATA_ENABLED=true
if ! hc_is_true "$DEVDATA_NORMALIZED"; then
  DEVDATA_ENABLED=false
fi
# On HF Spaces, browser is disabled by default (no display server).
# To enable: set BROWSER_PLUGIN_MODE=enabled as an HF Space secret.
# WARNING: requires at least CPU Upgrade tier (2 vCPU / 16GB RAM).
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
echo "  ║     🦞 HuggingClaw + 💻 JupyterLab      ║"
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
  xai|x-ai)                     export XAI_API_KEY="$LLM_API_KEY" ;;
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

# Ensure OpenClaw provider discovery can see per-provider keys even when users
# configure only *_API_KEYS pools. Mirror first pool key into singular env.
promote_first_pool_key() {
  local singular_var="$1"
  local pool_var="$2"
  local singular_val="${!singular_var:-}"
  local pool_val="${!pool_var:-}"

  [ -n "$singular_val" ] && return 0
  [ -n "$pool_val" ] || return 0

  local first
  first=$(printf '%s' "$pool_val" | tr ',' '\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | awk 'NF{print; exit}')
  [ -n "$first" ] || return 0
  export "${singular_var}=$first"
}

promote_first_pool_key "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEYS"
promote_first_pool_key "OPENAI_API_KEY" "OPENAI_API_KEYS"
promote_first_pool_key "GEMINI_API_KEY" "GEMINI_API_KEYS"
promote_first_pool_key "GEMINI_API_KEY" "GOOGLE_API_KEYS"
promote_first_pool_key "DEEPSEEK_API_KEY" "DEEPSEEK_API_KEYS"
promote_first_pool_key "OPENROUTER_API_KEY" "OPENROUTER_API_KEYS"
promote_first_pool_key "KILOCODE_API_KEY" "KILOCODE_API_KEYS"
promote_first_pool_key "OPENCODE_API_KEY" "OPENCODE_API_KEYS"
promote_first_pool_key "ZAI_API_KEY" "ZAI_API_KEYS"
promote_first_pool_key "MOONSHOT_API_KEY" "MOONSHOT_API_KEYS"
promote_first_pool_key "MINIMAX_API_KEY" "MINIMAX_API_KEYS"
promote_first_pool_key "XIAOMI_API_KEY" "XIAOMI_API_KEYS"
promote_first_pool_key "VOLCANO_ENGINE_API_KEY" "VOLCANO_ENGINE_API_KEYS"
promote_first_pool_key "BYTEPLUS_API_KEY" "BYTEPLUS_API_KEYS"
promote_first_pool_key "QIANFAN_API_KEY" "QIANFAN_API_KEYS"
promote_first_pool_key "MODELSTUDIO_API_KEY" "MODELSTUDIO_API_KEYS"
promote_first_pool_key "KIMI_API_KEY" "KIMI_API_KEYS"
promote_first_pool_key "MISTRAL_API_KEY" "MISTRAL_API_KEYS"
promote_first_pool_key "XAI_API_KEY" "XAI_API_KEYS"
promote_first_pool_key "NVIDIA_API_KEY" "NVIDIA_API_KEYS"
promote_first_pool_key "GROQ_API_KEY" "GROQ_API_KEYS"
promote_first_pool_key "COHERE_API_KEY" "COHERE_API_KEYS"
promote_first_pool_key "TOGETHER_API_KEY" "TOGETHER_API_KEYS"
promote_first_pool_key "CEREBRAS_API_KEY" "CEREBRAS_API_KEYS"
promote_first_pool_key "VENICE_API_KEY" "VENICE_API_KEYS"
promote_first_pool_key "SYNTHETIC_API_KEY" "SYNTHETIC_API_KEYS"
promote_first_pool_key "COPILOT_GITHUB_TOKEN" "COPILOT_GITHUB_TOKENS"
promote_first_pool_key "AI_GATEWAY_API_KEY" "AI_GATEWAY_API_KEYS"

# kimi-coding uses Moonshot AI endpoint (api.moonshot.cn).
# If KIMI_API_KEY is set but MOONSHOT_API_KEY is not, mirror it so the
# multi-provider-key-rotator (which matches on api.moonshot.cn) injects it.
if [ -z "${MOONSHOT_API_KEY:-}" ] && [ -n "${KIMI_API_KEY:-}" ]; then
  export MOONSHOT_API_KEY="$KIMI_API_KEY"
fi
promote_first_pool_key "HUGGINGFACE_HUB_TOKEN" "HUGGINGFACE_HUB_TOKENS"

# Compatibility aliases for Google provider secrets some users already have.
if [ -z "${GEMINI_API_KEY:-}" ] && [ -n "${GOOGLE_API_KEY:-}" ]; then
  export GEMINI_API_KEY="$GOOGLE_API_KEY"
fi

# ── Setup directories ──
mkdir -p /home/node/.openclaw/agents/main/sessions
mkdir -p /home/node/.openclaw/credentials
mkdir -p /home/node/.openclaw/memory
mkdir -p /home/node/.openclaw/extensions
mkdir -p /home/node/.openclaw/workspace
mkdir -p /home/node/.local/bin /home/node/.local/lib /home/node/.npm-global
chmod 700 /home/node/.openclaw
chmod 700 /home/node/.openclaw/credentials

# User-installed packages are intentionally ephemeral in the container. Keep
# npm/pip installs in user-writable locations, make apt noninteractive,
# and persist only a tiny replay script in the synced workspace so packages
# are re-installed after restart.
export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-/home/node/.local}"
export npm_config_prefix="$NPM_CONFIG_PREFIX"
export PYTHONUSERBASE="${PYTHONUSERBASE:-/home/node/.local}"
export DEBIAN_FRONTEND="${DEBIAN_FRONTEND:-noninteractive}"
# Show current working directory in terminal prompt (JupyterLab terminals can
# otherwise display only "$" when PS1 is unset/minimal).
if [ -z "${PS1:-}" ] || [ "$PS1" = "$ " ]; then
  export PS1='\u@\h:\w\$ '
fi
STARTUP_FILE="/home/node/.openclaw/workspace/startup.sh"

# ── Restore workspace/state from HF Dataset ──
BACKUP_DATASET="${BACKUP_DATASET_NAME:-huggingclaw-backup}"
if [ -n "${HF_TOKEN:-}" ]; then
  echo "Restoring workspace from HF Dataset..."
  python3 /home/node/app/openclaw-sync.py restore || true
else
  echo "HF_TOKEN not set — running without dataset persistence."
fi

CLOUDFLARE_WORKERS_TOKEN="${CLOUDFLARE_WORKERS_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
export CLOUDFLARE_WORKERS_TOKEN
CF_PROXY_ENV_FILE="/tmp/huggingclaw-cloudflare-proxy.env"
if [ -n "${CLOUDFLARE_WORKERS_TOKEN:-}" ] || [ -n "${CLOUDFLARE_PROXY_URL:-}" ]; then
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

# Optional: explicitly expose provider model lists in Control UI when
# provider keys are configured. Format:
#   NVIDIA_MODELS=model1,model2
#   OPENAI_MODELS=gpt-4o-mini,gpt-4.1
# This helps when provider auto-discovery does not populate models reliably.
inject_provider_models_from_env() {
  local provider="$1"
  local models_env="$2"
  local key_env_single="$3"
  local key_env_pool="$4"
  local models_csv="${!models_env:-}"
  local single_key="${!key_env_single:-}"
  local pool_keys="${!key_env_pool:-}"

  # Only inject when both:
  # 1) provider has at least one configured key
  # 2) explicit model list env is provided
  if [ -z "$models_csv" ] || { [ -z "$single_key" ] && [ -z "$pool_keys" ]; }; then
    return 0
  fi

  local models_json
  models_json=$(printf '%s' "$models_csv" \
    | tr ',' '\n' \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
    | awk 'NF' \
    | jq -R . \
    | jq -s 'map({id: ., name: .}) | unique_by(.id)')

  CONFIG_JSON=$(jq \
    --arg provider "$provider" \
    --argjson models "$models_json" \
    'if .models.providers[$provider] then
       .models.mode = "merge"
       | .models.providers[$provider].models = $models
     else . end' <<<"$CONFIG_JSON")
}

# Built-in provider model envs (optional)
inject_provider_models_from_env "anthropic" "ANTHROPIC_MODELS" "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEYS"
inject_provider_models_from_env "openai" "OPENAI_MODELS" "OPENAI_API_KEY" "OPENAI_API_KEYS"
inject_provider_models_from_env "openai-codex" "OPENAI_MODELS" "OPENAI_API_KEY" "OPENAI_API_KEYS"
inject_provider_models_from_env "google" "GEMINI_MODELS" "GEMINI_API_KEY" "GEMINI_API_KEYS"
inject_provider_models_from_env "google-vertex" "GEMINI_MODELS" "GEMINI_API_KEY" "GEMINI_API_KEYS"
inject_provider_models_from_env "deepseek" "DEEPSEEK_MODELS" "DEEPSEEK_API_KEY" "DEEPSEEK_API_KEYS"
inject_provider_models_from_env "openrouter" "OPENROUTER_MODELS" "OPENROUTER_API_KEY" "OPENROUTER_API_KEYS"
inject_provider_models_from_env "kilocode" "KILOCODE_MODELS" "KILOCODE_API_KEY" "KILOCODE_API_KEYS"
inject_provider_models_from_env "opencode" "OPENCODE_MODELS" "OPENCODE_API_KEY" "OPENCODE_API_KEYS"
inject_provider_models_from_env "opencode-go" "OPENCODE_MODELS" "OPENCODE_API_KEY" "OPENCODE_API_KEYS"
inject_provider_models_from_env "zai" "ZAI_MODELS" "ZAI_API_KEY" "ZAI_API_KEYS"
inject_provider_models_from_env "z-ai" "ZAI_MODELS" "ZAI_API_KEY" "ZAI_API_KEYS"
inject_provider_models_from_env "z.ai" "ZAI_MODELS" "ZAI_API_KEY" "ZAI_API_KEYS"
inject_provider_models_from_env "zhipu" "ZAI_MODELS" "ZAI_API_KEY" "ZAI_API_KEYS"
inject_provider_models_from_env "moonshot" "MOONSHOT_MODELS" "MOONSHOT_API_KEY" "MOONSHOT_API_KEYS"
inject_provider_models_from_env "kimi-coding" "KIMI_MODELS" "KIMI_API_KEY" "KIMI_API_KEYS"
inject_provider_models_from_env "minimax" "MINIMAX_MODELS" "MINIMAX_API_KEY" "MINIMAX_API_KEYS"
inject_provider_models_from_env "modelstudio" "MODELSTUDIO_MODELS" "MODELSTUDIO_API_KEY" "MODELSTUDIO_API_KEYS"
inject_provider_models_from_env "qwen" "MODELSTUDIO_MODELS" "MODELSTUDIO_API_KEY" "MODELSTUDIO_API_KEYS"
inject_provider_models_from_env "xiaomi" "XIAOMI_MODELS" "XIAOMI_API_KEY" "XIAOMI_API_KEYS"
inject_provider_models_from_env "volcengine" "VOLCANO_ENGINE_MODELS" "VOLCANO_ENGINE_API_KEY" "VOLCANO_ENGINE_API_KEYS"
inject_provider_models_from_env "volcengine-plan" "VOLCANO_ENGINE_MODELS" "VOLCANO_ENGINE_API_KEY" "VOLCANO_ENGINE_API_KEYS"
inject_provider_models_from_env "byteplus" "BYTEPLUS_MODELS" "BYTEPLUS_API_KEY" "BYTEPLUS_API_KEYS"
inject_provider_models_from_env "byteplus-plan" "BYTEPLUS_MODELS" "BYTEPLUS_API_KEY" "BYTEPLUS_API_KEYS"
inject_provider_models_from_env "qianfan" "QIANFAN_MODELS" "QIANFAN_API_KEY" "QIANFAN_API_KEYS"
inject_provider_models_from_env "groq" "GROQ_MODELS" "GROQ_API_KEY" "GROQ_API_KEYS"
inject_provider_models_from_env "mistral" "MISTRAL_MODELS" "MISTRAL_API_KEY" "MISTRAL_API_KEYS"
inject_provider_models_from_env "mistralai" "MISTRAL_MODELS" "MISTRAL_API_KEY" "MISTRAL_API_KEYS"
inject_provider_models_from_env "xai" "XAI_MODELS" "XAI_API_KEY" "XAI_API_KEYS"
inject_provider_models_from_env "x-ai" "XAI_MODELS" "XAI_API_KEY" "XAI_API_KEYS"
inject_provider_models_from_env "nvidia" "NVIDIA_MODELS" "NVIDIA_API_KEY" "NVIDIA_API_KEYS"
inject_provider_models_from_env "cohere" "COHERE_MODELS" "COHERE_API_KEY" "COHERE_API_KEYS"
inject_provider_models_from_env "together" "TOGETHER_MODELS" "TOGETHER_API_KEY" "TOGETHER_API_KEYS"
inject_provider_models_from_env "cerebras" "CEREBRAS_MODELS" "CEREBRAS_API_KEY" "CEREBRAS_API_KEYS"
inject_provider_models_from_env "huggingface" "HUGGINGFACE_MODELS" "HUGGINGFACE_HUB_TOKEN" "HUGGINGFACE_HUB_TOKENS"
inject_provider_models_from_env "venice" "VENICE_MODELS" "VENICE_API_KEY" "VENICE_API_KEYS"
inject_provider_models_from_env "synthetic" "SYNTHETIC_MODELS" "SYNTHETIC_API_KEY" "SYNTHETIC_API_KEYS"
inject_provider_models_from_env "github-copilot" "GITHUB_COPILOT_MODELS" "COPILOT_GITHUB_TOKEN" "COPILOT_GITHUB_TOKENS"

# Browser configuration (managed local Chromium in HF/Docker)
BROWSER_EXECUTABLE_PATH=""
for candidate in /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
  if [ -x "$candidate" ]; then
    if file "$candidate" 2>/dev/null | grep -q "ELF"; then
      BROWSER_EXECUTABLE_PATH="$candidate"
      break
    fi
  fi
done
if [ -z "$BROWSER_EXECUTABLE_PATH" ]; then
  echo "Warning: No real Chromium binary found. Browser plugin will be disabled."
fi

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
#          Do not create a disabled acpx entry when the plugin is absent;
#          OpenClaw reports that as a config warning on HF Spaces.
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
BROWSER_DISABLED=true
if [ "$BROWSER_SHOULD_ENABLE" = "true" ]; then BROWSER_DISABLED=false; fi

CONFIG_JSON=$(jq \
  --argjson allow "$PLUGIN_ALLOW_JSON" \
  --argjson browserDisabled "$BROWSER_DISABLED" \
  '.plugins.allow = $allow
   | .plugins.deny = ["lmstudio","xai"]
   | .plugins.entries.lmstudio.enabled = false
   | .plugins.entries.xai.enabled = false
   | del(.plugins.entries.acpx)
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
       "executablePath": $execPath,
       "localLaunchTimeoutMs": 45000,
       "localCdpReadyTimeoutMs": 30000,
       "extraArgs": [
         "--disable-dev-shm-usage",
         "--disable-gpu",
         "--disable-setuid-sandbox",
         "--no-first-run",
         "--disable-background-networking",
         "--disable-sync",
         "--disable-translate",
         "--disable-notifications",
         "--disable-speech-api"
       ]
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

# Allowed origins (optional — add extra origins for external OpenClaw clients)
# Set ALLOWED_ORIGINS as comma-separated URLs, e.g. "https://app.openclaw.ai"
# These are MERGED with the Space host origin (which is always allowed).
if [ -n "${ALLOWED_ORIGINS:-}" ]; then
  ORIGINS_JSON=$(echo "$ALLOWED_ORIGINS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq ".gateway.controlUi.allowedOrigins += $ORIGINS_JSON | .gateway.controlUi.allowedOrigins |= unique")
fi

resolve_telegram_api_root() {
  local candidate="$(trim_var "${CLOUDFLARE_PROXY_URL:-}")"
  if [ -n "$candidate" ]; then
    case "$candidate" in
      http://*|https://*)
        printf '%s' "$candidate"
        return 0
        ;;
      *)
        echo "Warning: invalid CLOUDFLARE_PROXY_URL '$candidate' (must start with http:// or https://); falling back to direct Telegram API." >&2
        ;;
    esac
  fi
  printf '%s' "https://api.telegram.org"
}
TELEGRAM_API_ROOT="$(resolve_telegram_api_root)"


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
  
  CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg token "$CLEAN_TG_TOKEN" --arg proxy_url "$TELEGRAM_API_ROOT" '
    .channels.telegram.enabled = true
    | .channels.telegram.botToken = $token
    | .channels.telegram.commands.native = false
    | .channels.telegram.timeoutSeconds = 60
    | (if $proxy_url != "" then .channels.telegram.apiRoot = $proxy_url else . end)
    | .channels.telegram.retry = {
        "attempts": 5,
        "minDelayMs": 800,
        "maxDelayMs": 30000,
        "jitter": 0.2
      }
  ')
  
  if [ -n "${TELEGRAM_ALLOWED_USERS:-}" ]; then
    # Convert comma-separated IDs to JSON array (already safe — jq -R parses).
    IDS_JSON=$(echo "$TELEGRAM_ALLOWED_USERS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
    CONFIG_JSON=$(jq \
      --argjson ids "$IDS_JSON" \
      '.channels.telegram += {"dmPolicy": "allowlist", "allowFrom": $ids}' <<<"$CONFIG_JSON")
  elif [ -n "${TELEGRAM_USER_IDS:-}" ]; then
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
EXISTING_CONFIG="/home/node/.openclaw/openclaw.json"
WHATSAPP_CONFIG_ENABLED=false
if [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ]; then
  WHATSAPP_CONFIG_ENABLED=true
fi
if [ -f "$EXISTING_CONFIG" ]; then
  echo "Restored config found — patching required fields and runtime channel/plugin toggles..."
  PATCHED=$(jq \
    --arg token "$GATEWAY_TOKEN" \
    --arg model "$LLM_MODEL" \
    --arg fileLevel "$OPENCLAW_FILE_LOG_LEVEL" \
    --arg consoleLevel "$OPENCLAW_CONSOLE_LOG_LEVEL" \
    --arg consoleStyle "$OPENCLAW_CONSOLE_LOG_STYLE" \
    --argjson desired "$CONFIG_JSON" \
    --argjson fileLogConfigured "$OPENCLAW_FILE_LOG_LEVEL_CONFIGURED" \
    --argjson consoleLogConfigured "$OPENCLAW_CONSOLE_LOG_LEVEL_CONFIGURED" \
    --argjson consoleStyleConfigured "$OPENCLAW_CONSOLE_LOG_STYLE_CONFIGURED" \
    --argjson whatsappConfigured "$WHATSAPP_ENABLED_CONFIGURED" \
    --argjson whatsappEnabled "$WHATSAPP_CONFIG_ENABLED" \
    '(.channels.whatsapp // {}) as $existingWhatsapp
     | .gateway.auth.token = $token
     | .agents.defaults.model = $model
     | if $fileLogConfigured then .logging.level = $fileLevel else . end
     | if $consoleLogConfigured then .logging.consoleLevel = $consoleLevel else . end
     | if $consoleStyleConfigured then .logging.consoleStyle = $consoleStyle else . end
     | .channels = ((.channels // {}) * ($desired.channels // {}))
     | .plugins.allow = (((.plugins.allow // []) + ($desired.plugins.allow // [])) | unique)
     | .plugins.deny = (((.plugins.deny // []) + ($desired.plugins.deny // [])) | unique)
     | .plugins.entries = ((.plugins.entries // {}) * ($desired.plugins.entries // {}))
     | if $whatsappEnabled then
         ($desired.channels.whatsapp // {"dmPolicy": "pairing"}) as $desiredWhatsapp
         | .plugins.entries.whatsapp.enabled = true
         | .channels.whatsapp = (($existingWhatsapp * $desiredWhatsapp)
             | if ($existingWhatsapp | has("dmPolicy")) then .dmPolicy = $existingWhatsapp.dmPolicy else . end
             | if ($existingWhatsapp | has("allowFrom")) then .allowFrom = $existingWhatsapp.allowFrom else . end)
       elif $whatsappConfigured then
         .plugins.entries.whatsapp.enabled = false
         | del(.channels.whatsapp)
       else
         .
       end' \
    "$EXISTING_CONFIG" 2>/dev/null)

  if [ -n "$PATCHED" ]; then
    echo "$PATCHED" > "$EXISTING_CONFIG.tmp" \
      && mv "$EXISTING_CONFIG.tmp" "$EXISTING_CONFIG"
    echo "Config patched successfully."
  else
    echo "Patch failed — writing fresh config."
    echo "$CONFIG_JSON" > "$EXISTING_CONFIG"
  fi
else
  echo "No restored config — writing fresh config..."
  echo "$CONFIG_JSON" > "$EXISTING_CONFIG"
fi
chmod 600 "$EXISTING_CONFIG"

# ── Enable Gateway Preload Fixes ──
# This preload script keeps iframe embedding working on HF Spaces.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require /home/node/app/iframe-fix.cjs --require /home/node/app/multi-provider-key-rotator.cjs"

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
# HUGGINGCLAW_JUPYTER_ENABLED env var se override allow karo
# (env-builder "Enable Jupyter terminal" toggle yahi set karta hai)
if hc_is_true "${HUGGINGCLAW_JUPYTER_ENABLED:-false}"; then
  RUNTIME_JUPYTER_ENABLED=true
else
  RUNTIME_JUPYTER_ENABLED="$DEV_MODE_ENABLED"
fi
# Add user bin to PATH for jupyter-lab (installed in Dockerfile when DEV_MODE=true)
export PATH="$HOME/.local/bin:$PATH"

# Runtime install fallback: only attempt if DEV_MODE is enabled but install failed during build
if [ "$DEV_MODE_ENABLED" = "true" ] && ! python3 -c "import jupyterlab" >/dev/null 2>&1; then
  echo "DEV_MODE enabled but jupyter-lab is missing; attempting runtime install..."
  if python3 -m pip install --user --no-cache-dir --break-system-packages "jupyterlab>=4.2,<5" "tornado>=6.3" "ipywidgets>=8.1"; then
    echo "Runtime Jupyter install complete."
    python3 -c "from pathlib import Path; import shutil, jupyter_server; d=Path(jupyter_server.__file__).parent/'templates'; d.mkdir(parents=True,exist_ok=True); shutil.copyfile('/home/node/app/login.html', d/'login.html')" || true
  else
    echo "WARNING: Runtime Jupyter install failed; disabling terminal for this boot."
    RUNTIME_JUPYTER_ENABLED=false
  fi
fi
if [ "$RUNTIME_JUPYTER_ENABLED" = "true" ] && ! python3 -c "import jupyterlab" >/dev/null 2>&1; then
  echo "WARNING: jupyter-lab still unavailable; disabling terminal for this boot."
  RUNTIME_JUPYTER_ENABLED=false
fi
export HUGGINGCLAW_JUPYTER_ENABLED="$RUNTIME_JUPYTER_ENABLED"

if [ -n "${SPACE_HOST:-}" ]; then
  if [ "$RUNTIME_JUPYTER_ENABLED" = "true" ]; then
    echo "Routes    : /app/ (Control UI), /terminal/ (JupyterLab)"
  else
    echo "Routes    : /app/ (Control UI)"
  fi
  echo "Private   : open the Hugging Face App tab first; raw https://${SPACE_HOST}/... links can show HF 404 without the embedded Space session."
fi
echo ""

# ── Trigger Webhook on Restart ──
if [ -n "${WEBHOOK_URL:-}" ]; then
  WEBHOOK_BODY=$(jq -n \
    --arg model "$LLM_MODEL" \
    '{"event":"restart","status":"success","message":"HuggingClaw gateway has started/restarted.","model":$model}')
  curl -s -X POST "$WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d "$WEBHOOK_BODY" >/dev/null 2>&1 &
fi

# ── Trap SIGTERM for graceful shutdown ──
graceful_shutdown() {
  echo "Shutting down..."
  if [ -f "/home/node/app/openclaw-sync.py" ] && [ -n "${HF_TOKEN:-}" ]; then
    echo "Saving state before exit..."
    timeout 8s python3 /home/node/app/openclaw-sync.py sync-once-settled || \
      echo "Warning: could not complete settled shutdown sync"
    sleep 1
    python3 /home/node/app/openclaw-sync.py sync-once || \
      echo "Warning: could not complete final shutdown sync"
  elif [ -f "/home/node/app/openclaw-sync.py" ]; then
    echo "HF_TOKEN not set; skipping shutdown backup sync."
  fi
  kill $(jobs -p) 2>/dev/null
  exit 0
}
trap graceful_shutdown SIGTERM SIGINT

warmup_browser() {
  [ "$BROWSER_SHOULD_ENABLE" = "true" ] || return 0

  (
    sleep 8

    local attempt
    for attempt in 1 2 3 4 5 6; do
      if openclaw browser --browser-profile openclaw start >/dev/null 2>&1; then
        openclaw browser --browser-profile openclaw open about:blank >/dev/null 2>&1 || true
        echo "Managed browser ready."
        return 0
      fi
      sleep 5
    done

    echo "Warning: managed browser warm-up did not complete; first browser action may need a retry."
  ) &
}


# ── Start background services ──
export LLM_MODEL="$LLM_MODEL"

# ── Ensure key-rotator uses the correct HF token for huggingface.co calls ──
# NODE_OPTIONS preloads multi-provider-key-rotator.cjs into health-server.js.
# The rotator patches https.request and injects HUGGINGFACE_HUB_TOKEN (or
# falls back to LLM_API_KEY) for any call to huggingface.co — including the
# privacy-detection API call in detectSpacePrivacy(). If HUGGINGFACE_HUB_TOKEN
# is not set (user's LLM provider is not HuggingFace), the rotator falls back
# to LLM_API_KEY, which is the AI-provider key, NOT the HF owner token.
# This causes a 401 on /api/spaces/${SPACE_ID} → privacy detection always
# fails → SPACE_IS_PRIVATE stays true → public-space links never open in a
# new tab.
# Fix: seed HUGGINGFACE_HUB_TOKEN from HF_TOKEN when not already set.
# HF Spaces auto-injects HF_TOKEN as the space owner's token, so this is safe.
export HUGGINGFACE_HUB_TOKEN="${HUGGINGFACE_HUB_TOKEN:-${HF_TOKEN:-}}"

# 10. Start Health Server & Dashboard
node /home/node/app/health-server.js &
HEALTH_PID=$!

start_jupyter_once() {
  [ "$RUNTIME_JUPYTER_ENABLED" = "true" ] || return 0
  if [ -n "${JUPYTER_PID:-}" ] && kill -0 "$JUPYTER_PID" 2>/dev/null; then
    return 0
  fi

  # Security guard: refuse to start JupyterLab with the insecure default token.
  # JupyterLab exposes a full shell — a weak token is equivalent to no auth.
  if [ -z "${JUPYTER_TOKEN:-}" ] || [ "${JUPYTER_TOKEN}" = "huggingface" ]; then
    echo "ERROR: JUPYTER_TOKEN is unset or still set to the insecure default (\"huggingface\")." >&2
    echo "       JupyterLab grants full shell access. Set a strong, unique token in your Space secrets." >&2
    echo "       Hint:  openssl rand -hex 32" >&2
    echo "       DEV_MODE active but JupyterLab will NOT start until JUPYTER_TOKEN is changed." >&2
    return 1
  fi
  JUPYTER_ROOT_DIR="${JUPYTER_ROOT_DIR:-/home/node}"
  if [ "$JUPYTER_ROOT_DIR" = "/home/node/.openclaw/workspace" ] && [ "$DEVDATA_ENABLED" = "true" ]; then
    echo "Jupyter root was set to OpenClaw workspace; moving Jupyter root to /home/node/devdata to keep BACKUP and DEVDATA datasets separate."
    JUPYTER_ROOT_DIR="/home/node/devdata"
  fi
  mkdir -p "$JUPYTER_ROOT_DIR"
  export JUPYTER_ROOT_DIR
  if [ "$JUPYTER_ROOT_DIR" != "/home/node/app" ]; then
    if [ -L "$JUPYTER_ROOT_DIR/HuggingClaw" ] || [ ! -e "$JUPYTER_ROOT_DIR/HuggingClaw" ]; then
      ln -sfn /home/node/app "$JUPYTER_ROOT_DIR/HuggingClaw"
    fi
  fi
  if [ "$JUPYTER_ROOT_DIR" != "/home/node/.openclaw/workspace" ]; then
    if [ -L "$JUPYTER_ROOT_DIR/HuggingClaw-Workspace" ] || [ ! -e "$JUPYTER_ROOT_DIR/HuggingClaw-Workspace" ]; then
      ln -sfn /home/node/.openclaw/workspace "$JUPYTER_ROOT_DIR/HuggingClaw-Workspace"
    fi
  fi

  # Pre-create runtime directory
  mkdir -p "$JUPYTER_ROOT_DIR/.jupyter"

  echo "DEV_MODE enabled (${DEV_MODE_RAW}) — starting JupyterLab terminal on internal port 8888 (path: /terminal/) with root: $JUPYTER_ROOT_DIR"
  JUPYTER_LOG_FILE="/tmp/jupyterlab.log"
  
  # Use explicit Python to avoid PATH issues; set memory-friendly limits
  export PYTHONPATH=""
  python3 -m jupyterlab \
      --ip 127.0.0.1 \
      --port 8888 \
      --no-browser \
      --IdentityProvider.token="$JUPYTER_TOKEN" \
      --ServerApp.base_url=/terminal/ \
      --ServerApp.terminals_enabled=True \
      --ServerApp.terminado_settings='{"shell_command":["/bin/bash","-i"]}' \
      --ServerApp.allow_origin='*' \
      --ServerApp.allow_remote_access=True \
      --ServerApp.trust_xheaders=True \
      --ServerApp.tornado_settings="{'headers': {'Content-Security-Policy': 'frame-ancestors *'}}" \
      --IdentityProvider.cookie_options="{'SameSite': 'None', 'Secure': True}" \
      --ServerApp.disable_check_xsrf=True \
      --LabApp.news_url=None \
      --LabApp.check_for_updates_class=jupyterlab.NeverCheckForUpdate \
      --ServerApp.log_level=WARN \
      --ServerApp.root_dir="$JUPYTER_ROOT_DIR" \
      >> "$JUPYTER_LOG_FILE" 2>&1 &
  JUPYTER_PID=$!
  export JUPYTER_PID
  echo "JupyterLab started (PID: $JUPYTER_PID)"
}

# BUG FIX #3: DevData restore must happen BEFORE JupyterLab starts.
# The background jupyter-devdata-sync.py process is only launched AFTER the
# gateway is ready (20-90 s from now). If restore ran there, JupyterLab would
# already be live and the file writes would corrupt its runtime state → crash.
# Running --restore here (synchronous, before JupyterLab) solves that.
if [ "$RUNTIME_JUPYTER_ENABLED" = "true" ] && \
   [ "$DEVDATA_ENABLED" = "true" ] && \
   [ -n "${HF_TOKEN:-}" ] && \
   [ -f "/home/node/app/jupyter-devdata-sync.py" ] && \
   [ "${DEVDATA_DATASET_NAME:-huggingclaw-devdata}" != "${BACKUP_DATASET_NAME:-huggingclaw-backup}" ]; then
  echo "DevData  : restoring workspace from ${DEVDATA_DATASET_NAME:-huggingclaw-devdata} (before JupyterLab starts)..."
  python3 /home/node/app/jupyter-devdata-sync.py --restore || \
    echo "DevData  : restore warning (non-fatal); continuing startup."
fi

# Fix: reinstall jsonschema AFTER devdata restore — restore can overwrite a broken
# version from .local/lib/python3.11/site-packages into the workspace, causing
# JupyterLab to crash with a circular import error on every boot.
if [ "$DEV_MODE_ENABLED" = "true" ]; then
  if ! python3 -c "import jsonschema" >/dev/null 2>&1; then
    echo "DevData  : jsonschema broken after restore — reinstalling (circular import fix)..."
    python3 -m pip install --force-reinstall --no-cache-dir --break-system-packages "jsonschema>=4.0" >/dev/null 2>&1 || true
    echo "DevData  : jsonschema reinstall done."
  fi
fi

# 10.5. Start JupyterLab Terminal on internal port 8888 (DEV_MODE only)
# Accessible via /terminal/ path through the health-server proxy
if [ "$RUNTIME_JUPYTER_ENABLED" = "true" ]; then
  start_jupyter_once
else
  echo "Jupyter terminal disabled for this boot (DEV_MODE=${DEV_MODE_RAW})."
fi

if [ -n "${CLOUDFLARE_WORKERS_TOKEN:-}" ]; then
  echo "Setting up Cloudflare KeepAlive monitor..."
  python3 /home/node/app/cloudflare-keepalive-setup.py || true
fi

# ── Write shell capture wrappers to .bashrc ──
# The wrappers persist only install commands, not downloaded package files.
# On the next boot the synced workspace/startup.sh replays those commands.
if [ ! -f "$STARTUP_FILE" ]; then
  touch "$STARTUP_FILE"
  chmod +x "$STARTUP_FILE"
  echo "Created workspace/startup.sh"
fi
cat > /home/node/.bashrc << 'BASHRC'
export PATH="/home/node/.local/bin:$PATH"
export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-/home/node/.local}"
export npm_config_prefix="$NPM_CONFIG_PREFIX"
export PYTHONUSERBASE="${PYTHONUSERBASE:-/home/node/.local}"
export DEBIAN_FRONTEND="${DEBIAN_FRONTEND:-noninteractive}"
if [ -z "${PS1:-}" ] || [ "$PS1" = "$ " ]; then
  export PS1="\u@\h:\w\$ "
fi
STARTUP_FILE="/home/node/.openclaw/workspace/startup.sh"
_hc_append() {
  if [ "${HUGGINGCLAW_CAPTURE_DISABLE:-0}" = "1" ]; then
    return 0
  fi
  local line="$*"
  mkdir -p "$(dirname "$STARTUP_FILE")"
  touch "$STARTUP_FILE"
  chmod +x "$STARTUP_FILE" 2>/dev/null || true
  grep -qxF "$line" "$STARTUP_FILE" 2>/dev/null || echo "$line" >> "$STARTUP_FILE"
}
_hc_quote_args() {
  local quoted=()
  local arg
  for arg in "$@"; do
    printf -v arg '%q' "$arg"
    quoted+=("$arg")
  done
  printf '%s' "${quoted[*]}"
}
_hc_append_cmd() {
  local cmd="$1"
  shift
  local args
  args=$(_hc_quote_args "$@")
  if [ -n "$args" ]; then
    _hc_append "$cmd $args"
  else
    _hc_append "$cmd"
  fi
}
_hc_args_without_flags() {
  local out=()
  local arg
  for arg in "$@"; do
    case "$arg" in
      ''|-) ;;
      --*) ;;
      -*) ;;
      *) out+=("$arg") ;;
    esac
  done
  printf '%s\n' "${out[@]}"
}
_hc_has_install_targets() {
  local item
  while IFS= read -r item; do
    [ -n "$item" ] && return 0
  done <<EOF
$(_hc_args_without_flags "$@")
EOF
  return 1
}
_hc_allow_openclaw_plugins() {
  local config="/home/node/.openclaw/openclaw.json"
  [ -f "$config" ] || return 0

  local plugins=()
  local plugin
  for plugin in "$@"; do
    [ -n "$plugin" ] || continue
    [[ "$plugin" == -* ]] && continue
    plugins+=("$plugin")
    if [[ "$plugin" == @openclaw/* ]]; then
      plugins+=("${plugin#@openclaw/}")
    fi
  done
  [ "${#plugins[@]}" -gt 0 ] || return 0

  local plugins_json
  plugins_json=$(printf '%s\n' "${plugins[@]}" | jq -R 'select(length > 0)' | jq -s 'unique') || return 0
  jq --argjson plugins "$plugins_json" \
    '.plugins.allow = (((.plugins.allow // []) + $plugins) | unique)' \
    "$config" > "$config.tmp" && mv "$config.tmp" "$config"
}
_hc_has_arg() {
  local needle="$1"
  shift
  local arg
  for arg in "$@"; do
    [ "$arg" = "$needle" ] && return 0
  done
  return 1
}
_hc_can_sudo_apt() {
  command -v sudo >/dev/null 2>&1 && sudo -n apt-get --version >/dev/null 2>&1
}
_hc_apt_install() {
  if [ "$(id -u)" -eq 0 ]; then
    command apt-get update && command apt-get install -y "$@"
  elif _hc_can_sudo_apt; then
    sudo apt-get update && sudo apt-get install -y "$@"
  else
    echo "Error: apt install needs root. Rebuild with the latest HuggingClaw image or add packages to Dockerfile." >&2
    return 1
  fi
}
apt-get() {
  case "${1:-}" in
    install)
      shift
      _hc_apt_install "$@"
      local rc=$?
      if [ $rc -eq 0 ]; then
        _hc_has_install_targets "$@" && _hc_append_cmd "sudo apt-get update && sudo apt-get install -y" "$@"
      fi
      return $rc
      ;;
    update)
      if [ "$(id -u)" -eq 0 ]; then
        command apt-get "$@"
      elif _hc_can_sudo_apt; then
        sudo apt-get "$@"
      else
        command apt-get "$@"
      fi
      return $?
      ;;
    *)
      command apt-get "$@"
      return $?
      ;;
  esac
}
apt() {
  case "${1:-}" in
    install)
      shift
      _hc_apt_install "$@"
      local rc=$?
      if [ $rc -eq 0 ]; then
        _hc_has_install_targets "$@" && _hc_append_cmd "sudo apt-get update && sudo apt-get install -y" "$@"
      fi
      return $rc
      ;;
    update)
      if [ "$(id -u)" -eq 0 ]; then
        command apt "$@"
      elif _hc_can_sudo_apt; then
        sudo apt "$@"
      else
        command apt "$@"
      fi
      return $?
      ;;
    *)
      command apt "$@"
      return $?
      ;;
  esac
}
pip() {
  if [ "${1:-}" = "install" ] && [ -z "${VIRTUAL_ENV:-}" ] && ! _hc_has_arg --user "$@" && ! _hc_has_arg --prefix "$@"; then
    command pip install --user --break-system-packages "${@:2}"
  else
    command pip "$@"
  fi
  local rc=$?
  # Skip capture when -r/--requirement is used: the requirements file won't exist on next boot
  if [ $rc -eq 0 ] && [ "${1:-}" = "install" ] \
      && ! _hc_has_arg -r "${@:2}" && ! _hc_has_arg --requirement "${@:2}" \
      && _hc_has_install_targets "${@:2}"; then
    _hc_append_cmd "python3 -m pip install --user" "${@:2}"
  fi
  return $rc
}
pip3() {
  if [ "${1:-}" = "install" ] && [ -z "${VIRTUAL_ENV:-}" ] && ! _hc_has_arg --user "$@" && ! _hc_has_arg --prefix "$@"; then
    command pip3 install --user --break-system-packages "${@:2}"
  else
    command pip3 "$@"
  fi
  local rc=$?
  if [ $rc -eq 0 ] && [ "${1:-}" = "install" ] \
      && ! _hc_has_arg -r "${@:2}" && ! _hc_has_arg --requirement "${@:2}" \
      && _hc_has_install_targets "${@:2}"; then
    _hc_append_cmd "python3 -m pip install --user" "${@:2}"
  fi
  return $rc
}
python() {
  if [ "${1:-}" = "-m" ] && [ "${2:-}" = "pip" ] && [ "${3:-}" = "install" ] && [ -z "${VIRTUAL_ENV:-}" ] && ! _hc_has_arg --user "${@:3}" && ! _hc_has_arg --prefix "${@:3}"; then
    command python -m pip install --user --break-system-packages "${@:4}"
  else
    command python "$@"
  fi
  local rc=$?
  if [ $rc -eq 0 ] && [ "${1:-}" = "-m" ] && [ "${2:-}" = "pip" ] && [ "${3:-}" = "install" ] \
      && ! _hc_has_arg -r "${@:4}" && ! _hc_has_arg --requirement "${@:4}" \
      && _hc_has_install_targets "${@:4}"; then
    _hc_append_cmd "python3 -m pip install --user" "${@:4}"
  fi
  return $rc
}
python3() {
  if [ "${1:-}" = "-m" ] && [ "${2:-}" = "pip" ] && [ "${3:-}" = "install" ] && [ -z "${VIRTUAL_ENV:-}" ] && ! _hc_has_arg --user "${@:3}" && ! _hc_has_arg --prefix "${@:3}"; then
    command python3 -m pip install --user --break-system-packages "${@:4}"
  else
    command python3 "$@"
  fi
  local rc=$?
  if [ $rc -eq 0 ] && [ "${1:-}" = "-m" ] && [ "${2:-}" = "pip" ] && [ "${3:-}" = "install" ] \
      && ! _hc_has_arg -r "${@:4}" && ! _hc_has_arg --requirement "${@:4}" \
      && _hc_has_install_targets "${@:4}"; then
    _hc_append_cmd "python3 -m pip install --user" "${@:4}"
  fi
  return $rc
}
npm() {
  command npm "$@"
  local rc=$?
  if [ $rc -eq 0 ] && { [ "${1:-}" = "install" ] || [ "${1:-}" = "i" ]; } && { [ "${2:-}" = "-g" ] || [ "${2:-}" = "--global" ]; } && _hc_has_install_targets "${@:3}"; then
    _hc_append_cmd "npm install -g" "${@:3}"
  fi
  return $rc
}
openclaw() {
  command openclaw "$@"
  local rc=$?
  if [ $rc -eq 0 ] && [ "${1:-}" = "plugins" ] && [ "${2:-}" = "install" ] && _hc_has_install_targets "${@:3}"; then
    _hc_allow_openclaw_plugins "${@:3}"
    _hc_append_cmd "openclaw plugins install" "${@:3}"
  fi
  return $rc
}
# uv pip install — increasingly popular fast pip replacement
uv() {
  command uv "$@"
  local rc=$?
  # Only capture: uv pip install ... (not uv pip sync, uv add, etc.)
  # Skip if -r/--requirements flag present (file won't exist on next boot)
  if [ $rc -eq 0 ] && [ "${1:-}" = "pip" ] && [ "${2:-}" = "install" ] \
      && ! _hc_has_arg -r "${@:3}" && ! _hc_has_arg --requirements "${@:3}" \
      && _hc_has_install_targets "${@:3}"; then
    _hc_append_cmd "uv pip install" "${@:3}"
  fi
  return $rc
}
# pipx — isolated tool installs
pipx() {
  command pipx "$@"
  local rc=$?
  if [ $rc -eq 0 ] && [ "${1:-}" = "install" ] && _hc_has_install_targets "${@:2}"; then
    _hc_append_cmd "pipx install" "${@:2}"
  fi
  return $rc
}
BASHRC
cat > /home/node/.profile <<'PROFILE'
[ -n "${BASH_VERSION:-}" ] && [ -f ~/.bashrc ] && . ~/.bashrc
PROFILE
echo "Shell capture wrappers ready."

# ── Re-install previously installed plugins ──
EXISTING_CONFIG="/home/node/.openclaw/openclaw.json"
if [ -f "$EXISTING_CONFIG" ]; then
  INSTALLS=$(jq -r '.plugins.installs // {} | keys[]' "$EXISTING_CONFIG" 2>/dev/null || echo "")
  if [ -n "$INSTALLS" ]; then
    echo "Re-installing plugins from config..."
    while IFS= read -r pkg; do
      [ -z "$pkg" ] && continue
      # Try short name first, then @openclaw/ prefix
      if openclaw plugins install "$pkg" 2>/dev/null; then
        echo "  Installed: $pkg"
      elif openclaw plugins install "@openclaw/$pkg" 2>/dev/null; then
        echo "  Installed: @openclaw/$pkg"
      else
        echo "  Warning: could not install $pkg"
      fi
    done <<< "$INSTALLS"
    echo "Plugins done."
  fi
fi

# ── Startup command runner ──
# Runs user-provided boot commands one by one so failures are visible in logs.
# By default failures are logged and boot continues; set
# HUGGINGCLAW_STARTUP_STRICT=true to fail the Space startup on any error.
HC_STARTUP_FAILURES=0
HC_STARTUP_STRICT_NORMALIZED=$(printf '%s' "${HUGGINGCLAW_STARTUP_STRICT:-false}" | tr '[:upper:]' '[:lower:]')
hc_run_startup_command() {
  local source_label="$1"
  local command_text="$2"
  [ -n "$command_text" ] || return 0

  echo "[startup:${source_label}] $command_text"
  set +e
  HUGGINGCLAW_CAPTURE_DISABLE=1 bash -lc "$command_text"
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "[startup:${source_label}] ok"
    return 0
  fi

  HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
  echo "ERROR: startup command failed (${source_label}, exit ${rc}): $command_text" >&2
  return "$rc"
}

hc_run_startup_script() {
  local source_label="$1"
  local script_text="$2"
  [ -n "$script_text" ] || return 0

  local script_file
  script_file=$(mktemp "/tmp/huggingclaw-startup-${source_label//[^A-Za-z0-9_.-]/_}.XXXXXX.sh")
  {
    # Load HuggingClaw's install wrappers for env-provided scripts too, so
    # `apt install`, `pip install`, `npm install -g`, and OpenClaw plugin
    # installs behave the same way as they do in the interactive shell.
    echo 'export HUGGINGCLAW_CAPTURE_DISABLE=1'
    echo '[ -f /home/node/.bashrc ] && . /home/node/.bashrc'
    printf '%s\n' "$script_text"
  } > "$script_file"
  chmod 700 "$script_file"

  echo "[startup:${source_label}] running script (${script_file})"
  set +e
  bash "$script_file"
  local rc=$?
  set -e
  rm -f "$script_file"

  if [ "$rc" -eq 0 ]; then
    echo "[startup:${source_label}] ok"
    return 0
  fi

  HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
  echo "ERROR: startup script failed (${source_label}, exit ${rc})" >&2
  return "$rc"
}
hc_run_startup_script_b64() {
  local source_label="$1"
  local encoded_script="$2"
  [ -n "$encoded_script" ] || return 0

  local script_text
  if ! script_text=$(printf '%s' "$encoded_script" | base64 -d 2>/dev/null); then
    HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
    echo "ERROR: startup script base64 decode failed (${source_label})" >&2
    return 1
  fi

  hc_run_startup_script "$source_label" "$script_text"
}


hc_run_startup_auto() {
  local source_label="$1"
  local payload="$2"
  [ -n "$payload" ] || return 0

  if [[ "$payload" == base64:* ]]; then
    hc_run_startup_script_b64 "$source_label" "${payload#base64:}"
  elif [[ "$payload" == b64:* ]]; then
    hc_run_startup_script_b64 "$source_label" "${payload#b64:}"
  else
    hc_run_startup_script "$source_label" "$payload"
  fi
}

hc_run_command_block() {
  local source_label="$1"
  local command_block="$2"
  local line
  local index=0

  while IFS= read -r line || [ -n "$line" ]; do
    # Skip blank lines and comments so multi-line env vars can be documented.
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    index=$((index + 1))
    hc_run_startup_command "${source_label}[${index}]" "$line" || true
  done <<< "$command_block"
}

sync_installed_plugins_into_allow() {
  local config="/home/node/.openclaw/openclaw.json"
  [ -f "$config" ] || return 0

  local patched
  patched=$(jq '
    (.plugins.installs // {}) as $installs
    | ($installs | keys) as $installed
    | ($installed | map(if startswith("@openclaw/") then sub("^@openclaw/"; "") else . end)) as $short
    | .plugins.allow = (((.plugins.allow // []) + $installed + $short) | unique)
  ' "$config" 2>/dev/null) || {
    echo "Warning: could not sync installed plugins into plugins.allow"
    return 0
  }

  echo "$patched" > "$config.tmp" && mv "$config.tmp" "$config"
}

hc_finish_startup_commands() {
  if [ "$HC_STARTUP_FAILURES" -gt 0 ]; then
    echo "ERROR: ${HC_STARTUP_FAILURES} startup command(s) failed. Check the log lines above." >&2
    if [ "$HC_STARTUP_STRICT_NORMALIZED" = "true" ] || [ "$HC_STARTUP_STRICT_NORMALIZED" = "1" ] || [ "$HC_STARTUP_STRICT_NORMALIZED" = "yes" ]; then
      echo "ERROR: HUGGINGCLAW_STARTUP_STRICT=true, stopping startup." >&2
      exit 1
    fi
  fi
  return 0
}

# ── Optional package install lists from HF Variables/Secrets ──
# These install package names every boot without persisting package files.
# Use them when you prefer HF Variables over editing workspace/startup.sh.
if [ -n "${HUGGINGCLAW_APT_PACKAGES:-}" ]; then
  echo "Installing apt packages from HUGGINGCLAW_APT_PACKAGES..."
  read -r -a HC_APT_PACKAGES <<< "$HUGGINGCLAW_APT_PACKAGES"
  if command -v sudo >/dev/null 2>&1; then
    if sudo apt-get update && sudo apt-get install -y "${HC_APT_PACKAGES[@]}"; then
      echo "HUGGINGCLAW_APT_PACKAGES install complete."
    else
      HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
      echo "ERROR: HUGGINGCLAW_APT_PACKAGES install failed: ${HUGGINGCLAW_APT_PACKAGES}" >&2
    fi
  else
    HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
    echo "ERROR: sudo is unavailable; HUGGINGCLAW_APT_PACKAGES install skipped" >&2
  fi
fi
if [ -n "${HUGGINGCLAW_PIP_PACKAGES:-}" ]; then
  echo "Installing Python packages from HUGGINGCLAW_PIP_PACKAGES..."
  read -r -a HC_PIP_PACKAGES <<< "$HUGGINGCLAW_PIP_PACKAGES"
  if python3 -m pip install --user --break-system-packages "${HC_PIP_PACKAGES[@]}"; then
    echo "HUGGINGCLAW_PIP_PACKAGES install complete."
  else
    HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
    echo "ERROR: HUGGINGCLAW_PIP_PACKAGES install failed: ${HUGGINGCLAW_PIP_PACKAGES}" >&2
  fi
fi
if [ -n "${HUGGINGCLAW_NPM_PACKAGES:-}" ]; then
  echo "Installing global npm packages from HUGGINGCLAW_NPM_PACKAGES..."
  read -r -a HC_NPM_PACKAGES <<< "$HUGGINGCLAW_NPM_PACKAGES"
  if npm install -g "${HC_NPM_PACKAGES[@]}"; then
    echo "HUGGINGCLAW_NPM_PACKAGES install complete."
  else
    HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
    echo "ERROR: HUGGINGCLAW_NPM_PACKAGES install failed: ${HUGGINGCLAW_NPM_PACKAGES}" >&2
  fi
fi
if [ -n "${HUGGINGCLAW_OPENCLAW_PLUGINS:-}" ]; then
  echo "Installing OpenClaw plugins from HUGGINGCLAW_OPENCLAW_PLUGINS..."
  read -r -a HC_OPENCLAW_PLUGINS <<< "$HUGGINGCLAW_OPENCLAW_PLUGINS"
  if openclaw plugins install "${HC_OPENCLAW_PLUGINS[@]}"; then
    echo "HUGGINGCLAW_OPENCLAW_PLUGINS install complete."
  else
    HC_STARTUP_FAILURES=$((HC_STARTUP_FAILURES + 1))
    echo "ERROR: HUGGINGCLAW_OPENCLAW_PLUGINS install failed: ${HUGGINGCLAW_OPENCLAW_PLUGINS}" >&2
  fi
fi

# ── Fix config before running startup commands ──
if [ "${AUTO_DOCTOR:-false}" = "true" ]; then
  openclaw doctor --fix || true
fi

# ── Arbitrary startup commands from HF Variables/Secrets ──
# Recommended: use one variable, HUGGINGCLAW_RUN, as a full bash script. If the
# value starts with base64: or b64:, the rest is decoded and run as the script.
# Legacy granular HUGGINGCLAW_STARTUP_* variables are still supported below.
if [ -n "${HUGGINGCLAW_RUN:-}" ]; then
  hc_run_startup_auto "HUGGINGCLAW_RUN" "$HUGGINGCLAW_RUN" || true
fi
if [ -n "${HUGGINGCLAW_STARTUP_COMMANDS:-}" ]; then
  echo "Running commands from HUGGINGCLAW_STARTUP_COMMANDS..."
  hc_run_command_block "HUGGINGCLAW_STARTUP_COMMANDS" "$HUGGINGCLAW_STARTUP_COMMANDS"
fi
for HC_STARTUP_INDEX in $(seq 1 100); do
  HC_STARTUP_VAR="HUGGINGCLAW_STARTUP_COMMAND_${HC_STARTUP_INDEX}"
  if [ -n "${!HC_STARTUP_VAR:-}" ]; then
    hc_run_startup_command "$HC_STARTUP_VAR" "${!HC_STARTUP_VAR}" || true
  fi
done
if [ -n "${HUGGINGCLAW_STARTUP_SCRIPT:-}" ]; then
  hc_run_startup_script "HUGGINGCLAW_STARTUP_SCRIPT" "$HUGGINGCLAW_STARTUP_SCRIPT" || true
fi
if [ -n "${HUGGINGCLAW_STARTUP_SCRIPT_B64:-}" ]; then
  hc_run_startup_script_b64 "HUGGINGCLAW_STARTUP_SCRIPT_B64" "$HUGGINGCLAW_STARTUP_SCRIPT_B64" || true
fi
for HC_STARTUP_INDEX in $(seq 1 20); do
  HC_STARTUP_VAR="HUGGINGCLAW_STARTUP_SCRIPT_B64_${HC_STARTUP_INDEX}"
  if [ -n "${!HC_STARTUP_VAR:-}" ]; then
    hc_run_startup_script_b64 "$HC_STARTUP_VAR" "${!HC_STARTUP_VAR}" || true
  fi
done

# ── Run workspace startup script ──
STARTUP_FILE="/home/node/.openclaw/workspace/startup.sh"
if [ ! -f "$STARTUP_FILE" ]; then
  touch "$STARTUP_FILE"
  chmod +x "$STARTUP_FILE"
  echo "Created workspace/startup.sh"
fi
if [ -s "$STARTUP_FILE" ]; then
  echo "Running workspace/startup.sh script..."
  hc_run_startup_script "workspace/startup.sh" "$(cat "$STARTUP_FILE")" || true
  echo "Workspace startup script complete."
fi
hc_finish_startup_commands
sync_installed_plugins_into_allow

# ── Launch gateway ──
GATEWAY_RESTART_DELAY="${GATEWAY_RESTART_DELAY:-2}"
GATEWAY_MAX_RESTARTS="${GATEWAY_MAX_RESTARTS:-0}"
GATEWAY_RESTART_COUNT=0
SYNC_LOOP_PID=""
GUARDIAN_PID=""

sync_before_gateway_restart() {
  [ -n "${HF_TOKEN:-}" ] || return 0
  [ -f "/home/node/app/openclaw-sync.py" ] || return 0

  echo "Gateway stopped; saving latest OpenClaw state before restart..."
  python3 /home/node/app/openclaw-sync.py sync-once-settled || \
    echo "Warning: could not sync settled state before gateway restart"
}

start_background_devdata_sync() {
  if [ "$DEV_MODE_ENABLED" != "true" ]; then
    return 0
  fi
  if [ "$DEVDATA_ENABLED" != "true" ]; then
    echo "DevData  : disabled by DEVDATA=${DEVDATA_RAW}"
    return 0
  fi
  if [ -z "${HF_TOKEN:-}" ]; then
    echo "DevData  : disabled (HF_TOKEN missing)"
    return 0
  fi
  if [ "${DEVDATA_DATASET_NAME:-huggingclaw-devdata}" = "${BACKUP_DATASET_NAME:-huggingclaw-backup}" ]; then
    echo "DevData  : disabled (DEVDATA_DATASET_NAME must be separate from BACKUP_DATASET_NAME)"
    return 0
  fi
  if [ ! -f "/home/node/app/jupyter-devdata-sync.py" ]; then
    echo "DevData  : script missing; skipped"
    return 0
  fi
  # BUG FIX #1: Guard against spawning a second devdata-sync process on every
  # gateway restart. Without this check, each restart launched a fresh
  # jupyter-devdata-sync.py which called restore_once() while JupyterLab was
  # already running, corrupting its runtime state and killing it.
  if [ -n "${DEVDATA_SYNC_PID:-}" ] && kill -0 "$DEVDATA_SYNC_PID" 2>/dev/null; then
    return 0
  fi
  echo "DevData  : enabled (dataset=${DEVDATA_DATASET_NAME:-huggingclaw-devdata})"
  python3 -u /home/node/app/jupyter-devdata-sync.py >> /tmp/devdata-sync.log 2>&1 &
  DEVDATA_SYNC_PID=$!
}

start_background_sync_once() {
  [ -n "${HF_TOKEN:-}" ] || return 0

  if [ -n "$SYNC_LOOP_PID" ] && kill -0 "$SYNC_LOOP_PID" 2>/dev/null; then
    return 0
  fi

  python3 -u /home/node/app/openclaw-sync.py loop >> /tmp/workspace-sync.log 2>&1 &
  SYNC_LOOP_PID=$!
}

start_guardian_once() {
  [ "$WHATSAPP_ENABLED_NORMALIZED" = "true" ] || return 0

  if [ -n "$GUARDIAN_PID" ] && kill -0 "$GUARDIAN_PID" 2>/dev/null; then
    return 0
  fi

  node /home/node/app/wa-guardian.js &
  GUARDIAN_PID=$!
  echo "WhatsApp Guardian started (PID: $GUARDIAN_PID)"
}

# ── Start D-Bus session (once, before gateway loop) ──
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  if command -v dbus-launch >/dev/null 2>&1; then
    eval "$(dbus-launch --sh-syntax 2>/dev/null)" || true
    export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-disabled:}"
  else
    export DBUS_SESSION_BUS_ADDRESS="disabled:"
  fi
fi

while true; do
  # Check health-server process - restart if died unexpectedly
  if [ -n "${HEALTH_PID:-}" ] && ! kill -0 "$HEALTH_PID" 2>/dev/null; then
    echo "Warning: health-server exited (PID $HEALTH_PID dead); restarting..."
    node /home/node/app/health-server.js &
    HEALTH_PID=$!
    echo "Health server restarted (PID: $HEALTH_PID)"
  fi

  # Check JupyterLab process - restart if died unexpectedly
  if [ "$RUNTIME_JUPYTER_ENABLED" = "true" ]; then
    if [ -n "${JUPYTER_PID:-}" ]; then
      if ! kill -0 "$JUPYTER_PID" 2>/dev/null; then
        echo "Warning: JupyterLab exited (PID $JUPYTER_PID dead); checking log..."
        tail -5 /tmp/jupyterlab.log 2>/dev/null || echo "No log file"
        echo "Attempting JupyterLab restart..."
        unset JUPYTER_PID
        start_jupyter_once
      fi
    else
      # First start
      start_jupyter_once
    fi
  fi

  if [ "${AUTO_DOCTOR:-false}" = "true" ]; then
    openclaw doctor --fix || true
  fi
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
    if [ "$DEV_MODE_ENABLED" = "true" ]; then
      echo "Gateway failed — DEV_MODE active, retrying in 10s..."
      sleep 10
      continue
    else
      echo "Gateway failed — exiting."
      exit 1
    fi
  fi

  # 11. Start WhatsApp Guardian after the gateway is accepting connections
  start_guardian_once

  # ── Silence D-Bus errors for headless Chromium ──
  if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
    if command -v dbus-launch >/dev/null 2>&1; then
      eval "$(dbus-launch --sh-syntax 2>/dev/null)" || true
      export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-disabled:}"
    else
      export DBUS_SESSION_BUS_ADDRESS="disabled:"
    fi
  fi

  # 11.5 Warm up the managed browser so first browser actions have a live tab
  warmup_browser

  # 12. Start Workspace Sync after startup settles. Keep only one loop active;
  # config edits can make OpenClaw exit/reload, and the gateway loop below will
  # relaunch it without rerunning all startup code.
  start_background_sync_once
  start_background_devdata_sync

  set +e
  wait "$GATEWAY_PID"
  GATEWAY_EXIT_CODE=$?
  set -e

  sync_before_gateway_restart

  GATEWAY_RESTART_COUNT=$((GATEWAY_RESTART_COUNT + 1))
  if [ "$GATEWAY_MAX_RESTARTS" != "0" ] && [ "$GATEWAY_RESTART_COUNT" -ge "$GATEWAY_MAX_RESTARTS" ]; then
    echo "Gateway exited with code ${GATEWAY_EXIT_CODE}; restart limit (${GATEWAY_MAX_RESTARTS}) reached."
    echo "Gateway stopped — JupyterLab and env-builder still running."
    break
  fi

  echo "Gateway exited with code ${GATEWAY_EXIT_CODE}; restarting in ${GATEWAY_RESTART_DELAY}s..."
  sleep "$GATEWAY_RESTART_DELAY"
done

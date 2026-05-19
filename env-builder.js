const MODEL_CATALOGS = {
  "LLM_MODEL": {
    "Anthropic": [
      "claude-opus-4-7",
      "claude-opus-4-6",
      "claude-opus-4-5",
      "claude-opus-4-1",
      "claude-sonnet-4-7",
      "claude-sonnet-4-6",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
      "claude-haiku-4-5-20251001",
      "claude-haiku-3-5"
    ],
    "OpenAI": [
      "gpt-5.4-pro",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.1",
      "gpt-5",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "o3",
      "o4-mini"
    ],
    "Gemini": [
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-preview",
      "gemini-3-flash-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ],
    "DeepSeek": [
      "deepseek-v4-pro",
      "deepseek-v4-flash",
      "deepseek-v3.2",
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-r1",
      "deepseek-r1-0528"
    ],
    "xAI": [
      "grok-4.3",
      "grok-4.1",
      "grok-4",
      "grok-3"
    ],
    "Groq": [
      "groq/compound",
      "groq/compound-mini",
      "groq/llama-3.1-8b-instant",
      "groq/llama-3.1-70b-versatile",
      "groq/llama-3.3-70b-versatile",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
      "qwen/qwen3-32b",
      "groq/mixtral-8x7b-32768"
    ],
    "Mistral": [
      "mistral/mistral-large-latest",
      "mistral/mistral-large-2",
      "mistral/mistral-medium-3.5",
      "mistral/mistral-small-latest",
      "mistral/mistral-small-3.2",
      "mistral/devstral-2",
      "mistral/ocr-3-premier",
      "mistral/voxtral-mini-transcribe-realtime",
      "mistral/codestral-latest"
    ],
    "Cohere": [
      "command-a",
      "command-a-03-2025",
      "command-a-translate-08-2025",
      "command-a-reasoning-08-2025",
      "command-a-vision-07-2025",
      "command-r7b-12-2024",
      "command-r-08-2024",
      "command-r-plus-08-2024"
    ],
    "OpenRouter": [
      "openrouter/free",
      "openrouter/auto",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-haiku-4-5",
      "openai/gpt-5.4",
      "openai/gpt-4.1",
      "openai/gpt-4o",
      "openai/gpt-5.1",
      "google/gemini-3.1-pro-preview",
      "google/gemini-2.5-pro",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-r1",
      "moonshotai/kimi-k2.5",
      "qwen/qwen3-32b",
      "meta-llama/llama-3.3-70b-instruct"
    ],
    "Together": [
      "moonshotai/Kimi-K2.5",
      "deepseek-ai/DeepSeek-R1",
      "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
      "zai-org/GLM-5.1",
      "google/gemma-4-31B-it",
      "MiniMaxAI/MiniMax-M2.7",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
      "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
      "moonshotai/Kimi-K2.5-Instruct"
    ],
    "OpenCode": [
      "opencode/claude-opus-4-6",
      "opencode/gpt-5.4",
      "opencode-go/kimi-k2.5",
      "opencode-go/qwen3-32b"
    ],
    "Cerebras": [
      "cerebras/zai-glm-4.7",
      "cerebras/deepseek-r1",
      "cerebras/llama-4-scout-17b-16e-instruct",
      "cerebras/qwen3-32b"
    ],
    "NVIDIA": [
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-4-340b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct"
    ],
    "KiloCode": [
      "kilocode/anthropic/claude-opus-4.6",
      "kilocode/anthropic/claude-sonnet-4.6",
      "kilocode/openai/gpt-5.4",
      "kilocode/google/gemini-2.5-pro"
    ],
    "Z.AI": [
      "zai-org/GLM-5.1",
      "zai-org/GLM-4.7",
      "zai-org/GLM-4.5"
    ],
    "Moonshot": [
      "moonshot/kimi-k2.5",
      "moonshot/kimi-k2.5-thinking",
      "moonshot/kimi-k2.5-coder"
    ],
    "MiniMax": [
      "minimax/minimax-m2.7",
      "minimax/minimax-m1.5",
      "minimax/abab6.5s-chat"
    ],
    "Xiaomi": [
      "xiaomi/mimo-v1",
      "xiaomi/mimo-v2",
      "xiaomi/mi-mo"
    ],
    "Volcano Engine": [
      "volcengine/doubao-seed-1.6",
      "volcengine/doubao-1.5-pro",
      "volcengine/doubao-1.5-lite"
    ],
    "BytePlus": [
      "byteplus/seed-1.6",
      "byteplus/deepseek-v3.2",
      "byteplus/doubao-seed-1.6"
    ],
    "Qianfan": [
      "qianfan/ernie-4.5",
      "qianfan/ernie-4.5-8k",
      "qianfan/deepseek-v3.2",
      "qianfan/ernie-x1"
    ],
    "ModelStudio": [
      "modelstudio/qwen3-max",
      "modelstudio/qwen3-coder",
      "modelstudio/qwen3-32b"
    ],
    "Hugging Face": [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen3-32B",
      "google/gemma-4-31B-it",
      "deepseek-ai/DeepSeek-V3.2",
      "moonshotai/Kimi-K2.5"
    ],
    "Venice": [
      "venice/gpt-5",
      "venice/llama-3.3-70b",
      "venice/deepseek-r1"
    ],
    "Synthetic": [
      "synthetic/gpt-5",
      "synthetic/claude-sonnet-4-6"
    ],
    "AI Gateway": [
      "openai/gpt-5.4",
      "anthropic/claude-sonnet-4-6",
      "google/gemini-2.5-pro"
    ],
    "GitHub Copilot": [
      "github-copilot/gpt-5",
      "github-copilot/gpt-4.1",
      "github-copilot/gpt-4o"
    ],
    "ZAI": [
      "zai/glm-5",
      "zai/glm-5-turbo",
      "zai/glm-4.7",
      "zai/glm-4.7-flash"
    ],
    "Kimi": [
      "moonshot/kimi-k2.5",
      "moonshot/kimi-k2.5-thinking"
    ],
    "HuggingFace": [
      "huggingface/deepseek-ai/DeepSeek-R1",
      "huggingface/meta-llama/Llama-3.3-70B-Instruct",
      "huggingface/Qwen/Qwen3-32B"
    ]
  },
  "OPENAI_MODELS": [
    "gpt-5.4-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.1",
    "gpt-5",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "o3",
    "o4-mini"
  ],
  "ANTHROPIC_MODELS": [
    "anthropic/claude-opus-4-7",
    "anthropic/claude-opus-4-6",
    "anthropic/claude-opus-4-5",
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-haiku-4-5"
  ],
  "GEMINI_MODELS": [
    "google/gemini-3.1-pro-preview",
    "google/gemini-3.1-flash-preview",
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash"
  ],
  "DEEPSEEK_MODELS": [
    "deepseek/deepseek-v4-pro",
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v3.2",
    "deepseek/deepseek-chat",
    "deepseek/deepseek-reasoner",
    "deepseek/deepseek-r1",
    "deepseek/deepseek-r1-0528"
  ],
  "OPENROUTER_MODELS": [
    "openrouter/free",
    "openrouter/auto",
    "openrouter/anthropic/claude-sonnet-4-6",
    "openrouter/anthropic/claude-opus-4-7",
    "openrouter/anthropic/claude-haiku-4-5",
    "openrouter/openai/gpt-5.4",
    "openrouter/openai/gpt-4.1",
    "openrouter/openai/gpt-4o",
    "openrouter/openai/gpt-5.1",
    "openrouter/google/gemini-3.1-pro-preview",
    "openrouter/google/gemini-2.5-pro",
    "openrouter/deepseek/deepseek-v3.2",
    "openrouter/deepseek/deepseek-r1",
    "openrouter/moonshotai/kimi-k2.5",
    "openrouter/qwen/qwen3-32b"
  ],
  "GROQ_MODELS": [
    "groq/compound",
    "groq/compound-mini",
    "groq/llama-3.1-8b-instant",
    "groq/llama-3.1-70b-versatile",
    "groq/llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
    "groq/mixtral-8x7b-32768"
  ],
  "MISTRAL_MODELS": [
    "mistral/mistral-large-latest",
    "mistral/mistral-large-2",
    "mistral/mistral-medium-3.5",
    "mistral/mistral-small-latest",
    "mistral/mistral-small-3.2",
    "mistral/devstral-2",
    "mistral/ocr-3-premier",
    "mistral/voxtral-mini-transcribe-realtime",
    "mistral/codestral-latest"
  ],
  "XAI_MODELS": [
    "grok-4.3",
    "grok-4.1",
    "grok-4",
    "grok-3"
  ],
  "COHERE_MODELS": [
    "command-a",
    "command-a-03-2025",
    "command-a-translate-08-2025",
    "command-a-reasoning-08-2025",
    "command-a-vision-07-2025",
    "command-r7b-12-2024",
    "command-r-08-2024",
    "command-r-plus-08-2024"
  ],
  "TOGETHER_MODELS": [
    "moonshotai/Kimi-K2.5",
    "deepseek-ai/DeepSeek-R1",
    "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    "zai-org/GLM-5.1",
    "google/gemma-4-31B-it",
    "MiniMaxAI/MiniMax-M2.7",
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    "moonshotai/Kimi-K2.5-Instruct"
  ],
  "CEREBRAS_MODELS": [
    "cerebras/zai-glm-4.7",
    "cerebras/deepseek-r1",
    "cerebras/llama-4-scout-17b-16e-instruct",
    "cerebras/qwen3-32b"
  ],
  "NVIDIA_MODELS": [
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-4-340b-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct"
  ],
  "KILOCODE_MODELS": [
    "kilocode/anthropic/claude-opus-4.6",
    "kilocode/anthropic/claude-sonnet-4.6",
    "kilocode/openai/gpt-5.4",
    "kilocode/google/gemini-2.5-pro"
  ],
  "OPENCODE_MODELS": [
    "opencode/claude-opus-4-6",
    "opencode/gpt-5.4",
    "opencode-go/kimi-k2.5",
    "opencode-go/qwen3-32b"
  ],
  "ZAI_MODELS": [
    "zai/glm-5",
    "zai/glm-5-turbo",
    "zai/glm-4.7",
    "zai/glm-4.7-flash"
  ],
  "MOONSHOT_MODELS": [
    "moonshot/kimi-k2.5",
    "moonshot/kimi-k2.5-thinking",
    "moonshot/kimi-k2.5-coder"
  ],
  "MINIMAX_MODELS": [
    "minimax/minimax-m2.7",
    "minimax/minimax-m1.5",
    "minimax/abab6.5s-chat"
  ],
  "XIAOMI_MODELS": [
    "xiaomi/mimo-v1",
    "xiaomi/mimo-v2",
    "xiaomi/mi-mo"
  ],
  "VOLCANO_ENGINE_MODELS": [
    "volcengine/doubao-seed-1.6",
    "volcengine/doubao-1.5-pro",
    "volcengine/doubao-1.5-lite"
  ],
  "BYTEPLUS_MODELS": [
    "byteplus/seed-1.6",
    "byteplus/deepseek-v3.2",
    "byteplus/doubao-seed-1.6"
  ],
  "QIANFAN_MODELS": [
    "qianfan/ernie-4.5",
    "qianfan/ernie-4.5-8k",
    "qianfan/deepseek-v3.2",
    "qianfan/ernie-x1"
  ],
  "MODELSTUDIO_MODELS": [
    "modelstudio/qwen3-max",
    "modelstudio/qwen3-coder",
    "modelstudio/qwen3-32b"
  ],
  "KIMI_MODELS": [
    "moonshot/kimi-k2.5",
    "moonshot/kimi-k2.5-thinking",
    "moonshot/kimi-k2.5-coder"
  ],
  "HUGGINGFACE_MODELS": [
    "huggingface/deepseek-ai/DeepSeek-R1",
    "huggingface/meta-llama/Llama-3.3-70B-Instruct",
    "huggingface/Qwen/Qwen3-32B",
    "huggingface/mistralai/Mistral-Small-3.2-24B-Instruct-2506"
  ],
  "GITHUB_COPILOT_MODELS": [
    "github-copilot/gpt-5",
    "github-copilot/gpt-4.1",
    "github-copilot/gpt-4o"
  ],
  "AI_GATEWAY_MODELS": [],
  "VENICE_MODELS": [],
  "SYNTHETIC_MODELS": []
};

const FIELDS = [
{
    "g": "Core",
    "icon": "⚡",
    "k": "LLM_MODEL",
    "lbl": "Default model ID",
    "type": "text",
    "ph": "choose a provider model",
    "common": 1,
    "tag": "critical"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "LLM_API_KEY",
    "lbl": "Primary provider API key",
    "type": "password",
    "ph": "sk-...",
    "common": 1,
    "tag": "credential"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "GATEWAY_TOKEN",
    "lbl": "Control UI gateway token",
    "type": "password",
    "common": 1,
    "tag": "critical"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "OPENCLAW_PASSWORD",
    "lbl": "Optional password auth",
    "type": "password",
    "tag": "credential"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "OPENCLAW_VERSION",
    "lbl": "Pin OpenClaw version (build-time; rebuild required)",
    "type": "text",
    "ph": "latest",
    "tag": "build"
  },
{
    "g": "Plugins",
    "icon": "⚡",
    "k": "LLM_API_KEY_FALLBACK_ENABLED",
    "lbl": "Allow global LLM_API_KEY fallback",
    "type": "toggle",
    "ph": "true",
    "tag": "advanced"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "DEV_MODE",
    "lbl": "Enable dev mode",
    "type": "toggle",
    "ph": "false",
    "common": 1,
    "tag": "build"
  },
{
    "g": "Startup",
    "icon": "🩺",
    "k": "AUTO_DOCTOR",
    "lbl": "Auto-fix config on boot (openclaw doctor --fix)",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_JUPYTER_ENABLED",
    "lbl": "Enable Jupyter terminal",
    "type": "toggle",
    "ph": "false",
    "common": 1,
    "tag": "feature"
  },
{
    "g": "DevData",
    "icon": "⚡",
    "k": "DEVDATA",
    "lbl": "DevData switch",
    "type": "toggle",
    "ph": "on",
    "common": 1,
    "tag": "feature"
  },
{
    "g": "DevData",
    "icon": "⚡",
    "k": "DEVDATA_DATASET_NAME",
    "lbl": "DevData dataset name",
    "type": "text",
    "ph": "huggingclaw-devdata",
    "common": 1,
    "tag": "feature"
  },
{
    "g": "DevData",
    "icon": "⚡",
    "k": "DEVDATA_SYNC_INTERVAL",
    "lbl": "DevData sync interval (seconds)",
    "type": "number",
    "ph": "180",
    "tag": "advanced"
  },
{
    "g": "WhatsApp",
    "icon": "⚡",
    "k": "WHATSAPP_ENABLED",
    "lbl": "Enable WhatsApp pairing",
    "type": "toggle",
    "ph": "false",
    "common": 1,
    "tag": "feature"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_CAPTURE_DISABLE",
    "lbl": "Disable capture wrapper",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_STARTUP_STRICT",
    "lbl": "Stop on startup failure",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_RUN",
    "lbl": "Startup command (one-liner)",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_STARTUP_COMMANDS",
    "lbl": "Multiline startup commands",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_STARTUP_SCRIPT",
    "lbl": "Startup shell script",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_STARTUP_SCRIPT_B64",
    "lbl": "Startup script (base64)",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_APT_PACKAGES",
    "lbl": "APT packages to install",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_PIP_PACKAGES",
    "lbl": "Pip packages to install",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_NPM_PACKAGES",
    "lbl": "NPM packages to install",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Startup",
    "icon": "⚡",
    "k": "HUGGINGCLAW_OPENCLAW_PLUGINS",
    "lbl": "OpenClaw plugins to load",
    "type": "textarea",
    "tag": "optional"
  },
{
    "g": "Network",
    "icon": "⚡",
    "k": "ALLOWED_ORIGINS",
    "lbl": "Allowed CORS origins",
    "type": "textarea",
    "tag": "advanced"
  },
{
    "g": "Network",
    "icon": "⚡",
    "k": "TRUSTED_PROXIES",
    "lbl": "Trusted proxy CIDRs",
    "type": "textarea",
    "tag": "advanced"
  },
{
    "g": "Network",
    "icon": "⚡",
    "k": "WEBHOOK_URL",
    "lbl": "Webhook URL",
    "type": "text",
    "ph": "https://..."
  },
  {
    "g": "Core",
    "icon": "⚡",
    "k": "GATEWAY_MAX_RESTARTS",
    "lbl": "Gateway max restarts",
    "type": "number",
    "ph": "10",
    "tag": "advanced"
  },
{
    "g": "Gateway",
    "icon": "⚡",
    "k": "GATEWAY_READY_TIMEOUT",
    "lbl": "Gateway ready timeout",
    "type": "number",
    "ph": "90",
    "tag": "advanced"
  },
{
    "g": "Gateway",
    "icon": "⚡",
    "k": "GATEWAY_RESTART_DELAY",
    "lbl": "Gateway restart delay",
    "type": "number",
    "ph": "5",
    "tag": "advanced"
  },
{
    "g": "Gateway",
    "icon": "⚡",
    "k": "GATEWAY_VERBOSE",
    "lbl": "Verbose gateway logs",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Logging",
    "icon": "⚡",
    "k": "OPENCLAW_CONSOLE_LOG_LEVEL",
    "lbl": "Console log level",
    "type": "select",
    "options": [
      "debug",
      "info",
      "warn",
      "error"
    ],
    "ph": "info",
    "tag": "optional"
  },
{
    "g": "Logging",
    "icon": "⚡",
    "k": "OPENCLAW_FILE_LOG_LEVEL",
    "lbl": "File log level",
    "type": "select",
    "options": [
      "debug",
      "info",
      "warn",
      "error"
    ],
    "ph": "info",
    "tag": "optional"
  },
{
    "g": "Logging",
    "icon": "⚡",
    "k": "OPENCLAW_CONSOLE_LOG_STYLE",
    "lbl": "Console log style",
    "type": "select",
    "options": [
      "pretty",
      "json",
      "compact"
    ],
    "ph": "pretty",
    "tag": "optional"
  },
{
    "g": "Plugins",
    "icon": "⚡",
    "k": "BROWSER_PLUGIN_MODE",
    "lbl": "Browser plugin mode",
    "type": "select",
    "options": [
      "auto",
      "enabled",
      "disabled"
    ],
    "ph": "auto",
    "tag": "feature"
  },
{
    "g": "Plugins",
    "icon": "⚡",
    "k": "ACP_PLUGIN_MODE",
    "lbl": "ACP plugin mode",
    "type": "select",
    "options": [
      "auto",
      "enabled",
      "disabled"
    ],
    "ph": "auto",
    "tag": "feature"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_PROXY_DEBUG",
    "lbl": "Cloudflare proxy debug",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_KEEPALIVE_ENABLED",
    "lbl": "Enable keep-awake worker",
    "type": "toggle",
    "ph": "true",
    "tag": "feature"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_PROXY_URL",
    "lbl": "Proxy worker URL",
    "type": "text",
    "ph": "https://your-proxy.workers.dev",
    "common": 1,
    "tag": "feature"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_PROXY_SECRET",
    "lbl": "Proxy shared secret",
    "type": "password",
    "tag": "credential"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_PROXY_DOMAINS",
    "lbl": "Extra domains to proxy",
    "type": "textarea",
    "ph": "api.sendgrid.com,slack.com",
    "tag": "advanced"
  },
{
    "g": "Cloudflare",
    "icon": "⚡",
    "k": "CLOUDFLARE_WORKERS_TOKEN",
    "lbl": "Workers API token",
    "type": "password",
    "common": 1,
    "tag": "credential"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "HF_USERNAME",
    "lbl": "Hugging Face username",
    "type": "text",
    "common": 1,
    "tag": "optional"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "HF_TOKEN",
    "lbl": "HF write token",
    "type": "password",
    "common": 1,
    "tag": "credential"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "BACKUP_DATASET_NAME",
    "lbl": "Backup dataset name",
    "type": "text",
    "ph": "huggingclaw-backup",
    "common": 1,
    "tag": "optional"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "SYNC_INTERVAL",
    "lbl": "Sync interval (seconds)",
    "type": "number",
    "ph": "180",
    "common": 1,
    "tag": "advanced"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "JUPYTER_TOKEN",
    "lbl": "Jupyter access token (Must NOT be 'huggingface'. Run: openssl rand -hex 32)",
    "type": "password",
    "secret": 1,
    "ph": "huggingface",
    "common": 1
  },
  {
    "g": "Core",
    "icon": "⚡",
    "k": "OPENCLAW_DISABLE_BONJOUR",
    "lbl": "Disable Bonjour/mDNS discovery",
    "type": "toggle",
    "ph": "false",
    "tag": "advanced"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "OPENCLAW_RUNTIME_VERSION",
    "lbl": "Pin runtime version",
    "type": "text",
    "ph": "latest",
    "tag": "advanced"
  },
{
    "g": "Core",
    "icon": "⚡",
    "k": "OPENCLAW_DISPLAY_VERSION",
    "lbl": "Display version label",
    "type": "text",
    "ph": "",
    "tag": "optional"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "CLOUDFLARE_ACCOUNT_ID",
    "lbl": "Cloudflare account ID",
    "type": "text",
    "ph": "account-id",
    "tag": "feature"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "CLOUDFLARE_WORKER_NAME",
    "lbl": "Outbound proxy worker name",
    "type": "text",
    "ph": "huggingclaw-proxy",
    "tag": "feature"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "CLOUDFLARE_KEEPALIVE_URL",
    "lbl": "Keepalive worker URL",
    "type": "text",
    "ph": "https://your-worker.workers.dev",
    "tag": "feature"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "CLOUDFLARE_KEEPALIVE_WORKER_NAME",
    "lbl": "Keepalive worker name",
    "type": "text",
    "ph": "huggingclaw-keepalive",
    "tag": "feature"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "CLOUDFLARE_KEEPALIVE_CRON",
    "lbl": "Keepalive cron schedule",
    "type": "text",
    "ph": "*/5 * * * *",
    "tag": "advanced"
  },
{
    "g": "Integrations",
    "icon": "🔌",
    "k": "TELEGRAM_API_ROOT",
    "lbl": "Telegram API root override",
    "type": "text",
    "ph": "https://api.telegram.org",
    "tag": "advanced"
  },
{
    "g": "Runtime",
    "icon": "⚙️",
    "k": "OPENCLAW_CONFIG_WATCH_INTERVAL",
    "lbl": "Config watch interval (seconds)",
    "type": "number",
    "ph": "1",
    "tag": "advanced"
  },
{
    "g": "Runtime",
    "icon": "⚙️",
    "k": "OPENCLAW_CONFIG_SETTLE_SECONDS",
    "lbl": "Config settle window (seconds)",
    "type": "number",
    "ph": "3",
    "tag": "advanced"
  },
{
    "g": "Runtime",
    "icon": "⚙️",
    "k": "JUPYTER_ROOT_DIR",
    "lbl": "Jupyter root directory",
    "type": "text",
    "ph": "/home/node",
    "tag": "advanced"
  },
  {
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "ANTHROPIC_API_KEY",
    "lbl": "Anthropic (Claude)",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "OPENAI_API_KEY",
    "lbl": "OpenAI (GPT)",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "GOOGLE_API_KEY",
    "lbl": "Google AI Studio",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "GEMINI_API_KEY",
    "lbl": "Google Gemini",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "DEEPSEEK_API_KEY",
    "lbl": "DeepSeek",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "OPENROUTER_API_KEY",
    "lbl": "OpenRouter",
    "type": "password",
    "common": 1,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "OPENCODE_API_KEY",
    "lbl": "OpenCode",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "KILOCODE_API_KEY",
    "lbl": "KiloCode",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "ZAI_API_KEY",
    "lbl": "Z.ai / GLM",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "MOONSHOT_API_KEY",
    "lbl": "Moonshot / Kimi",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "MINIMAX_API_KEY",
    "lbl": "MiniMax",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "XIAOMI_API_KEY",
    "lbl": "Xiaomi / MiMo",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "VOLCANO_ENGINE_API_KEY",
    "lbl": "Volcengine / Doubao",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "BYTEPLUS_API_KEY",
    "lbl": "BytePlus",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "MISTRAL_API_KEY",
    "lbl": "Mistral",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "XAI_API_KEY",
    "lbl": "xAI (Grok)",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "NVIDIA_API_KEY",
    "lbl": "NVIDIA",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "GROQ_API_KEY",
    "lbl": "Groq",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "COHERE_API_KEY",
    "lbl": "Cohere",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "TOGETHER_API_KEY",
    "lbl": "Together AI",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "CEREBRAS_API_KEY",
    "lbl": "Cerebras",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "QIANFAN_API_KEY",
    "lbl": "Qianfan",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "MODELSTUDIO_API_KEY",
    "lbl": "ModelStudio",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "KIMI_API_KEY",
    "lbl": "Kimi",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "HUGGINGFACE_HUB_TOKEN",
    "lbl": "Hugging Face token",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "COPILOT_GITHUB_TOKEN",
    "lbl": "GitHub Copilot",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "VENICE_API_KEY",
    "lbl": "Venice",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "SYNTHETIC_API_KEY",
    "lbl": "Synthetic",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "AI_GATEWAY_API_KEY",
    "lbl": "AI Gateway",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Provider Keys",
    "icon": "🔑",
    "k": "CLOUDFLARE_API_TOKEN",
    "lbl": "Cloudflare API token",
    "type": "password",
    "common": 0,
    "tag": "credential"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "ANTHROPIC_API_KEYS",
    "lbl": "Anthropic pool (comma-sep)",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "OPENAI_API_KEYS",
    "lbl": "OpenAI pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "GEMINI_API_KEYS",
    "lbl": "Gemini pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "GOOGLE_API_KEYS",
    "lbl": "Google pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "DEEPSEEK_API_KEYS",
    "lbl": "DeepSeek pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "OPENROUTER_API_KEYS",
    "lbl": "OpenRouter pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "OPENCODE_API_KEYS",
    "lbl": "OpenCode pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "KILOCODE_API_KEYS",
    "lbl": "KiloCode pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "ZAI_API_KEYS",
    "lbl": "Z.ai / GLM pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "MOONSHOT_API_KEYS",
    "lbl": "Moonshot / Kimi pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "MINIMAX_API_KEYS",
    "lbl": "MiniMax pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "XIAOMI_API_KEYS",
    "lbl": "Xiaomi pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "VOLCANO_ENGINE_API_KEYS",
    "lbl": "Volcano Engine pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "BYTEPLUS_API_KEYS",
    "lbl": "BytePlus pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "MISTRAL_API_KEYS",
    "lbl": "Mistral pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "XAI_API_KEYS",
    "lbl": "xAI pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "NVIDIA_API_KEYS",
    "lbl": "NVIDIA pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "GROQ_API_KEYS",
    "lbl": "Groq pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "COHERE_API_KEYS",
    "lbl": "Cohere pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "TOGETHER_API_KEYS",
    "lbl": "Together pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "CEREBRAS_API_KEYS",
    "lbl": "Cerebras pool",
    "type": "text",
    "tag": "advanced"
  },
{
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "HUGGINGFACE_HUB_TOKENS",
    "lbl": "HF token pool",
    "type": "text"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "OPENAI_MODELS",
    "lbl": "Visible OpenAI models",
    "type": "model_list",
    "options_key": "OPENAI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "ANTHROPIC_MODELS",
    "lbl": "Visible Anthropic models",
    "type": "model_list",
    "options_key": "ANTHROPIC_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "GEMINI_MODELS",
    "lbl": "Visible Gemini models",
    "type": "model_list",
    "options_key": "GEMINI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "DEEPSEEK_MODELS",
    "lbl": "Visible DeepSeek models",
    "type": "model_list",
    "options_key": "DEEPSEEK_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "OPENROUTER_MODELS",
    "lbl": "Visible OpenRouter models",
    "type": "model_list",
    "options_key": "OPENROUTER_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "GROQ_MODELS",
    "lbl": "Visible Groq models",
    "type": "model_list",
    "options_key": "GROQ_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "MISTRAL_MODELS",
    "lbl": "Visible Mistral models",
    "type": "model_list",
    "options_key": "MISTRAL_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "XAI_MODELS",
    "lbl": "Visible xAI models",
    "type": "model_list",
    "options_key": "XAI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "COHERE_MODELS",
    "lbl": "Visible Cohere models",
    "type": "model_list",
    "options_key": "COHERE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "TOGETHER_MODELS",
    "lbl": "Visible Together models",
    "type": "model_list",
    "options_key": "TOGETHER_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "CEREBRAS_MODELS",
    "lbl": "Visible Cerebras models",
    "type": "model_list",
    "options_key": "CEREBRAS_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "NVIDIA_MODELS",
    "lbl": "Visible NVIDIA models",
    "type": "model_list",
    "options_key": "NVIDIA_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "KILOCODE_MODELS",
    "lbl": "Visible KiloCode models",
    "type": "model_list",
    "options_key": "KILOCODE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "OPENCODE_MODELS",
    "lbl": "Visible OpenCode models",
    "type": "model_list",
    "options_key": "OPENCODE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "ZAI_MODELS",
    "lbl": "Visible Z.ai / GLM models",
    "type": "model_list",
    "options_key": "ZAI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "MOONSHOT_MODELS",
    "lbl": "Visible Moonshot / Kimi models",
    "type": "model_list",
    "options_key": "MOONSHOT_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "MINIMAX_MODELS",
    "lbl": "Visible MiniMax models",
    "type": "model_list",
    "options_key": "MINIMAX_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "XIAOMI_MODELS",
    "lbl": "Visible Xiaomi models",
    "type": "model_list",
    "options_key": "XIAOMI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "VOLCANO_ENGINE_MODELS",
    "lbl": "Visible Volcano Engine models",
    "type": "model_list",
    "options_key": "VOLCANO_ENGINE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "BYTEPLUS_MODELS",
    "lbl": "Visible BytePlus models",
    "type": "model_list",
    "options_key": "BYTEPLUS_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "QIANFAN_MODELS",
    "lbl": "Visible Qianfan models",
    "type": "model_list",
    "options_key": "QIANFAN_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "MODELSTUDIO_MODELS",
    "lbl": "Visible ModelStudio models",
    "type": "model_list",
    "options_key": "MODELSTUDIO_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "KIMI_MODELS",
    "lbl": "Visible Kimi models",
    "type": "model_list",
    "options_key": "KIMI_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "HUGGINGFACE_MODELS",
    "lbl": "Visible Hugging Face models",
    "type": "model_list",
    "options_key": "HUGGINGFACE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Model Lists",
    "icon": "📋",
    "k": "GITHUB_COPILOT_MODELS",
    "lbl": "Visible GitHub Copilot models",
    "type": "model_list",
    "options_key": "GITHUB_COPILOT_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_PROVIDER_NAME",
    "lbl": "Provider display name",
    "type": "text",
    "tag": "feature"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_BASE_URL",
    "lbl": "OpenAI-compatible base URL",
    "type": "text",
    "tag": "feature"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_MODEL_ID",
    "lbl": "Model ID",
    "type": "text",
    "ph": "custom model id",
    "tag": "feature"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_MODEL_NAME",
    "lbl": "Friendly model name",
    "type": "text",
    "tag": "feature"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_API_KEY",
    "lbl": "Provider API key",
    "type": "password",
    "tag": "credential"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_API_TYPE",
    "lbl": "API type",
    "type": "select",
    "options": [
      "openai-completions",
      "openai-chat-completions",
      "anthropic",
      "gemini",
      "openrouter"
    ],
    "ph": "openai-completions",
    "tag": "feature"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_CONTEXT_WINDOW",
    "lbl": "Context window",
    "type": "number",
    "ph": "128000",
    "tag": "advanced"
  },
{
    "g": "Custom Provider",
    "icon": "🔌",
    "k": "CUSTOM_MAX_TOKENS",
    "lbl": "Max output tokens",
    "type": "number",
    "ph": "8192",
    "tag": "advanced"
  },
{
    "g": "Telegram",
    "icon": "✈️",
    "k": "TELEGRAM_BOT_TOKEN",
    "lbl": "Bot token from BotFather",
    "type": "password",
    "common": 1,
    "tag": "credential"
  },
{
    "g": "Telegram",
    "icon": "✈️",
    "k": "TELEGRAM_ALLOWED_USERS",
    "lbl": "Allowed user IDs (comma)",
    "type": "text",
    "ph": "123456789,987654321",
    "common": 1,
    "tag": "critical"
  },
{
    "g": "Telegram",
    "icon": "✈️",
    "k": "TELEGRAM_USER_ID",
    "lbl": "Single Telegram user ID",
    "type": "text",
    "tag": "optional"
  },
{
    "g": "Telegram",
    "icon": "✈️",
    "k": "TELEGRAM_USER_IDS",
    "lbl": "Telegram user IDs (comma)",
    "type": "text",
    "tag": "optional"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "APP_BASE",
    "lbl": "Public app base path",
    "type": "text",
    "ph": "/app",
    "tag": "advanced"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "BACKUP_DATASET",
    "lbl": "Backup dataset alias",
    "type": "text",
    "ph": "huggingclaw-backup",
    "tag": "optional"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "SPACE_AUTHOR_NAME",
    "lbl": "HF Space author name",
    "type": "text",
    "tag": "optional"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "SPACE_HOST",
    "lbl": "HF Space host domain",
    "type": "text",
    "tag": "optional"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "PORT",
    "lbl": "Public dashboard port",
    "type": "number",
    "ph": "7861",
    "tag": "advanced"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "GATEWAY_PORT",
    "lbl": "OpenClaw internal port",
    "type": "number",
    "ph": "7860",
    "tag": "advanced"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "JUPYTER_PORT",
    "lbl": "Jupyter internal port",
    "type": "number",
    "ph": "8888",
    "tag": "advanced"
  },
{
    "g": "Deployment",
    "icon": "🧭",
    "k": "JUPYTER_BASE",
    "lbl": "Jupyter public base path",
    "type": "text",
    "ph": "/terminal",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "AI_GATEWAY_API_KEYS",
    "lbl": "AI Gateway pool (comma-sep)",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "COPILOT_GITHUB_TOKENS",
    "lbl": "GitHub Copilot token pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "KIMI_API_KEYS",
    "lbl": "Kimi pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "MODELSTUDIO_API_KEYS",
    "lbl": "ModelStudio pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "QIANFAN_API_KEYS",
    "lbl": "Qianfan pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "SYNTHETIC_API_KEYS",
    "lbl": "Synthetic pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Rotation Pools",
    "icon": "🔄",
    "k": "VENICE_API_KEYS",
    "lbl": "Venice pool",
    "type": "text",
    "tag": "advanced"
  },
  {
    "g": "Model Lists",
    "icon": "📋",
    "k": "VENICE_MODELS",
    "lbl": "Visible Venice models",
    "type": "model_list",
    "options_key": "VENICE_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  },
  {
    "g": "Model Lists",
    "icon": "📋",
    "k": "SYNTHETIC_MODELS",
    "lbl": "Visible Synthetic models",
    "type": "model_list",
    "options_key": "SYNTHETIC_MODELS",
    "ph": "Select models to build a comma list",
    "tag": "optional"
  }
]

const ICONS = {
  All:'🏠', Core:'⚡', Startup:'🚀', DevData:'🧪', WhatsApp:'💬',
  Cloudflare:'☁️', Gateway:'🔀', Logging:'📝', Network:'🌐', Plugins:'🔌',
  Deployment:'🧭', 'Provider Keys':'🔑', 'Rotation Pools':'🔄',
  'Model Lists':'📋', 'Custom Provider':'🧩', Telegram:'✈️',
  Backup:'💾', Runtime:'⚙️', Integrations:'🔗', 'Custom Env':'🔧'
};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
const safeKey = k => /^[A-Z_][A-Z0-9_]*$/.test(k) && !['HUGGINGCLAW_ENV_BUNDLE', 'ENV_BUNDLE'].includes(k);

function encodeBundle(obj) {
  const j = JSON.stringify(obj);
  let b = '';
  for (const x of new TextEncoder().encode(j)) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBundle(raw) {
  try {
    raw = String(raw || '').trim();
    if (!raw) return {};

    if (raw.includes('HUGGINGCLAW_ENV_BUNDLE=')) {
      raw = raw.split('HUGGINGCLAW_ENV_BUNDLE=').pop().trim();
    }

    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }

    if (raw.startsWith('{')) return JSON.parse(raw);

    const p = raw + '='.repeat((4 - raw.length % 4) % 4);
    const b = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(b, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

function parseEnv(text) {
  text = String(text || '').trim();
  if (!text) return {};

  if (
    text.startsWith('{') ||
    /^[A-Za-z0-9_-]{20,}$/.test(text) ||
    text.includes('HUGGINGCLAW_ENV_BUNDLE=')
  ) {
    return decodeBundle(text);
  }

  const out = {};
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const i = line.indexOf('=');
    if (i < 1) continue;

    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    if (safeKey(key)) out[key] = val;
  }
  return out;
}

function showToast(msg = 'Copied!') {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1500);
}

let activeGroup = 'All';
let customCount = 0;
const GROUPS = ['All', ...[...new Set(FIELDS.map(f => f.g))], 'Custom Env'];

function renderSidebar() {
  const sb = $('sidebar');
  sb.innerHTML = '<div class="sb-label">Groups</div>';
  GROUPS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn' + (activeGroup === g ? ' active' : '');
    btn.dataset.group = g;
    const id = 'nc_' + g.replace(/\W/g, '_');
    btn.innerHTML = `<span class="nav-icon">${ICONS[g] || '📁'}</span><span class="nav-label">${esc(g)}</span><span class="nav-count" id="${id}">0</span>`;
    btn.onclick = () => {
      activeGroup = g;
      renderSidebar();
      filter();
    };
    sb.appendChild(btn);
  });
}

function renderOptionsHTML(field) {
  const src = field.options || MODEL_CATALOGS[field.options_key] || [];

  if (field.options_key === 'LLM_MODEL') {
    const groups = MODEL_CATALOGS.LLM_MODEL || {};
    return Object.entries(groups).map(([group, items]) => {
      const options = items.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      return `<optgroup label="${esc(group)}">${options}</optgroup>`;
    }).join('');
  }

  if (Array.isArray(src)) {
    return src.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  }

  return '';
}

function defaultValueFor(field) {
  if (field.type === 'toggle') {
    const on = String(field.ph ?? '').toLowerCase();
    return ['1', 'true', 'yes', 'on', 'enabled'].includes(on) ? 'true' : 'false';
  }
  if (field.type === 'select') return String(field.ph ?? '');
  return '';
}

function valueControlHTML(field) {
  if (!field || !field.k) return '<span style="color:red">Invalid field</span>';
  const key = esc(field.k);
  const placeholder = esc(field.ph || field.lbl || '');
  const isSecret = !!field.secret;
  const isTextarea = field.type === 'textarea' || field.type === 'model_list';
  const hasPicker = !!field.options_key || Array.isArray(field.options);
  const inputType = isSecret ? 'password' : (field.type === 'number' ? 'number' : 'text');

  let control = '';
  if (field.type === 'toggle') {
    const initial = defaultValueFor(field);
    control = `
      <div class="toggle-shell" data-toggle-row="1" data-field="${key}">
        <input type="hidden" data-key="${key}" value="${initial}">
        <button type="button" class="tog ${initial === 'true' ? 'on' : ''}" data-toggle="${key}">${initial === 'true' ? 'On' : 'Off'}</button>
      </div>`;
  } else if (isTextarea) {
    control = `<textarea data-key="${key}" placeholder="${placeholder}" spellcheck="false"></textarea>`;
  } else {
    control = `<input type="${inputType}" data-key="${key}" placeholder="${placeholder}" spellcheck="false"/>`;
  }

  if (!hasPicker) return control;

  const pickerMode = field.type === 'model_list' ? 'multi' : 'single';
  const pickerLabel = field.type === 'model_list' ? 'Add model…' : 'Choose preset…';
  return `
    <div class="picker-shell" data-picker-shell="${key}" data-picker-mode="${pickerMode}">
      <div class="picker-row">
        <select class="picker-select" data-pick-for="${key}" aria-label="${esc(field.lbl || field.k)} presets">
          <option value="">${esc(pickerLabel)}</option>
          ${renderOptionsHTML(field)}
          <option value="__custom__">Custom…</option>
        </select>
        <button type="button" class="mini-btn" data-custom-for="${key}">+ Custom</button>
        <button type="button" class="mini-btn" data-clear-for="${key}">Clear</button>
      </div>
      ${control}
    </div>`;

}

function cardHTML(f, origIdx = 0) {
  const TAG_META = {
    critical:   { cls: 'badge-critical',   lbl: 'critical'   },
    credential: { cls: 'badge-credential', lbl: 'credential' },
    feature:    { cls: 'badge-feature',    lbl: 'feature'    },
    optional:   { cls: 'badge-optional',   lbl: 'optional'   },
    advanced:   { cls: 'badge-advanced',   lbl: 'advanced'   },
    build:      { cls: 'badge-build',      lbl: 'build-time' },
  };
  const tm = TAG_META[f.tag] || TAG_META.optional;
  const badge = `<span class="badge ${tm.cls}">${tm.lbl}</span>`;

  return `<div class="env-card" data-row data-orig-idx="${origIdx}" data-group="${esc(f.g)}" data-search="${esc((f.g + ' ' + f.k + ' ' + (f.lbl || '') + ' ' + (f.tag || '')).toLowerCase())}" data-tag="${esc(f.tag || 'optional')}">
    <div class="card-top">
      <input type="checkbox" class="card-check" data-check="${esc(f.k)}" ${f.common ? 'data-common="1"' : ''}>
      <div class="card-info">
        <div class="card-key">${esc(f.k)}</div>
        <div class="card-lbl">${esc(f.lbl || '')}</div>
      </div>
      ${badge}
    </div>
    <div class="card-input">${valueControlHTML(f)}</div>
  </div>`;
}

function addCustomRow(key = '', val = '', enabled = false) {
  const id = customCount++;
  const row = document.createElement('div');
  row.className = 'custom-row';
  row.dataset.customRow = id;
  row.dataset.enabled = enabled ? '1' : '0';

  row.innerHTML = `
    <input data-ck="${id}" placeholder="CUSTOM_ENV_NAME" value="${esc(key)}">
    <input data-cv="${id}" placeholder="value" value="${esc(val)}">
    <button class="tog${enabled ? ' on' : ''}">${enabled ? 'On' : 'Off'}</button>
  `;

  $('customRows').appendChild(row);

  row.querySelectorAll('input').forEach(el => el.addEventListener('input', refresh));
  row.querySelector('button').onclick = () => {
    const on = row.dataset.enabled !== '1';
    row.dataset.enabled = on ? '1' : '0';
    row.querySelector('button').textContent = on ? 'On' : 'Off';
    row.querySelector('button').classList.toggle('on', on);
    refresh();
  };
}

function getFieldValueInput(key) {
  return document.querySelector(`[data-key="${CSS.escape(key)}"]`);
}

function setFieldValue(key, value) {
  const el = getFieldValueInput(key);
  if (!el) return;
  el.value = value ?? '';
}

function appendCsvValue(existing, next) {
  const parts = String(existing || '').split(',').map(s => s.trim()).filter(Boolean);
  const val = String(next || '').trim();
  if (!val) return parts.join(', ');
  if (!parts.includes(val)) parts.push(val);
  return parts.join(', ');
}

function collect() {
  const obj = {};
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (!key || !safeKey(key)) return;
    // Only include if the card's checkbox is ticked
    const chk = document.querySelector(`[data-check="${CSS.escape(key)}"]`);
    if (!chk || !chk.checked) return;
    const val = String(el.value ?? '').trim();
    if (val) obj[key] = val;
  });

  document.querySelectorAll('[data-custom-row]').forEach(row => {
    const id = row.dataset.customRow;
    const key = (row.querySelector(`[data-ck="${id}"]`)?.value || '').trim();
    const val = (row.querySelector(`[data-cv="${id}"]`)?.value || '').trim();
    if (row.dataset.enabled === '1' && safeKey(key) && val) obj[key] = val;
  });

  return obj;
}

function generateBundle() {
  const obj = collect();
  const keys = Object.keys(obj).sort();
  const bundle = keys.length ? encodeBundle(Object.fromEntries(keys.map(k => [k, obj[k]]))) : '';
  $('bundleOut').value = bundle;
  $('envLineOut').value = bundle ? `HUGGINGCLAW_ENV_BUNDLE=${bundle}` : '';
}

function refresh() {
  const obj = collect();
  const keys = Object.keys(obj).sort();
  const s = $('summary');
  if (keys.length) {
    s.innerHTML = `<strong>${keys.length}</strong> variable${keys.length > 1 ? 's' : ''} selected<div class="sum-keys">${keys.map(k => `<span class="sum-key">${esc(k)}</span>`).join('')}</div>`;
  } else {
    s.innerHTML = 'No variables selected yet.';
  }
  updateCounts();
}

function markSelected() {
  document.querySelectorAll('[data-row]').forEach(r => r.classList.toggle('selected', !!r.querySelector('[data-check]')?.checked));
}

function updateCounts() {
  document.querySelectorAll('[id^="nc_"]').forEach(el => el.textContent = '0');
  const byGrp = {};
  document.querySelectorAll('[data-check]:checked').forEach(ch => {
    const g = ch.closest('[data-row]')?.dataset.group;
    if (g) byGrp[g] = (byGrp[g] || 0) + 1;
  });
  const custOn = document.querySelectorAll('[data-custom-row][data-enabled="1"]').length;
  const total = Object.values(byGrp).reduce((a, b) => a + b, 0) + custOn;
  const allEl = document.getElementById('nc_All'); if (allEl) allEl.textContent = total;
  Object.entries(byGrp).forEach(([g, c]) => {
    const el = document.getElementById('nc_' + g.replace(/\W/g, '_'));
    if (el) el.textContent = c;
  });
  const custEl = document.getElementById('nc_Custom_Env'); if (custEl) custEl.textContent = custOn;
}

function filter() {
  const q = $('search').value.trim().toLowerCase();
  document.querySelectorAll('.sec[data-section]').forEach(sec => {
    const grp = sec.dataset.section;
    const gMatch = activeGroup === 'All' || activeGroup === grp;
    if (!gMatch) { sec.classList.add('sec-hidden'); return; }
    let any = false;
    sec.querySelectorAll('[data-row]').forEach(card => {
      const m = !q || card.dataset.search.includes(q);
      card.classList.toggle('hidden', !m);
      if (m) any = true;
    });
    sec.classList.toggle('sec-hidden', !any);
  });
  const cs = $('customSec');
  if (cs) cs.style.display = (activeGroup === 'All' || activeGroup === 'Custom Env') ? '' : 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.group === activeGroup));
}

function clearForm() {
  document.querySelectorAll('[data-check]').forEach(c => c.checked = false);
  document.querySelectorAll('[data-key]').forEach(el => {
    if (el.closest('[data-toggle-row]')) {
      el.value = 'false';
      const btn = el.closest('.toggle-shell')?.querySelector('[data-toggle]');
      if (btn) {
        btn.textContent = 'Off';
        btn.classList.remove('on');
      }
      return;
    }
    el.value = '';
  });
  $('customRows').innerHTML = '';
  customCount = 0;
  addCustomRow();
}

function applyObj(obj, replace = false) {
  if (replace) clearForm();
  for (const [key, val] of Object.entries(obj || {})) {
    if (!safeKey(key)) continue;
    const inp = getFieldValueInput(key);
    const chk = document.querySelector(`[data-check="${CSS.escape(key)}"]`);
    if (inp && chk) {
      inp.value = val;
      chk.checked = true;
      const btn = inp.closest('[data-toggle-row]')?.querySelector('[data-toggle]');
      if (btn) {
        const on = String(val).trim().toLowerCase() === 'true';
        btn.textContent = on ? 'On' : 'Off';
        btn.classList.toggle('on', on);
        inp.value = on ? 'true' : 'false';
      }
    } else {
      addCustomRow(key, val, true);
    }
  }
  sortAllSections(); markSelected(); filter(); refresh();
}

function autoCheck(key) {
  const chk = document.querySelector(`[data-check="${CSS.escape(key)}"]`);
  if (chk && !chk.checked) {
    chk.checked = true;
    markSelected();
  }
}

function handlePickerChange(sel) {
  const key = sel.dataset.pickFor;
  const mode = sel.closest('[data-picker-shell]')?.dataset.pickerMode || 'single';
  const value = sel.value;
  if (!key || !value) return;
  if (value === '__custom__') {
    sel.value = '';
    return;
  }
  const inp = getFieldValueInput(key);
  if (!inp) return;

  if (mode === 'multi') {
    inp.value = appendCsvValue(inp.value, value);
  } else {
    inp.value = value;
  }
  sel.value = '';
  autoCheck(key);
  refresh();
}

function promptCustomModel(btn) {
  const key = btn.dataset.customFor;
  const mode = btn.closest('[data-picker-shell]')?.dataset.pickerMode || 'single';
  const inp = getFieldValueInput(key);
  if (!inp) return;
  const message = mode === 'multi'
    ? 'Enter one or more custom model IDs separated by commas'
    : 'Enter a custom model ID';
  const initial = '';
  const text = prompt(message, initial);
  if (text === null) return;
  const val = String(text).trim();
  if (!val) return;
  if (mode === 'multi') {
    const vals = val.split(',').map(s => s.trim()).filter(Boolean);
    let out = inp.value || '';
    for (const v of vals) out = appendCsvValue(out, v);
    inp.value = out;
  } else {
    inp.value = val;
  }
  autoCheck(key);
  refresh();
}

function resetPickerField(btn) {
  const key = btn.dataset.clearFor;
  const inp = getFieldValueInput(key);
  if (!inp) return;
  if (inp.closest('[data-toggle-row]')) {
    inp.value = 'false';
    const toggleBtn = inp.closest('.toggle-shell')?.querySelector('[data-toggle]');
    if (toggleBtn) {
      toggleBtn.textContent = 'Off';
      toggleBtn.classList.remove('on');
    }
  } else {
    inp.value = '';
  }
  refresh();
}

function toggleField(key) {
  const inp = getFieldValueInput(key);
  if (!inp) return;
  const on = String(inp.value || '').trim().toLowerCase() !== 'true';
  inp.value = on ? 'true' : 'false';
  const btn = inp.closest('.toggle-shell')?.querySelector('[data-toggle]');
  if (btn) {
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('on', on);
  }
  // Auto-check when turned on; uncheck when turned off
  const chk = document.querySelector(`[data-check="${CSS.escape(key)}"]`);
  if (chk) {
    chk.checked = on;
    sortSection(inp.closest('[data-row]'));
    markSelected();
  }
  refresh();
}

function sortSection(cardEl) {
  const cards = cardEl && cardEl.closest('.cards');
  if (!cards) return;
  const all     = [...cards.querySelectorAll('[data-row]')];
  const checked = all.filter(c =>  c.querySelector('[data-check]')?.checked);
  const rest    = all.filter(c => !c.querySelector('[data-check]')?.checked);
  rest.sort((a, b) => Number(a.dataset.origIdx) - Number(b.dataset.origIdx));
  [...checked, ...rest].forEach(c => cards.appendChild(c));
}

function sortAllSections() {
  document.querySelectorAll('.cards').forEach(cards => {
    const all     = [...cards.querySelectorAll('[data-row]')];
    const checked = all.filter(c =>  c.querySelector('[data-check]')?.checked);
    const rest    = all.filter(c => !c.querySelector('[data-check]')?.checked);
    rest.sort((a, b) => Number(a.dataset.origIdx) - Number(b.dataset.origIdx));
    [...checked, ...rest].forEach(c => cards.appendChild(c));
  });
}

function bindFieldEvents() {
  document.querySelectorAll('[data-check]').forEach(el => el.addEventListener('change', () => { sortSection(el.closest('[data-row]')); markSelected(); refresh(); }));
  document.querySelectorAll('[data-key]').forEach(el => el.addEventListener('input', refresh));
  document.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => toggleField(btn.dataset.toggle)));
  document.querySelectorAll('[data-pick-for]').forEach(sel => sel.addEventListener('change', () => handlePickerChange(sel)));
  document.querySelectorAll('[data-custom-for]').forEach(btn => btn.addEventListener('click', () => promptCustomModel(btn)));
  document.querySelectorAll('[data-clear-for]').forEach(btn => btn.addEventListener('click', () => resetPickerField(btn)));
}

function renderSections() {
  const grouped = {};
  FIELDS.forEach(f => {
    if (!f || !f.g || !f.k) return;
    (grouped[f.g] ||= []).push(f);
  });

  const wrap = $('sections');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.entries(grouped).forEach(([grp, items]) => {
    try {
      const sec = document.createElement('div');
      sec.className = 'sec';
      sec.dataset.section = grp;
      sec.innerHTML = `
        <div class="sec-header">
          <span class="sec-icon">${ICONS[grp] || '📁'}</span>
          <span class="sec-title">${esc(grp)}</span>
          <span class="sec-count">${items.length}</span>
          <div class="sec-line"></div>
        </div>
        <div class="cards">${items.map((f, i) => { try { return cardHTML(f, i); } catch(e) { console.error('cardHTML error for field', f.k, e); return ''; } }).join('')}</div>`;
      wrap.appendChild(sec);
    } catch(e) {
      console.error('renderSections error for group', grp, e);
    }
  });
  bindFieldEvents();
}

function copyText(text) {
  return navigator.clipboard.writeText(text).then(
    () => showToast('Copied ✓'),
    () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Copied ✓');
    }
  );
}

// ── Init ──
try {
  renderSidebar();
  renderSections();
  addCustomRow();
  filter();
  refresh();
} catch(e) {
  console.error('HuggingClaw ENV Builder init error:', e);
  const wrap = document.getElementById('sections');
  if (wrap) wrap.innerHTML = '<div style="color:red;padding:20px">ENV Builder failed to load. Open browser console for details. Error: ' + e.message + '</div>';
}

// ── Events ──
$('search').oninput = filter;
$('selectRequired').onclick = () => {
  document.querySelectorAll('[data-row][data-tag="critical"] [data-check]').forEach(c => c.checked = true);
  sortAllSections();
  markSelected();
  refresh();
};
$('selectCommon').onclick = () => {
  document.querySelectorAll('[data-common="1"]').forEach(c => c.checked = true);
  sortAllSections();
  markSelected();
  refresh();
};
$('selectVisible').onclick = () => {
  document.querySelectorAll('.sec:not(.sec-hidden) [data-row]:not(.hidden) [data-check]').forEach(c => c.checked = true);
  sortAllSections();
  markSelected();
  refresh();
};
$('clearAll').onclick = () => {
  clearForm();
  sortAllSections();
  markSelected();
  filter();
  refresh();
};
$('applyImport').onclick = () => {
  try {
    const parsed = parseEnv($('importText').value);
    const count = Object.keys(parsed).length;
    if (!count) {
      showToast('No valid env keys found');
      return;
    }
    applyObj(parsed, true);
    showToast(`Imported ${count} key${count > 1 ? 's' : ''} ✓`);
  } catch (e) {
    showToast('Import failed');
    alert(e.message);
  }
};

// Import is explicit via the Import & Apply button to avoid surprising UI resets.
$('addCustom').onclick = () => addCustomRow();
$('applyBundle').onclick = () => {
  try {
    applyObj(decodeBundle($('bundleOut').value), true);
    showToast('Bundle applied ✓');
  } catch (e) {
    showToast('Invalid bundle');
  }
};
$('generateBundle').onclick = () => generateBundle();
$('copyBundle').onclick = () => copyText($('bundleOut').value);
$('copyEnvLine').onclick = () => copyText($('envLineOut').value);
$('copyJson').onclick = () => copyText(JSON.stringify(collect(), null, 2));

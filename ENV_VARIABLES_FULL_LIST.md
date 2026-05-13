# ENV Variables Full List (Repo Scope)

> Internal reference file. Not linked from README/docs navigation.

## 1) User-settable (Space Secrets / `.env`)

These are the main variables you can set directly.

### Core startup/auth
- `LLM_API_KEY` — string API key. Example: `LLM_API_KEY=sk-ant-xxxx`
- `LLM_MODEL` — `provider/model-id` string. Examples:
  - `LLM_MODEL=anthropic/claude-sonnet-4-5`
  - `LLM_MODEL=nvidia/meta/llama-3.1-70b-instruct`
- `GATEWAY_TOKEN` — random secret string. Example: `GATEWAY_TOKEN=9d2f...`
- `OPENCLAW_PASSWORD` — plaintext password string. Example: `OPENCLAW_PASSWORD=MyStrongPass123`

### Provider fallback/selection
- `LLM_API_KEY_FALLBACK_ENABLED` — boolean-like:
  - enabled: `true`, `1`, `yes`, `on`
  - disabled: `false`, `0`, `no`, `off`
  - default/example: `LLM_API_KEY_FALLBACK_ENABLED=true`

### Provider-specific keys (single-key form)
Use plain provider key strings. Examples:
- `NVIDIA_API_KEY=nvapi-xxxx`
- `OPENAI_API_KEY=sk-xxxx`
- `GEMINI_API_KEY=AIzaSyxxxx`

Full list:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `KILOCODE_API_KEY`
- `OPENCODE_API_KEY`
- `ZAI_API_KEY`
- `MOONSHOT_API_KEY`
- `KIMI_API_KEY`
- `MINIMAX_API_KEY`
- `MODELSTUDIO_API_KEY`
- `XIAOMI_API_KEY`
- `VOLCANO_ENGINE_API_KEY`
- `BYTEPLUS_API_KEY`
- `QIANFAN_API_KEY`
- `MISTRAL_API_KEY`
- `XAI_API_KEY`
- `NVIDIA_API_KEY`
- `COHERE_API_KEY`
- `GROQ_API_KEY`
- `TOGETHER_API_KEY`
- `CEREBRAS_API_KEY`
- `VENICE_API_KEY`
- `SYNTHETIC_API_KEY`
- `COPILOT_GITHUB_TOKEN`
- `HUGGINGFACE_HUB_TOKEN`
- `AI_GATEWAY_API_KEY`

### Provider key pools (comma-separated rotation)
Format: comma-separated keys, no spaces required. Examples:
- `NVIDIA_API_KEYS=nvapi-key1,nvapi-key2`
- `OPENAI_API_KEYS=sk-a,sk-b,sk-c`

Full list:
- `ANTHROPIC_API_KEYS`
- `OPENAI_API_KEYS`
- `GEMINI_API_KEYS`
- `DEEPSEEK_API_KEYS`
- `OPENROUTER_API_KEYS`
- `KILOCODE_API_KEYS`
- `OPENCODE_API_KEYS`
- `ZAI_API_KEYS`
- `MOONSHOT_API_KEYS`
- `MINIMAX_API_KEYS`
- `XIAOMI_API_KEYS`
- `VOLCANO_ENGINE_API_KEYS`
- `BYTEPLUS_API_KEYS`
- `MISTRAL_API_KEYS`
- `XAI_API_KEYS`
- `NVIDIA_API_KEYS`
- `GROQ_API_KEYS`
- `COHERE_API_KEYS`
- `TOGETHER_API_KEYS`
- `CEREBRAS_API_KEYS`
- `HUGGINGFACE_HUB_TOKENS`

### Telegram / WhatsApp
- `TELEGRAM_BOT_TOKEN` — bot token string. Example: `TELEGRAM_BOT_TOKEN=123456:ABC...`
- `TELEGRAM_ALLOWED_USERS` — comma-separated numeric IDs. Example: `TELEGRAM_ALLOWED_USERS=12345,67890`
- `TELEGRAM_USER_ID` — legacy single numeric ID. Example: `TELEGRAM_USER_ID=12345`
- `TELEGRAM_USER_IDS` — legacy comma-separated IDs. Example: `TELEGRAM_USER_IDS=12345,67890`
- `WHATSAPP_ENABLED` — boolean-like (`true/false`, `1/0`, `yes/no`, `on/off`). Example: `WHATSAPP_ENABLED=true`

### Backup/sync
- `HF_TOKEN` — HF token string. Example: `HF_TOKEN=hf_xxxxx`
- `HF_USERNAME` — HF username string. Example: `HF_USERNAME=myhandle`
- `BACKUP_DATASET_NAME` — dataset slug string. Example: `BACKUP_DATASET_NAME=huggingclaw-backup`
- `SYNC_INTERVAL` — integer seconds. Example: `SYNC_INTERVAL=180`
- `SYNC_START_DELAY` — integer seconds. Example: `SYNC_START_DELAY=10`
- `SYNC_MAX_FILE_BYTES` — integer bytes. Example: `SYNC_MAX_FILE_BYTES=52428800`
- `OPENCLAW_CONFIG_WATCH_INTERVAL` — number (supports decimal seconds). Example: `OPENCLAW_CONFIG_WATCH_INTERVAL=1`
- `OPENCLAW_CONFIG_SETTLE_SECONDS` — number (supports decimal seconds). Example: `OPENCLAW_CONFIG_SETTLE_SECONDS=3`

### Gateway/runtime tuning
- `GATEWAY_HOST` — hostname/IP string. Example: `GATEWAY_HOST=127.0.0.1`
- `GATEWAY_PORT` — integer port. Example: `GATEWAY_PORT=3456`
- `GATEWAY_VERBOSE` — boolean-like. Example: `GATEWAY_VERBOSE=true`
- `GATEWAY_READY_TIMEOUT` — integer seconds. Example: `GATEWAY_READY_TIMEOUT=60`
- `GATEWAY_MAX_RESTARTS` — integer count. Example: `GATEWAY_MAX_RESTARTS=10`
- `GATEWAY_RESTART_DELAY` — integer seconds. Example: `GATEWAY_RESTART_DELAY=2`
- `TRUSTED_PROXIES` — comma-separated CIDR/IP list. Example: `TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8`
- `ALLOWED_ORIGINS` — comma-separated origins. Example: `ALLOWED_ORIGINS=https://a.com,https://b.com`
- `PORT` — integer external port. Example: `PORT=7860`

### Browser/plugin controls
- `BROWSER_PLUGIN_MODE` — mode string (`auto`, `builtin`, `external`, etc. depending on runtime). Example: `BROWSER_PLUGIN_MODE=auto`
- `BROWSER_EXECUTABLE_PATH` — absolute path. Example: `BROWSER_EXECUTABLE_PATH=/usr/bin/chromium`
- `BROWSER_DISABLED` — boolean-like. Example: `BROWSER_DISABLED=false`
- `ACP_PLUGIN_MODE` — mode string. Example: `ACP_PLUGIN_MODE=auto`
- `ACPX_DISABLED` — boolean-like. Example: `ACPX_DISABLED=true`

### OpenClaw logging/behavior
- `OPENCLAW_VERSION` — image/app version string. Example: `OPENCLAW_VERSION=latest`
- `OPENCLAW_RUNTIME_VERSION` — runtime tag string. Example: `OPENCLAW_RUNTIME_VERSION=v1.2.3`
- `OPENCLAW_DISPLAY_VERSION` — display label string. Example: `OPENCLAW_DISPLAY_VERSION=Custom`
- `OPENCLAW_DISABLE_BONJOUR` — boolean-like. Example: `OPENCLAW_DISABLE_BONJOUR=true`
- `OPENCLAW_CONSOLE_LOG_LEVEL` — log level (`trace|debug|info|warn|error`). Example: `OPENCLAW_CONSOLE_LOG_LEVEL=warn`
- `OPENCLAW_CONSOLE_LOG_STYLE` — style string. Example: `OPENCLAW_CONSOLE_LOG_STYLE=pretty`
- `OPENCLAW_FILE_LOG_LEVEL` — log level (`trace|debug|info|warn|error`). Example: `OPENCLAW_FILE_LOG_LEVEL=info`

### Custom OpenAI-compatible provider
- `CUSTOM_PROVIDER_NAME` — unique provider prefix. Example: `CUSTOM_PROVIDER_NAME=modal`
- `CUSTOM_BASE_URL` — base URL only (not `/chat/completions`). Example: `CUSTOM_BASE_URL=https://api.modal.com/v1`
- `CUSTOM_MODEL_ID` — model id string. Example: `CUSTOM_MODEL_ID=zai-org/GLM-5.1-FP8`
- `CUSTOM_MODEL_NAME` — display name. Example: `CUSTOM_MODEL_NAME=GLM 5.1 FP8`
- `CUSTOM_API_KEY` — provider key string. Example: `CUSTOM_API_KEY=sk-xxxx`
- `CUSTOM_API_TYPE` — API mode string. Example: `CUSTOM_API_TYPE=openai-completions`
- `CUSTOM_CONTEXT_WINDOW` — integer token window. Example: `CUSTOM_CONTEXT_WINDOW=128000`
- `CUSTOM_MAX_TOKENS` — integer max tokens. Example: `CUSTOM_MAX_TOKENS=500`

### Cloudflare proxy/keepalive
- `CLOUDFLARE_WORKERS_TOKEN` — API token string. Example: `CLOUDFLARE_WORKERS_TOKEN=cf_xxx`
- `CLOUDFLARE_WORKER_NAME` — worker name string. Example: `CLOUDFLARE_WORKER_NAME=huggingclaw-proxy`
- `CLOUDFLARE_ACCOUNT_ID` — account id string. Example: `CLOUDFLARE_ACCOUNT_ID=abc123...`
- `CLOUDFLARE_PROXY_URL` — full proxy URL. Example: `CLOUDFLARE_PROXY_URL=https://my-worker.workers.dev`
- `CLOUDFLARE_PROXY_SECRET` — shared secret string. Example: `CLOUDFLARE_PROXY_SECRET=long-random-secret`
- `CLOUDFLARE_PROXY_DOMAINS` — comma-separated domains. Example: `CLOUDFLARE_PROXY_DOMAINS=api.openai.com,api.anthropic.com`
- `CLOUDFLARE_PROXY_DEBUG` — boolean-like. Example: `CLOUDFLARE_PROXY_DEBUG=false`
- `CLOUDFLARE_KEEPALIVE_ENABLED` — boolean-like. Example: `CLOUDFLARE_KEEPALIVE_ENABLED=true`
- `CLOUDFLARE_KEEPALIVE_URL` — URL string. Example: `CLOUDFLARE_KEEPALIVE_URL=https://space-url.hf.space`
- `CLOUDFLARE_KEEPALIVE_CRON` — cron string. Example: `CLOUDFLARE_KEEPALIVE_CRON=*/5 * * * *`
- `CLOUDFLARE_KEEPALIVE_WORKER_NAME` — worker name string. Example: `CLOUDFLARE_KEEPALIVE_WORKER_NAME=huggingclaw-keepalive`

### Startup command replay/install helpers
- `HUGGINGCLAW_RUN` — shell commands string. Example: `HUGGINGCLAW_RUN=apt-get update && apt-get install -y ffmpeg`
- `HUGGINGCLAW_APT_PACKAGES` — comma/space separated package names. Example: `HUGGINGCLAW_APT_PACKAGES=ffmpeg,git`
- `HUGGINGCLAW_PIP_PACKAGES` — pip package list string. Example: `HUGGINGCLAW_PIP_PACKAGES=yt-dlp,requests`
- `HUGGINGCLAW_NPM_PACKAGES` — npm package list string. Example: `HUGGINGCLAW_NPM_PACKAGES=sharp,axios`
- `HUGGINGCLAW_OPENCLAW_PLUGINS` — plugin ids list string. Example: `HUGGINGCLAW_OPENCLAW_PLUGINS=@openclaw/telegram,@openclaw/whatsapp`
- `HUGGINGCLAW_STARTUP_SCRIPT` — shell script string. Example: `HUGGINGCLAW_STARTUP_SCRIPT=echo hello`
- `HUGGINGCLAW_STARTUP_SCRIPT_B64` — base64 script content. Example: `HUGGINGCLAW_STARTUP_SCRIPT_B64=IyEvYmluL2Jhc2gKZWNobyBoaQ==`
- `HUGGINGCLAW_STARTUP_COMMANDS` — newline/semicolon commands string.
- `HUGGINGCLAW_STARTUP_STRICT` — boolean-like. Example: `HUGGINGCLAW_STARTUP_STRICT=true`
- `WEBHOOK_URL` — webhook endpoint URL. Example: `WEBHOOK_URL=https://hooks.example.com/hc`

---

## 2) Runtime/Internal envs (normally do **not** set manually)

These are mostly derived/temporary/process variables used by scripts:

- `APP_BASE`
- `BACKUP_DATASET`
- `BROWSER_SHOULD_ENABLE`
- `CF_PROXY_ENV_FILE`
- `CLEAN_TG_TOKEN`
- `CONFIG_JSON`
- `CUSTOM_BASE_URL_NORMALIZED`
- `CUSTOM_PROVIDER_NORMALIZED`
- `CUSTOM_PROVIDER_OK`
- `DEBIAN_FRONTEND`
- `ERRORS`
- `EXISTING_CONFIG`
- `GATEWAY_EXIT_CODE`
- `GATEWAY_PID`
- `GATEWAY_RESTART_COUNT`
- `GUARDIAN_PID`
- `HC_STARTUP_FAILURES`
- `HC_STARTUP_INDEX`
- `HC_STARTUP_STRICT_NORMALIZED`
- `HC_STARTUP_VAR`
- `HOME`
- `IDS_JSON`
- `INSTALLS`
- `LLM_PROVIDER`
- `NODE_OPTIONS`
- `NPM_CONFIG_PREFIX`
- `OPENCLAW_APP_DIR`
- `OPENCLAW_CONSOLE_LOG_LEVEL_CONFIGURED`
- `OPENCLAW_CONSOLE_LOG_STYLE_CONFIGURED`
- `OPENCLAW_FILE_LOG_LEVEL_CONFIGURED`
- `ORIGINS_JSON`
- `PATCHED`
- `PATH`
- `PLUGIN_ALLOW_JSON`
- `PROXIES_JSON`
- `PROXY_URL`
- `PYTHONUSERBASE`
- `RESET_MARKER_PATH`
- `SPACE_AUTHOR_NAME`
- `SPACE_HOST`
- `SPACE_REPO_NAME`
- `STARTUP_FILE`
- `SYNC_LOOP_PID`
- `VIRTUAL_ENV`
- `WEBHOOK_BODY`
- `WHATSAPP_CONFIG_ENABLED`
- `WHATSAPP_ENABLED_CONFIGURED`
- `WHATSAPP_ENABLED_NORMALIZED`

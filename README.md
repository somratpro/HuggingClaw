---
title: HuggingClaw
emoji: 🦞
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: true
---

<!-- Badges -->
[![GitHub Stars](https://img.shields.io/github/stars/somratpro/huggingclaw?style=flat-square)](https://github.com/somratpro/huggingclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![HF Space](https://img.shields.io/badge/🤗%20HuggingFace-Space-blue?style=flat-square)](https://huggingface.co/spaces)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Gateway-red?style=flat-square)](https://github.com/openclaw/openclaw)

# 🦞 HuggingClaw

Run your own **always-on AI assistant** on HuggingFace Spaces — for free.

Works with **any LLM** (Anthropic, OpenAI, Google), connects via **Telegram**, and persists your workspace to **HF Datasets** automatically.

### ✨ Features

- **Zero-config** — just add 3 secrets and deploy
- **Any LLM provider** — Claude, GPT-4, Gemini, DeepSeek, Qwen, Grok, and [40+ more](#-llm-provider-setup)
- **Fast builds** — uses pre-built OpenClaw Docker image (minutes, not 30+)
- **Smart workspace sync** — uses `huggingface_hub` Python library (more reliable than git for HF)
- **Built-in keep-alive** — self-pings to prevent HF sleep (no external cron needed)
- **Auto-create backup** — creates the HF Dataset for you if it doesn't exist
- **Graceful shutdown** — saves workspace before container dies
- **Multi-user Telegram** — supports comma-separated user IDs for teams
- **Health endpoint** — `/health` for monitoring
- **Password or token auth** — choose what works for you
- **100% HF-native** — runs entirely on HuggingFace infrastructure

---

## 🎥 Video Tutorial
https://www.youtube.com/watch?v=S6pl7NmjX7g&t=73s

---

## 🚀 Quick Start

### 1. Duplicate this Space
[![Duplicate this Space](https://huggingface.co/datasets/huggingface/badges/resolve/main/duplicate-this-space-xl.svg)](https://huggingface.co/spaces/somratpro/HuggingClaw?duplicate=true)

Click the button above → name it → set to **Private**

### 2. Add Required Secrets
Go to **Settings → Secrets**:

| Secret | Value |
|--------|-------|
| `LLM_API_KEY` | Your API key ([Anthropic](https://console.anthropic.com/) / [OpenAI](https://platform.openai.com/) / [Google](https://ai.google.dev/)) |
| `LLM_MODEL` | Model to use (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4-5`, `openai/gpt-4`) |
| `GATEWAY_TOKEN` | Run `openssl rand -hex 32` to generate |

### 3. Deploy
That's it! The Space builds and starts automatically.

### 4. (Optional) Add Telegram
| Secret | Value |
|--------|-------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_USER_ID` | Your user ID ([how to find](https://t.me/userinfobot)) |

### 5. (Optional) Enable Workspace Backup
| Secret | Value |
|--------|-------|
| `HF_USERNAME` | Your HuggingFace username |
| `HF_TOKEN` | [HF token](https://huggingface.co/settings/tokens) with write access |

The backup dataset (`huggingclaw-backup`) is **created automatically** — no manual setup needed.

---

## 📋 All Configuration Options

See **`.env.example`** for the complete reference with examples.

#### Required

| Variable | Purpose |
|----------|---------|
| `LLM_API_KEY` | LLM provider API key |
| `LLM_MODEL` | Model to use (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4-5`, `openai/gpt-4`) — auto-detects provider from prefix |
| `GATEWAY_TOKEN` | Gateway auth token |

#### Telegram

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_USER_ID` | Single user allowlist |
| `TELEGRAM_USER_IDS` | Multiple users (comma-separated): `123,456,789` |

#### Workspace Backup

| Variable | Default | Purpose |
|----------|---------|---------|
| `HF_USERNAME` | — | Your HF username |
| `HF_TOKEN` | — | HF token (write access) |
| `BACKUP_DATASET_NAME` | `huggingclaw-backup` | Dataset name (auto-created!) |
| `WORKSPACE_GIT_USER` | `openclaw@example.com` | Git commit email |
| `WORKSPACE_GIT_NAME` | `OpenClaw Bot` | Git commit name |

#### Background Services

| Variable | Default | Purpose |
|----------|---------|---------|
| `KEEP_ALIVE_INTERVAL` | `300` (5 min) | Self-ping interval. `0` = disable |
| `SYNC_INTERVAL` | `600` (10 min) | Auto-sync interval |

#### Security (Optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCLAW_PASSWORD` | — | Password auth (simpler alternative to token) |
| `TRUSTED_PROXIES` | — | Comma-separated proxy IPs (fixes auth issues behind reverse proxies) |
| `ALLOWED_ORIGINS` | — | Comma-separated URLs to lock down Control UI |

#### Advanced

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCLAW_VERSION` | `latest` | Pin OpenClaw version |
| `HEALTH_PORT` | `7861` | Health endpoint port |

---

## 🤖 LLM Provider Setup

Just set `LLM_MODEL` with the correct provider prefix — **any provider is supported**! The provider is auto-detected from the model name. All provider IDs from [OpenClaw docs](https://docs.openclaw.ai/concepts/model-providers).

### Anthropic (Claude)
```
LLM_API_KEY=sk-ant-v0-...
LLM_MODEL=anthropic/claude-sonnet-4-5
```
Models: `anthropic/claude-opus-4-6` · `anthropic/claude-sonnet-4-6` · `anthropic/claude-sonnet-4-5` · `anthropic/claude-haiku-4-5`

### OpenAI
```
LLM_API_KEY=sk-...
LLM_MODEL=openai/gpt-5.4
```
Models: `openai/gpt-5.4-pro` · `openai/gpt-5.4` · `openai/gpt-5.4-mini` · `openai/gpt-5.4-nano` · `openai/gpt-4.1` · `openai/gpt-4.1-mini`

### Google (Gemini)
```
LLM_API_KEY=AIzaSy...
LLM_MODEL=google/gemini-2.5-flash
```
Models: `google/gemini-3.1-pro-preview` · `google/gemini-3-flash-preview` · `google/gemini-2.5-pro` · `google/gemini-2.5-flash`

### DeepSeek
```
LLM_API_KEY=sk-...
LLM_MODEL=deepseek/deepseek-v3.2
```
Models: `deepseek/deepseek-v3.2` · `deepseek/deepseek-r1-0528` · `deepseek/deepseek-r1`
Get key from: [DeepSeek Platform](https://platform.deepseek.com)

### OpenCode Zen (tested & verified models)
```
LLM_API_KEY=your_opencode_api_key
LLM_MODEL=opencode/claude-opus-4-6
```
Models: `opencode/claude-opus-4-6` · `opencode/gpt-5.4`
Get key from: [OpenCode.ai](https://opencode.ai/auth)

### OpenCode Go (low-cost open models)
```
LLM_API_KEY=your_opencode_api_key
LLM_MODEL=opencode-go/kimi-k2.5
```
Get key from: [OpenCode.ai](https://opencode.ai/auth)

### Z.ai (GLM)
```
LLM_API_KEY=your_zai_api_key
LLM_MODEL=zai/glm-5
```
Models: `zai/glm-5` · `zai/glm-5-turbo` · `zai/glm-4.7` · `zai/glm-4.7-flash`
Get key from: [Z.ai](https://z.ai) · Note: `z-ai/` and `z.ai/` prefixes auto-normalize to `zai/`

### Moonshot (Kimi)
```
LLM_API_KEY=sk-...
LLM_MODEL=moonshot/kimi-k2.5
```
Models: `moonshot/kimi-k2.5` · `moonshot/kimi-k2-thinking`
Get key from: [Moonshot API](https://platform.moonshot.cn)

### Mistral
```
LLM_API_KEY=your_mistral_api_key
LLM_MODEL=mistral/mistral-large-latest
```
Models: `mistral/mistral-large-latest` · `mistral/mistral-small-2603` · `mistral/devstral-medium` · `mistral/codestral-2508`
Get key from: [Mistral Console](https://console.mistral.ai)

### xAI (Grok)
```
LLM_API_KEY=your_xai_api_key
LLM_MODEL=xai/grok-4.20-beta
```
Models: `xai/grok-4.20-beta` · `xai/grok-4` · `xai/grok-4.1-fast`
Get key from: [xAI Console](https://console.x.ai)

### MiniMax
```
LLM_API_KEY=your_minimax_api_key
LLM_MODEL=minimax/minimax-m2.7
```
Models: `minimax/minimax-m2.7` · `minimax/minimax-m2.5`
Get key from: [MiniMax Platform](https://platform.minimax.io)

### NVIDIA
```
LLM_API_KEY=your_nvidia_api_key
LLM_MODEL=nvidia/nemotron-3-super-120b-a12b
```
Get key from: [NVIDIA API](https://api.nvidia.com)

### Xiaomi (MiMo)
```
LLM_API_KEY=your_xiaomi_api_key
LLM_MODEL=xiaomi/mimo-v2-pro
```
Models: `xiaomi/mimo-v2-pro` · `xiaomi/mimo-v2-omni`

### Volcengine (Doubao / ByteDance)
```
LLM_API_KEY=your_volcengine_api_key
LLM_MODEL=volcengine/doubao-seed-1-8-251228
```
Models: `volcengine/doubao-seed-1-8-251228` · `volcengine/kimi-k2-5-260127` · `volcengine/glm-4-7-251222`
Get key from: [Volcengine](https://www.volcengine.com)

### Groq
```
LLM_API_KEY=your_groq_api_key
LLM_MODEL=groq/mixtral-8x7b-32768
```
Get key from: [Groq Console](https://console.groq.com)

### Cohere
```
LLM_API_KEY=your_cohere_api_key
LLM_MODEL=cohere/command-a
```
Get key from: [Cohere Dashboard](https://dashboard.cohere.com)

### HuggingFace Inference
```
LLM_API_KEY=hf_your_token
LLM_MODEL=huggingface/deepseek-ai/DeepSeek-R1
```
Get key from: [HuggingFace Tokens](https://huggingface.co/settings/tokens)

### OpenRouter (300+ models via single API key)
```
LLM_API_KEY=sk-or-v1-...
LLM_MODEL=openrouter/anthropic/claude-sonnet-4-6
```
With OpenRouter, you can access **every model above** with a single API key! Just prefix with `openrouter/`:
- `openrouter/anthropic/claude-sonnet-4-6` — Anthropic Claude
- `openrouter/openai/gpt-5.4` — OpenAI
- `openrouter/deepseek/deepseek-v3.2` — DeepSeek
- `openrouter/google/gemini-2.5-flash` — Google Gemini
- `openrouter/meta-llama/llama-3.3-70b-instruct:free` — Llama (free!)
- `openrouter/moonshotai/kimi-k2.5` — Moonshot Kimi
- `openrouter/z-ai/glm-5-turbo` — Z.ai GLM

Get key from: [OpenRouter.ai](https://openrouter.ai) · [Full model list](https://openrouter.ai/models)

### Kilo Gateway
```
LLM_API_KEY=your_kilocode_api_key
LLM_MODEL=kilocode/anthropic/claude-opus-4.6
```
Get key from: [Kilo.ai](https://kilo.ai)

### Any Other Provider
HuggingClaw supports **any LLM provider** that OpenClaw supports. Just use:
```
LLM_API_KEY=your_api_key
LLM_MODEL=provider/model-name
```
The provider prefix is auto-detected and mapped to the appropriate environment variable.

Full provider list: [OpenClaw Model Providers](https://docs.openclaw.ai/concepts/model-providers) · [OpenCode Providers](https://opencode.ai/docs/providers)

---

## 📱 Telegram Setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token
2. Message [@userinfobot](https://t.me/userinfobot) to get your user ID
3. Add secrets: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_USER_ID`
4. Restart the Space → DM your bot 🎉

**Multiple users?** Use `TELEGRAM_USER_IDS=123,456,789` (comma-separated)

---

## 💾 Workspace Backup

Set `HF_USERNAME` + `HF_TOKEN` and HuggingClaw handles everything:

1. **Auto-creates** the dataset if it doesn't exist
2. **Restores** workspace on every startup
3. **Smart sync** — uses `huggingface_hub` Python library (handles auth, LFS, retries automatically; falls back to git if unavailable)
4. **Auto-syncs** changes every 10 minutes (configurable via `SYNC_INTERVAL`)
5. **Saves** on shutdown (graceful SIGTERM handling)

Custom dataset name: `BACKUP_DATASET_NAME=my-custom-backup`

---

## 💓 How It Stays Alive

HF Spaces sleeps after 48h of no HTTP requests. HuggingClaw prevents this with:

- **Self-ping** — pings its own URL every 5 min (uses HF's `SPACE_HOST` env var)
- **Health endpoint** — returns `200 OK` with uptime info
- **Zero dependencies** — no external cron, no third-party pinger

Your Space runs forever, powered entirely by HF. 🎯

---

## 💻 Local Development

```bash
git clone https://github.com/somratpro/huggingclaw.git
cd huggingclaw
cp .env.example .env
nano .env  # fill in your values
```

**Docker:**
```bash
docker build -t huggingclaw .
docker run -p 7860:7860 --env-file .env huggingclaw
```

**Without Docker:**
```bash
npm install -g openclaw@latest
export $(cat .env | xargs)
bash start.sh
```

---

## 🔗 Connect via CLI

```bash
npm install -g openclaw@latest
openclaw channels login --gateway https://YOUR-SPACE-URL.hf.space
# Enter your GATEWAY_TOKEN when prompted
```

---

## 🏗️ Architecture

```
HuggingClaw/
├── Dockerfile          # Multi-stage build with pre-built OpenClaw image
├── start.sh            # Config generator + validation + orchestrator
├── keep-alive.sh       # Self-ping to prevent HF sleep
├── workspace-sync.py   # Smart sync via huggingface_hub (with git fallback)
├── health-server.js    # Health endpoint (/health)
├── dns-fix.js          # DNS override for HF network restrictions
├── .env.example        # Complete configuration reference
└── README.md           # You are here
```

**Startup flow:**
1. Validate secrets → fail fast with clear errors
2. Validate HF token → warn if expired
3. Auto-create backup dataset if missing
4. Restore workspace from HF Dataset
5. Generate `openclaw.json` config from env vars
6. Print startup summary
7. Start background services (keep-alive, auto-sync)
8. Launch OpenClaw gateway
9. On SIGTERM → save workspace → exit cleanly

---

## 🐛 Troubleshooting

**Missing secrets** → Check **Settings → Secrets** for `LLM_API_KEY` and `GATEWAY_TOKEN`

**Telegram not working** → Verify bot token is valid, check logs for `📱 Enabling Telegram`

**Workspace not restoring** → Check `HF_USERNAME` and `HF_TOKEN` are set, token has write access

**Space sleeping** → Check logs for `💓 Keep-alive started`. If missing, `SPACE_HOST` might not be set

**"Proxy headers detected" or auth errors** → Set `TRUSTED_PROXIES` with the IPs from your Space logs (`remote=x.x.x.x`)

**Control UI blocked** → Set `ALLOWED_ORIGINS=https://your-space.hf.space` or check logs for origin errors

**Version issues** → Pin with `OPENCLAW_VERSION=2026.3.24` in secrets

---

## 📚 Links

- [OpenClaw Docs](https://docs.openclaw.ai) · [OpenClaw GitHub](https://github.com/openclaw/openclaw) · [HF Spaces Docs](https://huggingface.co/docs/hub/spaces)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

Made with ❤️ by [@somratpro](https://github.com/somratpro) for the [OpenClaw](https://github.com/openclaw/openclaw) community

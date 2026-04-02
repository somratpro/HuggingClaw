---
title: HuggingClaw
emoji: 🦞
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7861
base_path: /dashboard
pinned: true
license: mit
---

<!-- Badges -->
[![GitHub Stars](https://img.shields.io/github/stars/somratpro/huggingclaw?style=flat-square)](https://github.com/somratpro/huggingclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![HF Space](https://img.shields.io/badge/🤗%20HuggingFace-Space-blue?style=flat-square)](https://huggingface.co/spaces)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Gateway-red?style=flat-square)](https://github.com/openclaw/openclaw)

**Your always-on AI assistant — free, no server needed.** HuggingClaw runs [OpenClaw](https://openclaw.ai) on HuggingFace Spaces, giving you a 24/7 AI chat assistant on Telegram and WhatsApp. It works with *any* large language model (LLM) – Claude, ChatGPT, Gemini, etc. – and even supports custom models via [OpenRouter](https://openrouter.ai). Deploy in minutes on the free HF Spaces tier (2 vCPU, 16GB RAM, 50GB) with automatic workspace backup to a HuggingFace Dataset so your chat history and settings persist across restarts.

## Table of Contents

- [✨ Features](#-features)
- [🎥 Video Tutorial](#-video-tutorial)
- [🚀 Quick Start](#-quick-start)
- [📱 Telegram Setup *(Optional)*](#-telegram-setup-optional)
- [💬 WhatsApp Setup *(Optional)*](#-whatsapp-setup-optional)
- [💾 Workspace Backup *(Optional)*](#-workspace-backup-optional)
- [📊 Dashboard & Monitoring](#-dashboard--monitoring)
- [🔔 Webhooks *(Optional)*](#-webhooks-optional)
- [⚙️ Full Configuration Reference](#-full-configuration-reference)
- [🤖 LLM Providers](#-llm-providers)
- [💻 Local Development](#-local-development)
- [🔗 CLI Access](#-cli-access)
- [🏗️ Architecture](#-architecture)
- [💓 Staying Alive](#-staying-alive)
- [🐛 Troubleshooting](#-troubleshooting)
- [📚 Links](#-links)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

- 🔌 **Any LLM:** Use Claude, OpenAI GPT, Google Gemini, Grok, DeepSeek, Qwen, and 40+ providers (set `LLM_API_KEY` and `LLM_MODEL` accordingly).
- ⚡ **Zero Config:** Duplicate this Space and set **just three** secrets (LLM_API_KEY, LLM_MODEL, GATEWAY_TOKEN) – no other setup needed.
- 🐳 **Fast Builds:** Uses a pre-built OpenClaw Docker image to deploy in minutes.
- 💾 **Workspace Backup:** Chats and settings sync to a private HF Dataset via the `huggingface_hub` (Git fallback), preserving data automatically.
- 💓 **Always-On:** Built-in keep-alive pings prevent the HF Space from sleeping, so the assistant is always online.
- 👥 **Multi-User Messaging:** Support for Telegram (multi-user) and WhatsApp (pairing).
- 📊 **Visual Dashboard:** Beautiful Web UI to monitor uptime, sync status, and active models.
- 🔔 **Webhooks:** Get notified on restarts or backup failures via standard webhooks.
- 🔐 **Flexible Auth:** Secure the Control UI with either a gateway token or password.
- 🏠 **100% HF-Native:** Runs entirely on HuggingFace’s free infrastructure (2 vCPU, 16GB RAM).

## 🎥 Video Tutorial

Watch a quick walkthrough on YouTube: [Deploying HuggingClaw on HF Spaces](https://www.youtube.com/watch?v=S6pl7NmjX7g&t=73s).

## 🚀 Quick Start

### Step 1: Duplicate this Space

[![Duplicate this Space](https://huggingface.co/datasets/huggingface/badges/resolve/main/duplicate-this-space-xl.svg)](https://huggingface.co/spaces/somratpro/HuggingClaw?duplicate=true)

Click the button above to duplicate the template. And set the visibility to **Private** (recommended).

### Step 2: Add Your Secrets

Navigate to your new Space's **Settings**, scroll down to the **Variables and secrets** section, and add the following three under **Secrets**:

- `LLM_API_KEY` – Your provider API key (e.g., Anthropic, OpenAI, OpenRouter).
- `LLM_MODEL` – The model ID string you wish to use (e.g., `openai/gpt-4o` or `google/gemini-2.5-flash`).
- `GATEWAY_TOKEN` – A custom password or token to secure your Control UI. *(You can use any strong password, or generate one with `openssl rand -hex 32` if you prefer).*

> [!TIP]
> HuggingClaw is completely flexible! You only need these three secrets to get started. You can set other secrets later.

Optional: if you want to pin a specific OpenClaw release instead of `latest`, add `OPENCLAW_VERSION` under **Variables** in your Space settings. For Docker Spaces, HF passes Variables as build args during image build, so this should be a Variable, not a Secret.

### Step 3: Deploy & Run

That's it! The Space will build the container and start up automatically. You can monitor the build process in the **Logs** tab.

## 📱 Telegram Setup *(Optional)*

To chat via Telegram:

1. Create a bot via [@BotFather](https://t.me/BotFather): send `/newbot`, follow prompts, and copy the bot token.
2. Find your Telegram user ID with [@userinfobot](https://t.me/userinfobot).
3. Add these secrets in Settings → Secrets:
   - `TELEGRAM_BOT_TOKEN` – The token from @BotFather.
   - `TELEGRAM_USER_ID` – Your Telegram user ID (for a single user).
   - `TELEGRAM_USER_IDS` – Comma-separated user IDs (for team access, e.g. `123,456,789`).

After restarting, the bot should appear online on Telegram.

## 💬 WhatsApp Setup *(Optional)*

To use WhatsApp:

1. Visit your Space URL. It opens the dashboard at `/dashboard` by default, then click **Open Control UI**.
2. In the Control UI, go to **Channels** → **WhatsApp** → **Login**.
3. Scan the QR code with your phone. 📱

## 💾 Workspace Backup *(Optional)*

For persistent chat history and configuration:

- Set `HF_USERNAME` to your HuggingFace username.
- Set `HF_TOKEN` to a HuggingFace token with write access.

Optionally set `BACKUP_DATASET_NAME` (default: `huggingclaw-backup`) to choose the HF Dataset name. On first run, HuggingClaw will create (or use) the private Dataset repo `HF_USERNAME/SPACE-backup`, then restore your workspace on startup and sync changes every 10 minutes. The workspace is also saved on graceful shutdown. This ensures your data survives restarts.

## 📊 Dashboard & Monitoring

HuggingClaw now features a built-in dashboard at `/dashboard`, served from the same public HF Space URL as the Control UI:

- **Uptime Tracking:** Real-time uptime monitoring.
- **Sync Status:** Visual indicators for workspace backup operations.
- **Model Info:** See which LLM is currently powering your assistant.

## 🔔 Webhooks *(Optional)*

Get notified when your Space restarts or if a backup fails:

- Set `WEBHOOK_URL` to your endpoint (e.g., Make.com, IFTTT, Discord Webhook).
- HuggingClaw sends a POST JSON payload with event details.

## ⚙️ Full Configuration Reference

See `.env.example` for runtime settings. Key configuration values:

### Core

| Variable        | Description                                                 |
|-----------------|-------------------------------------------------------------|
| `LLM_API_KEY`   | LLM provider API key (e.g. OpenAI, Anthropic, etc.)         |
| `LLM_MODEL`     | Model ID (prefix `<provider>/`, auto-detected from prefix)  |
| `GATEWAY_TOKEN` | Gateway token for Control UI access (required)              |

### Background Services

| Variable              | Default | Description                                 |
|-----------------------|---------|---------------------------------------------|
| `KEEP_ALIVE_INTERVAL` | `300`   | Self-ping interval in seconds (0 to disable)|
| `SYNC_INTERVAL`       | `600`   | Workspace sync interval (sec.) to HF Dataset|

### Security

| Variable             | Description                                             |
|----------------------|---------------------------------------------------------|
| `OPENCLAW_PASSWORD`  | (optional) Enable simple password auth instead of token |
| `TRUSTED_PROXIES`    | Comma-separated IPs of HF proxies                       |
| `ALLOWED_ORIGINS`    | Comma-separated allowed origins for Control UI          |

### Workspace Backup

| Variable              | Default              | Description                          |
|-----------------------|----------------------|--------------------------------------|
| `HF_USERNAME`         | —                    | Your HuggingFace username            |
| `HF_TOKEN`            | —                    | HF token with write access           |
| `BACKUP_DATASET_NAME` | `huggingclaw-backup` | Dataset name for backup repo         |
| `WORKSPACE_GIT_USER`  | `openclaw@example.com`| Git commit email for workspace sync  |
| `WORKSPACE_GIT_NAME`  | `OpenClaw Bot`       | Git commit name for workspace sync   |

### Advanced

| Variable           | Default  | Description                         |
|--------------------|----------|-------------------------------------|
| `OPENCLAW_VERSION` | `latest` | Build-time pin for the OpenClaw image tag |

## 🤖 LLM Providers

HuggingClaw supports **all providers** from OpenClaw. Set `LLM_MODEL=<provider/model>` and the provider is auto-detected. For example:

| Provider         | Prefix          | Example Model                         | API Key Source                                       |
|------------------|-----------------|---------------------------------------|------------------------------------------------------|
| **Anthropic**    | `anthropic/`    | `anthropic/claude-sonnet-4-6`         | [Anthropic Console](https://console.anthropic.com/) |
| **OpenAI**       | `openai/`       | `openai/gpt-5.4`                      | [OpenAI Platform](https://platform.openai.com/)     |
| **Google**       | `google/`       | `google/gemini-2.5-flash`             | [AI Studio](https://ai.google.dev/)                  |
| **DeepSeek**     | `deepseek/`     | `deepseek/deepseek-v3.2`              | [DeepSeek](https://platform.deepseek.com)            |
| **xAI (Grok)**   | `xai/`          | `xai/grok-4`                          | [xAI](https://console.x.ai)                          |
| **Mistral**      | `mistral/`      | `mistral/mistral-large-latest`        | [Mistral Console](https://console.mistral.ai)        |
| **Moonshot**     | `moonshot/`     | `moonshot/kimi-k2.5`                  | [Moonshot](https://platform.moonshot.cn)             |
| **Cohere**       | `cohere/`       | `cohere/command-a`                    | [Cohere Dashboard](https://dashboard.cohere.com)    |
| **Groq**         | `groq/`         | `groq/mixtral-8x7b-32768`             | [Groq](https://console.groq.com)                     |
| **MiniMax**      | `minimax/`      | `minimax/minimax-m2.7`                | [MiniMax](https://platform.minimax.io)               |
| **NVIDIA**       | `nvidia/`       | `nvidia/nemotron-3-super-120b-a12b`   | [NVIDIA API](https://api.nvidia.com)                |
| **Z.ai (GLM)**   | `zai/`          | `zai/glm-5`                           | [Z.ai](https://z.ai)                                 |
| **Volcengine**   | `volcengine/`   | `volcengine/doubao-seed-1-8-251228`   | [Volcengine](https://www.volcengine.com)            |
| **HuggingFace**  | `huggingface/`  | `huggingface/deepseek-ai/DeepSeek-R1` | [HF Tokens](https://huggingface.co/settings/tokens) |
| **OpenCode Zen** | `opencode/`     | `opencode/claude-opus-4-6`            | [OpenCode.ai](https://opencode.ai/auth)              |
| **OpenCode Go**  | `opencode-go/`  | `opencode-go/kimi-k2.5`               | [OpenCode.ai](https://opencode.ai/auth)              |
| **Kilo Gateway** | `kilocode/`     | `kilocode/anthropic/claude-opus-4.6`  | [Kilo.ai](https://kilo.ai)                           |

### OpenRouter – 200+ Models with One Key

Get an [OpenRouter](https://openrouter.ai) API key to use *all* providers. For example:

```bash
LLM_API_KEY=sk-or-v1-xxxxxxxx
LLM_MODEL=openrouter/openai/gpt-5.4
```

Popular options include `openrouter/google/gemini-2.5-flash` or `openrouter/meta-llama/llama-3.3-70b-instruct`.

### Any Other Provider

You can also use any custom provider:

```bash
LLM_API_KEY=your_api_key
LLM_MODEL=provider/model-name
```

The provider prefix in `LLM_MODEL` tells HuggingClaw how to call it. See [OpenClaw Model Providers](https://docs.openclaw.ai/concepts/model-providers) for the full list.

## 💻 Local Development

```bash
git clone https://github.com/somratpro/huggingclaw.git
cd huggingclaw
cp .env.example .env
# Edit .env with your secret values
```

**With Docker:**

```bash
docker build --build-arg OPENCLAW_VERSION=latest -t huggingclaw .
docker run -p 7861:7861 --env-file .env huggingclaw
```

**Without Docker:**

```bash
npm install -g openclaw@latest
export $(cat .env | xargs)
bash start.sh
```

## 🔗 CLI Access

After deploying, you can connect via the OpenClaw CLI (e.g., to onboard channels or run agents):

```bash
npm install -g openclaw@latest
openclaw channels login --gateway https://YOUR_SPACE_NAME.hf.space
# When prompted, enter your GATEWAY_TOKEN
```

## 🏗️ Architecture

```bash
HuggingClaw/
├── Dockerfile          # Multi-stage build using pre-built OpenClaw image
├── start.sh            # Config generator, validator, and orchestrator
├── keep-alive.sh       # Self-ping to prevent HF Space sleep
├── workspace-sync.py   # Syncs workspace to HF Datasets (with Git fallback)
├── health-server.js    # /health endpoint for uptime checks
├── dns-fix.js          # DNS-over-HTTPS fallback (for blocked domains)
├── .env.example        # Environment variable reference
└── README.md           # (this file)

**Startup sequence:**
1. Validate required secrets (fail fast with clear error).
2. Check HF token (warn if expired or missing).
3. Auto-create backup dataset if missing.
4. Restore workspace from HF Dataset.
5. Generate `openclaw.json` from environment variables.
6. Print startup summary.
7. Launch background tasks (keep-alive, auto-sync).
8. Launch the OpenClaw gateway (start listening).
9. On `SIGTERM`, save workspace and exit cleanly.
```

## 💓 Staying Alive

HuggingClaw keeps the Space awake without external cron tools:

- **Self-ping:** It periodically sends HTTP requests to its own URL (default every 5 minutes).  
- **Health endpoint:** `/health` returns `200 OK` and uptime info.  
- **No external deps:** Fully managed within HF Spaces (no outside pingers or servers).

## 🐛 Troubleshooting

- **Missing secrets:** Ensure `LLM_API_KEY`, `LLM_MODEL`, and `GATEWAY_TOKEN` are set in your Space **Settings → Secrets**.
- **Telegram bot issues:** Verify your `TELEGRAM_BOT_TOKEN`. Check Space logs for lines like `📱 Enabling Telegram`.
- **Backup restore failing:** Make sure `HF_USERNAME` and `HF_TOKEN` are correct (token needs write access to your Dataset).
- **Space keeps sleeping:** Check logs for `Keep-alive` messages. Ensure `KEEP_ALIVE_INTERVAL` isn’t set to `0`.
- **Auth errors / proxy:** If you see reverse-proxy auth errors, add the logged IPs under `TRUSTED_PROXIES` (from logs `remote=x.x.x.x`).
- **Control UI says too many failed authentication attempts:** Wait for the retry window to expire, then open the Space in an incognito window or clear site storage for your Space before entering the current `GATEWAY_TOKEN` again.
- **UI blocked (CORS):** Set `ALLOWED_ORIGINS=https://your-space-name.hf.space`.
- **Version mismatches:** Pin a specific OpenClaw build with the `OPENCLAW_VERSION` Variable in HF Spaces, or `--build-arg OPENCLAW_VERSION=...` locally.

## 📚 Links

- [OpenClaw Docs](https://docs.openclaw.ai)  
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)  
- [HuggingFace Spaces Docs](https://huggingface.co/docs/hub/spaces)  

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

*Made with ❤️ by [@somratpro](https://github.com/somratpro) for the OpenClaw community.*  

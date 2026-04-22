---
title: HuggingClaw
emoji: 🦞
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7861
pinned: true
license: mit
secrets:
  - name: LLM_API_KEY
    description: Your LLM provider API key (e.g. Anthropic, OpenAI, OpenRouter).
  - name: LLM_MODEL
    description: The model ID to use, e.g. openai/gpt-4o or google/gemini-2.5-flash.
  - name: GATEWAY_TOKEN
    description: A strong password or token to secure your OpenClaw Control UI.
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
- [🔔 Webhooks *(Optional)*](#-webhooks-optional)
- [🔐 Security & Advanced *(Optional)*](#-security--advanced-optional)
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
- 🌐 **Built-In Browser:** Headless Chromium is included in the Space, so browser actions work from the start.
- 💾 **Workspace Backup:** Chats, settings, and WhatsApp session state sync to a private HF Dataset via the `huggingface_hub` (Git fallback), preserving data automatically.
- ⏰ **External Keep-Alive:** Set up a one-time UptimeRobot monitor from the dashboard to help keep free HF Spaces awake.
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

Click the button above to duplicate the template.

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

### Step 4: Monitor & Manage

HuggingClaw features a built-in dashboard to track:

- **Uptime:** Real-time uptime monitoring.
- **Sync Status:** Visual indicators for workspace backup operations.
- **Chat Status:** Real-time connection status for WhatsApp and Telegram.
- **Model Info:** See which LLM is currently powering your assistant.

## 📱 Telegram Setup *(Optional)*

To chat via Telegram:

1. Create a bot via [@BotFather](https://t.me/BotFather): send `/newbot`, follow prompts, and copy the bot token.
2. Find your Telegram user ID with [@userinfobot](https://t.me/userinfobot).
3. Add these secrets in Settings → Secrets. After restarting, the bot should appear online on Telegram.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token from BotFather |
| `TELEGRAM_USER_ID` | — | Single Telegram user ID allowlist |
| `TELEGRAM_USER_IDS` | — | Comma-separated Telegram user IDs for team access |

## 💬 WhatsApp Setup *(Optional)*

To use WhatsApp, enable the channel and scan the QR code from the Control UI (**Channels** → **WhatsApp** → **Login**):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WHATSAPP_ENABLED` | `false` | Enable WhatsApp pairing support |

## 💾 Workspace Backup *(Optional)*

For persistent chat history and configuration, HuggingClaw can sync your workspace to a private HuggingFace Dataset. On first run, it will automatically create (or use) the Dataset repo `HF_USERNAME/SPACE-backup`, restore your workspace on startup, and sync changes periodically.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HF_USERNAME` | — | Your HuggingFace username |
| `HF_TOKEN` | — | HF token with write access |
| `BACKUP_DATASET_NAME` | `huggingclaw-backup` | Dataset name for backup repo |
| `SYNC_INTERVAL` | `180` | Sync interval in seconds |
| `WORKSPACE_GIT_USER` | `openclaw@example.com` | Git commit email for syncs |
| `WORKSPACE_GIT_NAME` | `OpenClaw Bot` | Git commit name for syncs |

> [!TIP]
> This backup also stores a hidden copy of your WhatsApp session credentials, allowing paired logins to survive Space restarts automatically.

## 💓 Staying Alive *(Recommended on Free HF Spaces)*

Free Hugging Face Spaces can still sleep. HuggingClaw does not rely on internal self-pings anymore. To help keep a public Space awake, set up an external UptimeRobot monitor from the dashboard.

Use the **Main API key** from UptimeRobot.
Do **not** use the `Read-only API key` or a `Monitor-specific API key`.

Setup:

1. Open `/`.
2. Find **Keep Space Awake**.
3. Paste your UptimeRobot **Main API key**.
4. Click **Create Monitor**.

What happens next:

- HuggingClaw creates a monitor for `https://your-space.hf.space/health`
- UptimeRobot keeps pinging it from outside Hugging Face
- You only need to do this once

You do **not** need to add this key to Hugging Face Space Secrets.

Note:

- This works for **public** Spaces.
- It does **not** work reliably for **private** Spaces, because external monitors cannot access private HF health URLs.

## 🔔 Webhooks *(Optional)*

Get notified when your Space restarts or if a backup fails:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WEBHOOK_URL` | — | Endpoint URL for POST JSON notifications |

## 🔐 Security & Advanced *(Optional)*

Configure password access and network restrictions:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OPENCLAW_PASSWORD` | — | Enable simple password auth instead of token |
| `TRUSTED_PROXIES` | — | Comma-separated IPs of HF proxies |
| `ALLOWED_ORIGINS` | — | Comma-separated allowed origins for Control UI |
| `OPENCLAW_VERSION` | `latest` | Build-time pin for the OpenClaw image tag |

## 🤖 LLM Providers

HuggingClaw supports **all providers** from OpenClaw. Set `LLM_MODEL=<provider/model>` and the provider is auto-detected. For example:

| Provider         | Prefix          | Example Model                         | API Key Source                                       |
| :--------------- | :-------------- | :------------------------------------ | :--------------------------------------------------- |
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

### Custom OpenAI-Compatible Provider

Register a custom endpoint at startup without modifying the CLI.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `CUSTOM_PROVIDER_NAME` | Unique provider prefix (e.g., `modal`) | **Required** |
| `CUSTOM_BASE_URL` | API base URL (e.g., `https://.../v1`) | **Required** |
| `CUSTOM_MODEL_ID` | Model ID on the server | **Required** |
| `LLM_MODEL` | Must match `{CUSTOM_PROVIDER_NAME}/{CUSTOM_MODEL_ID}` | **Required** |
| `CUSTOM_API_KEY` | Provider-specific key | `LLM_API_KEY` |
| `CUSTOM_CONTEXT_WINDOW` | Context limit | `128000` |

> [!TIP]
> `CUSTOM_PROVIDER_NAME` cannot override built-in providers (openai, anthropic, etc.).

**Example (Modal):**
```bash
CUSTOM_PROVIDER_NAME=modal
CUSTOM_BASE_URL=https://api.us-west-2.modal.direct/v1
CUSTOM_MODEL_ID=zai-org/GLM-5.1-FP8
LLM_MODEL=modal/zai-org/GLM-5.1-FP8
```

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
7. Launch background tasks (auto-sync and optional channel helpers).
8. Launch the OpenClaw gateway (start listening).
9. On `SIGTERM`, save workspace and exit cleanly.
```

## 🐛 Troubleshooting

- **Missing secrets:** Ensure `LLM_API_KEY`, `LLM_MODEL`, and `GATEWAY_TOKEN` are set in your Space **Settings → Secrets**.
- **Telegram bot issues:** Verify your `TELEGRAM_BOT_TOKEN`. Check Space logs for lines like `📱 Enabling Telegram`.
- **Backup restore failing:** Make sure `HF_USERNAME` and `HF_TOKEN` are correct (token needs write access to your Dataset).
- **Space keeps sleeping:** Open `/` and use `Keep Space Awake` to create the external monitor.
- **Auth errors / proxy:** If you see reverse-proxy auth errors, add the logged IPs under `TRUSTED_PROXIES` (from logs `remote=x.x.x.x`).
- **Control UI says too many failed authentication attempts:** Wait for the retry window to expire, then open the Space in an incognito window or clear site storage for your Space before logging in again with `GATEWAY_TOKEN`.
- **WhatsApp lost its session after restart:** Make sure `HF_USERNAME` and `HF_TOKEN` are configured so the hidden session backup can be restored on boot.
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

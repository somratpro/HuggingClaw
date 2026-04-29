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
  - name: CLOUDFLARE_WORKERS_TOKEN
    description: Optional Cloudflare API token for automatic Cloudflare Worker proxy setup.
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
- [🌐 Cloudflare Proxy *(Optional)*](#-cloudflare-proxy-optional)
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
- 🌐 **Cloudflare Outbound Proxy:** HuggingClaw can automatically provision a Cloudflare Worker proxy for blocked outbound traffic such as Telegram API requests.
- 💾 **Workspace Backup:** Chats, settings, and WhatsApp session state sync to a private HF Dataset via the `huggingface_hub`, preserving data automatically without storing your HF token in a git remote.
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
3. Add `CLOUDFLARE_WORKERS_TOKEN` in Space secrets to let HuggingClaw auto-provision the outbound proxy, or set `CLOUDFLARE_PROXY_URL` manually if you already have a Worker.
4. Add these secrets in Settings → Secrets. After restarting, the bot should appear online on Telegram.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token from BotFather |
| `TELEGRAM_USER_ID` | — | Single Telegram user ID allowlist |
| `TELEGRAM_USER_IDS` | — | Comma-separated Telegram user IDs for team access |

## 🌐 Cloudflare Proxy Setup

Hugging Face Free Tier often restricts outbound connections to services like Telegram, Discord, and WhatsApp. HuggingClaw solves this with a **Transparent Outbound Proxy** via Cloudflare Workers.

### ⚡ Automatic Setup (Recommended)

This is the easiest way. HuggingClaw will handle the deployment for you.

1. Create a **Cloudflare API Token**:
   - Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Create Token -> **Edit Cloudflare Workers** template.
   - Ensure it has `Account: Workers Scripts: Edit` permissions.
2. Add the token as a secret named `CLOUDFLARE_WORKERS_TOKEN` in your Space Settings.

**What happens next?**

- HuggingClaw automatically creates a Worker named after your Space host.
- It generates a secure, private `CLOUDFLARE_PROXY_SECRET`.
- All restricted outbound traffic is automatically routed through this Worker.

### 🛠️ Manual Setup

If you prefer to manage the Worker yourself:

1. Create a new Cloudflare Worker.
2. Paste the code from [cloudflare-worker.js](./cloudflare-worker.js) and deploy.
3. Add the Worker URL to your Space as `CLOUDFLARE_PROXY_URL`.
4. (Optional) Set a `CLOUDFLARE_PROXY_SECRET` in both the Worker (as a variable) and the Space (as a secret).

## 💬 WhatsApp Setup *(Optional)*

To use WhatsApp, enable the channel and scan the QR code from the Control UI (**Channels** → **WhatsApp** → **Login**):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WHATSAPP_ENABLED` | `false` | Enable WhatsApp pairing support |

## 💾 Workspace Backup *(Optional)*

HuggingClaw automatically syncs your workspace (chats, settings, sessions) to a private HF Dataset named `huggingclaw-backup`.

- **Persistence:** Survived restarts and restores your state on boot.
- **WhatsApp:** Stores session credentials so you don't have to scan the QR code every time.
- **Interval:** Syncs every 3 minutes by default.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HF_TOKEN` | — | HF token with **Write** access |
| `SYNC_INTERVAL` | `180` | Backup frequency in seconds |

## 💓 Staying Alive *(Recommended on Free HF Spaces)*

To help keep your Space awake, set up an external [UptimeRobot](https://uptimerobot.com/) monitor directly from the dashboard UI.

1. Open your Space's dashboard (`/`).
2. Find the **Keep Space Awake** section.
3. Paste your UptimeRobot **Main API key**.
4. Click **Create Monitor**.

HuggingClaw will automatically create a monitor for your Space's `/health` endpoint.

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

HuggingClaw supports **all providers** from OpenClaw. Set `LLM_MODEL=<provider/model>` and the provider is auto-detected.

<details>
<summary><b>Click to see supported providers and examples</b></summary>

| Provider | Prefix | Example Model |
| :--- | :--- | :--- |
| **Anthropic** | `anthropic/` | `anthropic/claude-3-5-sonnet-latest` |
| **OpenAI** | `openai/` | `openai/gpt-4o` |
| **Google** | `google/` | `google/gemini-2.0-flash` |
| **DeepSeek** | `deepseek/` | `deepseek/deepseek-chat` |
| **xAI (Grok)** | `xai/` | `xai/grok-2-latest` |
| **Mistral** | `mistral/` | `mistral/mistral-large-latest` |
| **HuggingFace** | `huggingface/` | `huggingface/deepseek-ai/DeepSeek-R1` |
| **OpenRouter** | `openrouter/` | `openrouter/anthropic/claude-3.5-sonnet` |

*And many more: Cohere, Groq, NVIDIA, Mistral, Moonshot, etc.*
</details>

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

HuggingClaw uses a multi-layered approach to ensure stability and persistence on Hugging Face's ephemeral infrastructure.

<details>
<summary><b>Click to view technical details</b></summary>

- **Dashboard (`/`)**: Management, monitoring, and keep-alive tools.
- **Control UI (`/gateway`)**: Secure interface for managing agents and channels.
- **Health Check (`/health`)**: Endpoint for uptime monitoring and readiness probes.
- **Sync Engine**: Python background process managing HF Dataset persistence.
- **Transparent Proxy**: Interceptor for requests to blocked domains (Telegram, etc.).

**Startup sequence:**

1. Validate required secrets and check HF token.
2. Resolve backup namespace and restore workspace from HF Dataset.
3. Generate `openclaw.json` configuration.
4. Launch background tasks (auto-sync, channel helpers).
5. Start OpenClaw gateway and listen for connections.

</details>

## 🐛 Troubleshooting

- **Missing secrets:** Ensure `LLM_API_KEY`, `LLM_MODEL`, and `GATEWAY_TOKEN` are set in your Space **Settings → Secrets**.
- **Telegram bot issues:** Verify your `TELEGRAM_BOT_TOKEN`. Check Space logs for lines like `📱 Enabling Telegram`.
- **Backup restore failing:** Make sure `HF_TOKEN` is valid and has write access to your HF account dataset. Set `HF_USERNAME` only if auto-detection is not available in your environment.
- **Space keeps sleeping:** Open `/` and use `Keep Space Awake` to create the external monitor.
- **Auth errors / proxy:** If you see reverse-proxy auth errors, add the logged IPs under `TRUSTED_PROXIES` (from logs `remote=x.x.x.x`).
- **Control UI says too many failed authentication attempts:** Wait for the retry window to expire, then open the Space in an incognito window or clear site storage for your Space before logging in again with `GATEWAY_TOKEN`.
- **WhatsApp lost its session after restart:** Make sure `HF_TOKEN` is configured so the hidden session backup can be restored on boot.
- **UI blocked (CORS):** Set `ALLOWED_ORIGINS=https://your-space-name.hf.space`.
- **Version mismatches:** Pin a specific OpenClaw build with the `OPENCLAW_VERSION` Variable in HF Spaces, or `--build-arg OPENCLAW_VERSION=...` locally.

## 🌟 More Projects

Similar projects by [@somratpro](https://github.com/somratpro) — all free, one-click deploy on HF Spaces:

| Project | What it runs | HF Space | GitHub |
| :--- | :--- | :--- | :--- |
| **HuggingClip** | Paperclip — AI agent orchestration platform | [Space](https://huggingface.co/spaces/somratpro/HuggingClip) | [Repo](https://github.com/somratpro/huggingclip) |
| **Hugging8n** | n8n — workflow & automation platform | [Space](https://huggingface.co/spaces/somratpro/Hugging8n) | [Repo](https://github.com/somratpro/hugging8n) |

## 📚 Links

- [OpenClaw Docs](https://docs.openclaw.ai)  
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)  
- [HuggingFace Spaces Docs](https://huggingface.co/docs/hub/spaces)  

## ❤️ Support

If HuggingClaw saves you time, consider buying me a coffee to keep the projects alive!

**USDT (TRC-20 / TRON network only)**

```
TELx8TJz1W1h7n6SgpgGNNGZXpJCEUZrdB
```

> [!WARNING]
> Send **USDT on TRC-20 network only**. Sending other tokens or using a different network will result in permanent loss.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

*Made with ❤️ by [@somratpro](https://github.com/somratpro) for the OpenClaw community.*  

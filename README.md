---
title: HuggingClaw
emoji: 🦞
colorFrom: red
colorTo: blue
sdk: docker
app_port: 7861
pinned: false
license: mit
tags:
  - openclaw
  - jupyterlab
  - terminal
  - llm-gateway
secrets:
  - name: LLM_API_KEY
    description: "Your LLM provider API key (e.g. Anthropic, OpenAI, Google, OpenRouter)."
  - name: LLM_MODEL
    description: "Model ID to use, e.g. google/gemini-2.5-flash or openai/gpt-4o."
  - name: GATEWAY_TOKEN
    description: "Strong token to secure your OpenClaw Control UI (generate: openssl rand -hex 32)."
  - name: JUPYTER_TOKEN
    description: "Optional strong token for the JupyterLab terminal at /terminal/ (defaults to huggingface)."
  - name: CLOUDFLARE_WORKERS_TOKEN
    description: "Cloudflare API token — auto-creates a Worker proxy and KeepAlive monitor."
  - name: TELEGRAM_ALLOWED_USERS
    description: "Comma-separated Telegram user IDs for access"
  - name: TELEGRAM_BOT_TOKEN
    description: "Telegram bot token from BotFather"
  - name: HF_TOKEN
    description: "HuggingFace token with Write access — enables automatic workspace backup."
  - name: WHATSAPP_ENABLED
    description: "Set to 'true' to enable WhatsApp pairing support."
---

<!-- Badges -->
[![GitHub Stars](https://img.shields.io/github/stars/somratpro/huggingclaw?style=flat-square)](https://github.com/somratpro/huggingclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![HF Space](https://img.shields.io/badge/🤗%20HuggingFace-Space-blue?style=flat-square)](https://huggingface.co/spaces)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Gateway-red?style=flat-square)](https://github.com/openclaw/openclaw)

**Your always-on AI assistant — free, no server needed.** This merged Space runs [OpenClaw](https://openclaw.ai) plus a Hugging Face-style JupyterLab terminal on one HF Spaces port, giving you a 24/7 AI chat assistant on Telegram and WhatsApp. It works with *any* large language model (LLM) – Claude, ChatGPT, Gemini, etc. – and even supports custom models via [OpenRouter](https://openrouter.ai). Deploy in minutes on the free HF Spaces tier (2 vCPU, 16GB RAM, 50GB) with automatic workspace backup to a HuggingFace Dataset so your chat history and settings persist across restarts.

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
- [🔑 API Key Rotation *(Optional)*](#-api-key-rotation-optional)
- [🤖 LLM Providers](#-llm-providers)
- [💻 Local Development](#-local-development)
- [🔗 CLI Access](#-cli-access)
- [💻 JupyterLab Terminal](#-jupyterlab-terminal)
- [🔍 Merge Comparison](#-merge-comparison)
- [🏗️ Architecture](#-architecture)
- [💓 Staying Alive](#-staying-alive)
- [🐛 Troubleshooting](#-troubleshooting)
- [📚 Links](#-links)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

- 🔌 **Any LLM:** Use Claude, OpenAI GPT, Google Gemini, Grok, DeepSeek, Qwen, and 40+ providers (set `LLM_API_KEY` and `LLM_MODEL` accordingly).
- 🔑 **Multi-Key Rotation:** Supply comma-separated key pools per provider (e.g. `ANTHROPIC_API_KEYS=key1,key2,key3`) for automatic round-robin rotation across rate limits.
- ⚡ **Zero Config:** Duplicate this Space and set **just three** secrets (LLM_API_KEY, LLM_MODEL, GATEWAY_TOKEN) – no other setup needed.
- 🐳 **Fast Builds:** Uses a pre-built OpenClaw Docker image to deploy in minutes.
- 🌐 **Cloudflare Outbound Proxy:** HuggingClaw can automatically provision a Cloudflare Worker proxy for blocked outbound traffic such as Telegram API requests.
- 💾 **Workspace Backup:** Chats, settings, and WhatsApp session state sync to a private HF Dataset via the `huggingface_hub`, preserving data automatically without storing your HF token in a git remote.
- ⏰ **Easy Keep-Alive:** Uses `CLOUDFLARE_WORKERS_TOKEN` to automatically set up a cron-triggered keep-awake worker at boot.
- 👥 **Multi-User Messaging:** Support for Telegram (multi-user) and WhatsApp (pairing).
- 📊 **Visual Dashboard:** Beautiful Web UI to monitor uptime, sync status, and active models.
- 🔔 **Webhooks:** Get notified on restarts or backup failures via standard webhooks.
- 🔐 **Flexible Auth:** Secure the Control UI with either a gateway token or password.
- 💻 **Optional Dev Terminal:** JupyterLab is available at `/terminal/` only when `DEV_MODE=true` (disabled by default).
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

Optional: set `DEV_MODE=true` (Variable) to enable JupyterLab support and install Jupyter dependencies at build time. You can also set `JUPYTER_TOKEN` as a Secret to set a strong terminal token (must not be `huggingface`). If you want to pin a specific OpenClaw release instead of `latest`, add `OPENCLAW_VERSION` under **Variables** in your Space settings. For Docker Spaces, HF passes Variables as build args during image build, so these should be Variables, not Secrets (except tokens).

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
| `TELEGRAM_ALLOWED_USERS` | — | Comma-separated Telegram user IDs for access |

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
| `SYNC_INTERVAL` | `180` | Full backup frequency in seconds |
| `OPENCLAW_CONFIG_WATCH_INTERVAL` | `1` | How often to check `openclaw.json` for immediate settings sync |
| `OPENCLAW_CONFIG_SETTLE_SECONDS` | `3` | How long `openclaw.json` must stay valid and unchanged before syncing |

## 📦 Ephemeral Package Re-install *(Optional)*

Yes — you can use extra packages after a Space restart without storing package files. The easiest option is to remember **one variable**:

| Variable | What to put in it |
| :--- | :--- |
| `HUGGINGCLAW_RUN` | Any bash commands you want to run on every startup |

Example:

```bash
HUGGINGCLAW_RUN="""
set -e
sudo apt-get update
sudo apt-get install -y ffmpeg
python3 -m pip install --user pandas requests
npm install -g typescript
"""
```

For very quote-heavy or strange scripts, put a base64 script in the same variable:

```bash
# locally
base64 -w0 setup.sh

# HF Variable
HUGGINGCLAW_RUN=base64:<paste-output-here>
```

How it works:

1. `HUGGINGCLAW_RUN` is run as a full bash script on every boot before the OpenClaw gateway launches, so multi-line commands, `if`, loops, functions, and heredocs work. Long installs will delay gateway startup.
2. Startup scripts load the same HuggingClaw shell wrappers as the interactive shell, so `apt install ...`, `pip install ...`, `npm install -g ...`, and `openclaw plugins install ...` behave consistently.
3. OpenClaw plugins installed at startup are synced into `plugins.allow` before the gateway launches, so the gateway can load them instead of reporting them as not installed.
4. If you install from the OpenClaw shell manually, HuggingClaw records only successful install commands in `/home/node/.openclaw/workspace/startup.sh` for replay. Failed or dummy commands are not saved by the wrapper.
5. Package files are not persisted; commands are replayed to reconstruct them after restart.

Errors are always printed as `ERROR:` lines in Space logs. By default HuggingClaw logs the error and continues booting; set `HUGGINGCLAW_STARTUP_STRICT=true` if the Space should fail fast when any startup install command fails.

Advanced/backward-compatible variables still work if you prefer package-specific fields: `HUGGINGCLAW_APT_PACKAGES`, `HUGGINGCLAW_PIP_PACKAGES`, `HUGGINGCLAW_NPM_PACKAGES`, `HUGGINGCLAW_OPENCLAW_PLUGINS`, `HUGGINGCLAW_STARTUP_COMMANDS`, `HUGGINGCLAW_STARTUP_COMMAND_1`...`100`, `HUGGINGCLAW_STARTUP_SCRIPT`, and `HUGGINGCLAW_STARTUP_SCRIPT_B64`.

> [!IMPORTANT]
> `sudo` is available for package-manager commands only (`apt`, `apt-get`, and `dpkg`). This is enough for `sudo apt-get update` and `sudo apt-get install -y ...`, but it is not unrestricted root access. Apt-installed packages still disappear on Space restart, so put them in `HUGGINGCLAW_RUN` or let the shell wrapper record the command in `startup.sh`.

## 💓 Staying Alive *(Recommended on Free HF Spaces)*

Your Space will automatically be kept awake by a background Cloudflare Worker when you configure the `CLOUDFLARE_WORKERS_TOKEN` secret. The worker uses a cron trigger to regularly ping your Space's `/health` endpoint. The dashboard displays the current keep-alive worker status.

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
| `CLOUDFLARE_KEEPALIVE_ENABLED` | `true` | Set to `false` to disable the automatic Cloudflare KeepAlive worker |

## 🔑 API Key Rotation *(Optional)*

Spread requests across multiple API keys to avoid rate limits. Supply a comma-separated pool for any provider — keys rotate round-robin per provider independently.

```bash
# Single provider, multiple keys
ANTHROPIC_API_KEYS=sk-ant-key1,sk-ant-key2,sk-ant-key3

# Multiple providers simultaneously
OPENAI_API_KEYS=sk-openai-key1,sk-openai-key2
GEMINI_API_KEYS=AIza-key1,AIza-key2
```

**Fallback chain** (per provider):
1. `{PROVIDER}_API_KEYS` — comma-separated pool *(preferred)*
2. `{PROVIDER}_API_KEY` — single dedicated key
3. `LLM_API_KEY` — universal fallback *(enabled by default; disable with `LLM_API_KEY_FALLBACK_ENABLED=false`)*

> [!TIP]
> By default, `LLM_API_KEY` fallback is enabled for compatibility. Set `LLM_API_KEY_FALLBACK_ENABLED=false` if you want strict provider-only activation.

Supported per-provider variables: `ANTHROPIC_API_KEYS`, `OPENAI_API_KEYS`, `GEMINI_API_KEYS`, `DEEPSEEK_API_KEYS`, `GROQ_API_KEYS`, `MISTRAL_API_KEYS`, `OPENROUTER_API_KEYS`, `XAI_API_KEYS`, `NVIDIA_API_KEYS`, `COHERE_API_KEYS`, `TOGETHER_API_KEYS`, `CEREBRAS_API_KEYS`, and more — see `.env.example` for the full list.

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

## 💻 JupyterLab Terminal

The merged Space includes the Hugging Face JupyterLab template behavior inside the same container:

| Path | Service | Internal Port | Notes |
| :--- | :--- | :--- | :--- |
| `/` | HuggingClaw dashboard | `7861` | Public HF Spaces entrypoint |
| `/app/` | OpenClaw Control UI | `7860` | Mounted behind the local reverse proxy |
| `/terminal/` | JupyterLab terminal (DEV_MODE only) | `8888` | Available only when `DEV_MODE=true`; token login uses `JUPYTER_TOKEN` (set a strong value) |

When enabled, the terminal notebook root is `/home/node`, so you can inspect HuggingClaw files, logs, workspace state, and runtime scripts from the browser.

> [!IMPORTANT]
> For real deployments, set a strong `JUPYTER_TOKEN` secret. Do not use `huggingface`; generate a strong token with `openssl rand -hex 32`.

## 🔍 Merge Comparison

This repository is a merge of two sources:

- `anurag162008/HuggingClaw`: OpenClaw gateway, dashboard, Cloudflare proxy/keep-alive, Telegram/WhatsApp helpers, backup sync, key rotation, docs, and security metadata.
- Hugging Face `SpacesExamples/jupyterlab` template: JupyterLab Docker behavior, token login UX, Hugging Face-branded login template, pinned Jupyter packages, and Git LFS defaults for large model/data artifacts.

The main merge-specific change is the single-port router: HF Spaces exposes `7861`, while the router keeps OpenClaw at `/app/` and JupyterLab at `/terminal/` without leaking internal redirects such as `http://127.0.0.1:8888/...`.

## 🏗️ Architecture

HuggingClaw uses a multi-layered approach to ensure stability and persistence on Hugging Face's ephemeral infrastructure.

<details>
<summary><b>Click to view technical details</b></summary>

- **Dashboard (`/`)**: Management, monitoring, and keep-alive tools (terminal controls appear only in DEV mode).
- **Control UI (`/app/`)**: Secure interface for managing agents and channels, proxied to the OpenClaw gateway on internal port `7860`.
- **JupyterLab Terminal (`/terminal/`)**: Browser terminal/notebook server on internal port `8888` (DEV mode only).
- **Health Check (`/health`)**: Endpoint for uptime monitoring and readiness probes.
- **Sync Engine**: Python background process managing HF Dataset persistence.
- **Transparent Proxy**: Interceptor for requests to blocked domains (Telegram, etc.).

**Startup sequence:**

1. Validate required secrets and check HF token.
2. Resolve backup namespace and restore workspace from HF Dataset.
3. Generate `openclaw.json` configuration.
4. Launch background tasks (auto-sync, channel helpers).
5. Start the local dashboard/reverse proxy and OpenClaw gateway (JupyterLab starts only when `DEV_MODE=true`).

</details>

## 🐛 Troubleshooting

- **Private Space 404:** If your Space is private, raw `https://<space>.hf.space/app/` or `/terminal/` links can show Hugging Face's own 404 page when opened outside the embedded App session. Open the Space's **App** tab first, then use the in-page dashboard buttons for `/app/` and `/terminal/`.
- **Terminal 404 or redirect loop:** Open `/terminal/` with the trailing slash from the dashboard/App tab, rebuild after Dockerfile changes, and confirm `JUPYTER_TOKEN` is set correctly if you changed the default.
- **Control UI 404:** Open `/app/` with the trailing slash from the dashboard/App tab; the reverse proxy rewrites backend redirects into this mount path.
- **Missing secrets:** Ensure `LLM_API_KEY`, `LLM_MODEL`, and `GATEWAY_TOKEN` are set in your Space **Settings → Secrets**.
- **Telegram bot issues:** Verify your `TELEGRAM_BOT_TOKEN`. Check Space logs for lines like `📱 Enabling Telegram`.
- **Backup restore failing:** Make sure `HF_TOKEN` is valid and has write access to your HF account dataset. Set `HF_USERNAME` only if auto-detection is not available in your environment.
- **Space keeps sleeping:** Add `CLOUDFLARE_WORKERS_TOKEN` as a Space secret to enable automatic keep-awake monitoring via Cloudflare Workers.
- **Auth errors / proxy:** If you see reverse-proxy auth errors, add the logged IPs under `TRUSTED_PROXIES` (from logs `remote=x.x.x.x`).
- **Control UI says too many failed authentication attempts:** Wait for the retry window to expire, then open the Space in an incognito window or clear site storage for your Space before logging in again with `GATEWAY_TOKEN`.
- **WhatsApp lost its session after restart:** Make sure `HF_TOKEN` is configured so the hidden session backup can be restored on boot.
- **UI blocked (CORS):** Set `ALLOWED_ORIGINS=https://your-space-name.hf.space`.
- **Version mismatches:** Pin a specific OpenClaw build with the `OPENCLAW_VERSION` Variable in HF Spaces, or `--build-arg OPENCLAW_VERSION=...` locally.

## 🌟 More Projects

Similar projects by [@somratpro](https://github.com/somratpro) — all free, one-click deploy on HF Spaces:

| Project | What it runs | HF Space | GitHub |
| :--- | :--- | :--- | :--- |
| **HuggingFlow** | DeerFlow — deep research agent | [Space](https://huggingface.co/spaces/somratpro/HuggingFlow) | [Repo](https://github.com/somratpro/HuggingFlow) |
| **HuggingMes** | Hermes — Self-hosted agent gateway | [Space](https://huggingface.co/spaces/somratpro/HuggingMes) | [Repo](https://github.com/somratpro/huggingmes) |
| **Hugging8n** | n8n — workflow & automation platform | [Space](https://huggingface.co/spaces/somratpro/Hugging8n) | [Repo](https://github.com/somratpro/hugging8n) |
| **HuggingClip** | Paperclip — AI agent orchestration platform | [Space](https://huggingface.co/spaces/somratpro/HuggingClip) | [Repo](https://github.com/somratpro/huggingclip) |
| **HuggingPost** | Postiz — social media scheduler | [Space](https://huggingface.co/spaces/somratpro/HuggingPost) | [Repo](https://github.com/somratpro/HuggingPost) |

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

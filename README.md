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

- **Zero-config** — just add 2 secrets and deploy
- **Any LLM provider** — Claude, GPT-4, Gemini, etc.
- **Built-in keep-alive** — self-pings to prevent HF sleep (no external cron needed)
- **Auto-sync workspace** — commits + pushes changes every 10 min
- **Auto-create backup** — creates the HF Dataset for you if it doesn't exist
- **Graceful shutdown** — saves workspace before container dies
- **Multi-user Telegram** — supports comma-separated user IDs for teams
- **Health endpoint** — `/health` for monitoring
- **Version pinning** — lock OpenClaw to a specific version
- **100% HF-native** — runs entirely on HuggingFace infrastructure

---

## 🚀 Quick Start

### 1. Duplicate this Space
Click **"Duplicate this Space"** → name it → set to **Private**

### 2. Add Required Secrets
Go to **Settings → Secrets**:

| Secret | Value |
|--------|-------|
| `LLM_API_KEY` | Your API key ([Anthropic](https://console.anthropic.com/) / [OpenAI](https://platform.openai.com/) / [Google](https://ai.google.dev/)) |
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
| `GATEWAY_TOKEN` | Gateway auth token |

#### LLM

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_PROVIDER` | `anthropic` | Provider: `anthropic`, `openai`, `google` |
| `LLM_MODEL` | `anthropic/claude-haiku-4-5` | Model to use |

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

#### Advanced

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCLAW_VERSION` | `latest` | Pin OpenClaw version |
| `HEALTH_PORT` | `7861` | Health endpoint port |

---

## 🤖 LLM Provider Setup

### Anthropic (Claude)
```
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-v0-...
LLM_MODEL=anthropic/claude-haiku-4-5
```
Models: `claude-opus-4-6` · `claude-sonnet-4-5` · `claude-haiku-4-5`

### OpenAI
```
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4
```
Models: `gpt-4-turbo` · `gpt-4` · `gpt-3.5-turbo`

### Google (Gemini)
```
LLM_PROVIDER=google
LLM_API_KEY=AIzaSy...
LLM_MODEL=gemini-pro
```
Models: `gemini-pro` · `gemini-pro-vision`

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
3. **Auto-syncs** changes every 10 minutes (configurable)
4. **Saves** on shutdown (graceful SIGTERM handling)

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
├── Dockerfile          # Runtime: Node.js + OpenClaw + curl + jq
├── start.sh            # Config generator + validation + orchestrator
├── keep-alive.sh       # Self-ping to prevent HF sleep
├── workspace-sync.sh   # Periodic workspace commit + push
├── health-server.js    # Health endpoint (/health)
├── dns-fix.js          # DNS override for HF network restrictions
├── .env.example        # Complete configuration reference
├── .gitignore          # Keeps secrets out of version control
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

**Control UI blocked** → The Space URL is auto-allowlisted. Check logs for origin errors

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

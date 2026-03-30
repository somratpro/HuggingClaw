# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-30

### 🎉 Initial Release

#### Features
- **Any LLM provider** — Anthropic (Claude), OpenAI (GPT-4), Google (Gemini)
- **Telegram integration** — connect via @BotFather, supports multiple users
- **Built-in keep-alive** — self-pings to prevent HF Spaces 48h sleep
- **Auto-sync workspace** — commits + pushes to HF Dataset every 10 min
- **Auto-create backup** — creates HF Dataset automatically on first run
- **Graceful shutdown** — saves workspace before container stops
- **Health endpoint** — `/health` on port 7861 for monitoring
- **DNS fix** — bypasses HF Spaces internal DNS restrictions
- **Version pinning** — lock OpenClaw to a specific version
- **Startup banner** — clean summary of all running services
- **Zero-config defaults** — just 2 secrets to get started

#### Architecture
- `start.sh` — config generator + validation + orchestrator
- `keep-alive.sh` — self-ping background service
- `workspace-sync.sh` — periodic workspace backup
- `health-server.js` — lightweight health endpoint
- `dns-fix.js` — DNS override for HF network restrictions

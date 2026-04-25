# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2026-04-25

### Added

- **Custom OpenAI-compatible provider registration** — HuggingClaw can now register a custom provider at startup with `CUSTOM_PROVIDER_NAME`, `CUSTOM_BASE_URL`, and `CUSTOM_MODEL_ID`, so you can point `LLM_MODEL` at your own OpenAI-compatible endpoint without modifying the OpenClaw CLI
- **Automatic Cloudflare outbound proxy setup** — HuggingClaw can now provision and use a Cloudflare Worker proxy for blocked outbound traffic from a `CLOUDFLARE_WORKERS_TOKEN`, using the same transparent proxy model used in Hugging8n

### Changed

- **HF backup flow simplified** — HuggingClaw now uses `huggingface_hub` directly for restore and sync, matching the safer dataset-based pattern used in Hugging8n
- **HF username no longer required in most cases** — backup namespace resolution now works from `HF_USERNAME`, `SPACE_AUTHOR_NAME`, or the authenticated HF token, so `HF_TOKEN` is usually enough on its own
- **Startup restore path modernized** — startup now restores workspace and hidden state through `workspace-sync.py restore` instead of configuring a token-bearing git remote
- **README refreshed for the new backup model** — documentation now describes token-only backup setup, the removed git sync assumptions, and the hardened dashboard helper behavior
- **Telegram networking simplified** — removed the channel-specific Telegram transport tweaks in favor of the generic Cloudflare outbound proxy path
- **DNS monkey-patch removed** — HuggingClaw now relies on the Cloudflare outbound proxy path instead of the old `dns-fix.js` preload

### Fixed

- **HF token exposure risk in git remotes** — removed the old authenticated remote URL pattern that could leave `HF_TOKEN` embedded in workspace git configuration
- **Backup status detection mismatch** — dashboard and startup summary now treat backup as enabled when `HF_TOKEN` is present, which matches the new auto-namespace flow
- **UptimeRobot setup hardening gap** — dashboard setup now supports explicit enable/disable control, request rate limiting, origin validation, and earlier API-key validation

## [1.3.0] - 2026-04-04

### Added

- **Built-in browser support** — HuggingClaw now includes headless Chromium support in the Docker image, with automatic startup detection and a warmed managed browser profile for first-run browser actions
- **Full OpenClaw state backup** — backup sync now stores and restores broader hidden OpenClaw state, including agent/session data, so restarts can recover more than just the visible workspace
- **Shutdown sync path** — graceful shutdown now runs a real one-shot backup sync before exit instead of relying only on the periodic sync loop

### Changed

- **Workspace sync hardened** — startup now restores saved OpenClaw state, periodic sync runs an immediate first pass after startup, and the default sync interval is now `180s`
- **Workspace sync card improved** — the dashboard now shows a clearer configured state, better alignment, and more accurate backup status messaging
- **Keep-awake card simplified** — dashboard messaging now changes based on public/private Space state and whether UptimeRobot setup was already completed

### Fixed

- **Private Space dashboard loading** — fixed dashboard status fetching and Control UI linking for HF private Spaces where signed URLs and routed paths behave differently
- **Backup snapshot failures from live browser locks** — excluded transient Chromium runtime files from state backup so browser lock/socket files no longer break sync

## [1.2.0] - 2026-04-03

### Added

- **Dashboard-based UptimeRobot setup** — users can now paste their UptimeRobot Main API key directly in the dashboard and create an external uptime monitor
- **Optional WhatsApp mode** — WhatsApp now stays fully disabled unless `WHATSAPP_ENABLED=true`

### Changed

- **Documentation simplified** — README now explains the simple dashboard flow for external keep-alive, which key to use, and where to paste it

### Removed

- **Internal self-ping keep-alive** — removed `keep-alive.sh` and all startup wiring because internal self-pings do not reliably prevent free-tier HF Space sleep

## [1.1.0] - 2026-03-31

### Added

- **Pre-built Docker image** — uses `ghcr.io/openclaw/openclaw:latest` multi-stage build for much faster builds (minutes instead of 30+)
- **Python huggingface_hub sync** — `workspace-sync.py` uses the `huggingface_hub` library for more reliable HF Dataset sync (handles auth, LFS, retries). Falls back to git-based sync automatically
- **Password auth** — `OPENCLAW_PASSWORD` for simpler login (optional alternative to token)
- **Trusted proxies** — `TRUSTED_PROXIES` env var fixes "Proxy headers detected from untrusted address" errors on HF Spaces
- **Allowed origins** — `ALLOWED_ORIGINS` env var to lock down Control UI access
- **40+ LLM providers** — Added support for OpenCode, OpenRouter, DeepSeek, Qwen, Z.ai, Moonshot, Mistral, xAI, NVIDIA, Volcengine, BytePlus, Cohere, Groq, HuggingFace Inference, and more
- **OpenCode Zen/Go** — support for OpenCode's tested model service

### Changed

- Provider detection now uses `case` statement (cleaner, faster) with correct OpenClaw provider IDs
- Model IDs now sourced from OpenClaw docs (not OpenRouter) for accuracy
- Google API key env var corrected to `GEMINI_API_KEY`

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
- `workspace-sync.sh` — periodic workspace backup
- `health-server.js` — lightweight health endpoint

# Changelog

All notable changes to this project will be documented in this file.

## [1.6.0] - 2026-05-14

### Added

- **Merged JupyterLab terminal** — added the Hugging Face JupyterLab template login page and `/terminal/` routing alongside the HuggingClaw dashboard and `/app/` OpenClaw Control UI.
- **HF template parity files** — restored Git LFS defaults and project metadata/docs that were missing from the merged repository.

### Fixed

- **HF Spaces subpath routing** — normalized internal redirects and WebSocket forwarding so `/app/` and `/terminal/` stay mounted behind the single public Spaces port.
- **Startup log noise** — removed the stale disabled `plugins.entries.acpx` config entry, switched Jupyter token/cookie options to `IdentityProvider.*`, and printed `/app/` with the trailing slash.
- **Private Space navigation** — dashboard buttons now stay in-frame and startup logs print relative routes, avoiding raw `.hf.space` links that can show Hugging Face's outer 404 page on private Spaces.

## [1.5.0] - 2026-05-13

### Added

- **NVIDIA key-rotation support** — added `nvidia-key-rotator.cjs` wiring and startup integration so deployments can rotate NVIDIA credentials similarly to other provider key-rotation flows.
- **Cloudflare keep-alive automation** — added/expanded `cloudflare-keepalive-setup.py` flow and startup wiring to provision keep-alive through Cloudflare Worker automation instead of the older UptimeRobot-first approach.
- **Sync metadata marker model** — introduced a structured workspace marker `(file_count, total_size, newest_mtime, metadata_hash)` to support stronger change introspection in sync code.

### Changed

- **Workspace sync script rename finalized** — `workspace-sync.py` flow was migrated to `openclaw-sync.py` in Docker/startup/docs so restore/sync behavior is centralized under one script.
- **Sync trigger behavior hardened for config churn** — OpenClaw config sync now debounces until JSON settles before immediate sync, reducing false/partial syncs during rapid config writes.
- **Gateway restart flow now saves state first** — restart path was updated to run a pre-restart one-shot state sync so gateway reloads are less likely to drop recent state.
- **Shutdown backup now uses a two-step pass** — graceful shutdown now attempts `sync-once-settled` then a final `sync-once` pass to better capture last-second writes.
- **Telegram allowlist simplified** — consolidated Telegram allowlist into `TELEGRAM_ALLOWED_USERS` and aligned docs/examples.
- **Plugin startup behavior aligned** — startup-installed plugins are synced into `plugins.allow` before gateway launch so runtime-installed plugins are recognized cleanly.
- **Cloudflare proxy path matured** — multiple iterations improved fetch/proxy behavior (header handling, endpoint scoping, API root routing, URL parsing, and logging noise reduction), then simplified unstable undici patching paths.
- **Health dashboard polish** — sync timestamps now show local time, footer credits were corrected, and status rendering/docs were updated for the Cloudflare keep-alive model.
- **CI workflow churn documented** — GitHub workflow files for HF sync were added/renamed/cleaned multiple times as space/repo naming stabilized.

### Fixed

- **Missed rapid backup updates** — sync logic now relies on content fingerprint checks for no-op decisions so same-second or quick successive changes are less likely to be skipped.
- **Non-deterministic metadata hashing** — metadata hashing now iterates paths deterministically to avoid hash jitter from traversal order.
- **Transient file race sync failures** — sync fingerprinting/snapshot copy paths now tolerate transient `OSError` (file rotated/deleted mid-scan) instead of aborting the whole sync pass.
- **State restore migration edge cases** — restore flow includes migration/cleanup behavior for legacy hidden state paths and stale backup entries.
- **Startup/env robustness** — fixed shell export formatting/syntax issues (e.g., NVIDIA/XAI lines) and unbound-variable pitfalls in startup scripts.
- **Proxy runtime errors and noise** — fixed specific proxy runtime issues (including `UND_ERR_INVALID_ARG`, fetch duplex handling, and upstream error visibility) and reduced noisy stdout logs that interfered with clean process output.
- **HF workflow/repo reference mismatches** — corrected and later cleaned workflow repository references during repo migration/restructure.

### Docs

- README/.env/security docs were refreshed across multiple commits to reflect:
  - Cloudflare keep-alive replacing UptimeRobot setup path,
  - updated secrets and startup environment behavior,
  - provider/key-rotation options,
  - backup/sync behavior and troubleshooting guidance.

## [1.4.0] - 2026-04-25

### Added

- **Custom OpenAI-compatible provider registration** — HuggingClaw can now register a custom provider at startup with `CUSTOM_PROVIDER_NAME`, `CUSTOM_BASE_URL`, and `CUSTOM_MODEL_ID`, so you can point `LLM_MODEL` at your own OpenAI-compatible endpoint without modifying the OpenClaw CLI
- **Automatic Cloudflare outbound proxy setup** — HuggingClaw can now provision and use a Cloudflare Worker proxy for blocked outbound traffic from a `CLOUDFLARE_WORKERS_TOKEN`, using the same transparent proxy model used in Hugging8n

### Changed

- **HF backup flow simplified** — HuggingClaw now uses `huggingface_hub` directly for restore and sync, matching the safer dataset-based pattern used in Hugging8n
- **HF username no longer required in most cases** — backup namespace resolution now works from `HF_USERNAME`, `SPACE_AUTHOR_NAME`, or the authenticated HF token, so `HF_TOKEN` is usually enough on its own
- **Startup restore path modernized** — startup now restores workspace and hidden state through `openclaw-sync.py restore` instead of configuring a token-bearing git remote
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
- **Python huggingface_hub sync** — `openclaw-sync.py` uses the `huggingface_hub` library for more reliable HF Dataset sync (handles auth, LFS, retries). Falls back to git-based sync automatically
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

---
title: HuggingClaw
emoji: 🦞
colorFrom: red
colorTo: blue
sdk: docker
app_port: 7861
pinned: false
tags:
  - openclaw
  - jupyterlab
  - terminal
  - llm-gateway
---

# 🦞 HuggingClaw + 💻 JupyterLab Terminal

OpenClaw LLM Gateway with a built-in JupyterLab terminal — all in one HF Space.

## Architecture

| Path | Service |
|------|---------|
| `/` | HuggingClaw dashboard |
| `/app/` | OpenClaw Control UI |
| `/terminal/` | JupyterLab terminal |

All traffic goes through port **7861** (the single exposed port).  
OpenClaw gateway runs internally on **7860**.  
JupyterLab runs internally on **8888**.

## Required Secrets

| Secret | Description |
|--------|-------------|
| `LLM_API_KEY` | Your LLM provider API key |
| `LLM_MODEL` | Model name e.g. `google/gemini-2.5-flash` |
| `GATEWAY_TOKEN` | Run `openssl rand -hex 32` |

## Optional Secrets

| Secret | Default | Description |
|--------|---------|-------------|
| `JUPYTER_TOKEN` | `huggingface` | JupyterLab login token |
| `HF_TOKEN` | — | Enable workspace backup |
| `TELEGRAM_BOT_TOKEN` | — | Enable Telegram channel |
| `WHATSAPP_ENABLED` | `false` | Enable WhatsApp channel |


## Compared Sources

This merged Space was checked against both upstream inputs:

- `anurag162008/HuggingClaw` provides the OpenClaw gateway, dashboard, backup, Cloudflare, Telegram, and WhatsApp runtime.
- The Hugging Face JupyterLab Space template provides the terminal behavior: JupyterLab token login, Hugging Face-branded login screen, and LFS defaults for large notebook/model artifacts.

Merged routing keeps HuggingClaw on `/app/` and mounts the terminal on `/terminal/` through the single public HF Spaces port (`7861`).

## JupyterLab Terminal

The terminal opens at `/terminal/` with the default token **`huggingface`** (override via `JUPYTER_TOKEN` secret).

The notebook directory is `/home/node` — all HuggingClaw files, workspace data, and running processes are visible from there.

## Credits

- [HuggingClaw](https://github.com/somratpro/HuggingClaw) by @somratpro
- [JupyterLab](https://jupyter.org/) — SpacesExamples template

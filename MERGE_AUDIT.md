# Merge Audit: HuggingClaw + Hugging Face JupyterLab Template

This audit tracks what was compared after cloning `https://github.com/anurag162008/HuggingClaw.git` and checking it against the Hugging Face JupyterLab Space template content used for the terminal.

## Source Coverage

| Source | Covered In This Repo | Notes |
| :--- | :--- | :--- |
| `anurag162008/HuggingClaw` runtime scripts | ✅ Yes | `start.sh`, `health-server.js`, Cloudflare helpers, sync, iframe fix, WhatsApp guardian, and key rotator are present. |
| `anurag162008/HuggingClaw` project metadata | ✅ Restored | `.env.example`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `LICENSE`, and `SECURITY.md` are included. |
| Hugging Face JupyterLab template login UX | ✅ Added | `login.html` keeps the HF logo, token form, and default-token guidance while labeling this merged terminal. |
| Hugging Face JupyterLab pinned packages | ✅ Added | Docker installs `jupyterlab==4.5.7`, `tornado==6.5.5`, and `ipywidgets==8.1.8`. |
| Hugging Face LFS defaults | ✅ Added | `.gitattributes` tracks common model/data artifacts through Git LFS. |
| GitHub-to-HF workflow from upstream | ⚠️ Intentionally not copied | The upstream workflow targets a specific HF Space path and could push to the wrong Space if copied blindly. Add a repo-specific workflow only after confirming the target Space name and `HF_TOKEN` secret. |

## Public Routing Contract

HF Spaces exposes a single public Docker port, so this merged image uses `7861` as the public entrypoint:

| Public Path | Internal Service | Internal Port |
| :--- | :--- | :--- |
| `/` | HuggingClaw dashboard | `7861` |
| `/app/` | OpenClaw Control UI / gateway | `7860` |
| `/terminal/` | JupyterLab terminal | `8888` |

The reverse proxy must preserve these public prefixes for normal HTTP responses, redirects, and WebSocket upgrades. That prevents common HF Spaces failures like `/terminal/...` or `/app/...` returning 404 after a backend redirects to `/login`, `/lab`, or an internal `127.0.0.1` URL.

## Restored Missing Items

- Full upstream README content, with merged terminal/routing sections.
- Upstream `.env.example`, updated with `JUPYTER_TOKEN`.
- Upstream security, contribution, license, changelog, and code-of-conduct files.
- Expanded `.gitignore` from upstream plus local dependency/temp ignores.
- HF template `.gitattributes` LFS rules.
- HF-style JupyterLab login template.

## Still Needs Deployment-Specific Confirmation

- Confirm the actual Hugging Face Space slug before adding any GitHub Actions workflow that pushes to HF.
- Set `JUPYTER_TOKEN` to a strong secret instead of relying on the template default.
- Open both `/app/` and `/terminal/` with trailing slashes after the HF Space rebuild completes.

## Log Review: 2026-05-14 Startup

Checked the supplied HF Space startup log. Findings and actions:

- `plugins.entries.acpx: plugin not installed: acpx` was caused by writing a disabled `plugins.entries.acpx` config entry even when ACP is disabled/missing on HF Spaces. The startup config now deletes that entry unless the plugin is actually enabled through the allow list.
- Jupyter Server warned that `ServerApp.token` and `ServerApp.cookie_options` are deprecated. Startup now uses `IdentityProvider.token` and `IdentityProvider.cookie_options` for Jupyter Server 2.x.
- The printed Control UI URL now includes the trailing slash (`/app/`) to match the mounted route and avoid copy/paste 404s.
- `Config write anomaly: missing-meta-before-write` is expected on a fresh Space with no restored config; the script writes a new config because the log also says `No restored config — writing fresh config...`.
- The OpenClaw security warning is expected for this single-port reverse-proxy deployment because the gateway is protected by `GATEWAY_TOKEN` and only reached publicly through the local dashboard proxy. Keep the Space private and use strong `GATEWAY_TOKEN`/`JUPYTER_TOKEN` secrets.

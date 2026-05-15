# ════════════════════════════════════════════════════════════════
# 🦞 HuggingClaw + 💻 JupyterLab Terminal
# ════════════════════════════════════════════════════════════════
# Port 7861 (exposed): Dashboard + reverse proxy
#   /          → HuggingClaw dashboard
#   /app/      → OpenClaw gateway (internal :7860)
#   /terminal/ → JupyterLab terminal (internal :8888)
# ════════════════════════════════════════════════════════════════

# ── Stage 1: Pull pre-built OpenClaw ──
ARG OPENCLAW_VERSION=latest
FROM ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION} AS openclaw

# ── Stage 2: Runtime ──
FROM node:22-slim
ARG OPENCLAW_VERSION=latest
ARG DEV_MODE=false
ENV DEV_MODE=${DEV_MODE}

# Install system dependencies (+ optional JupyterLab deps in DEV_MODE)
RUN apt-get update && apt-get install -y \
    git \
    sudo \
    ca-certificates \
    jq \
    curl \
    python3 \
    python3-pip \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxkbcommon0 \
    libx11-6 \
    libxext6 \
    libxfixes3 \
    libasound2 \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    xfonts-scalable \
    --no-install-recommends && \
    pip3 install --no-cache-dir --break-system-packages huggingface_hub && \
    case "$(printf '%s' "${DEV_MODE}" | tr '[:upper:]' '[:lower:]')" in \
      true|1|yes|on) \
        pip3 install --no-cache-dir --break-system-packages \
          jupyterlab==4.5.7 \
          tornado==6.5.5 \
          ipywidgets==8.1.8 ;; \
    esac && \
    rm -rf /var/lib/apt/lists/*

# Reuse existing node user (UID 1000). Allow passwordless package-manager
# commands only so runtime apt installs can be replayed after HF Space restarts.
RUN mkdir -p /home/node/app /home/node/.openclaw && \
    chown -R 1000:1000 /home/node && \
    printf '%s\n' \
      'Cmnd_Alias HUGGINGCLAW_APT = /usr/bin/apt, /usr/bin/apt-get, /usr/bin/dpkg' \
      'node ALL=(root) NOPASSWD: HUGGINGCLAW_APT' \
      > /etc/sudoers.d/huggingclaw-apt && \
    chmod 0440 /etc/sudoers.d/huggingclaw-apt && \
    visudo -cf /etc/sudoers.d/huggingclaw-apt

# Copy pre-built OpenClaw (skips npm install entirely — much faster!)
COPY --from=openclaw --chown=1000:1000 /app /home/node/.openclaw/openclaw-app

# Add Playwright in an isolated sidecar node_modules
RUN mkdir -p /home/node/browser-deps && \
    cd /home/node/browser-deps && \
    npm init -y && \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --omit=dev playwright@1.59.1

# Symlink openclaw CLI so it's available globally
RUN ln -s /home/node/.openclaw/openclaw-app/openclaw.mjs /usr/local/bin/openclaw 2>/dev/null || \
    npm install -g openclaw@${OPENCLAW_VERSION}

# Copy HuggingClaw files
COPY --chown=1000:1000 cloudflare-proxy.js /opt/cloudflare-proxy.js
COPY --chown=1000:1000 cloudflare-proxy-setup.py /home/node/app/cloudflare-proxy-setup.py
COPY --chown=1000:1000 health-server.js /home/node/app/health-server.js
COPY --chown=1000:1000 env-builder.html /home/node/app/env-builder.html
COPY --chown=1000:1000 login.html /home/node/app/login.html
COPY --chown=1000:1000 iframe-fix.cjs /home/node/app/iframe-fix.cjs
COPY --chown=1000:1000 start.sh /home/node/app/start.sh
COPY --chown=1000:1000 wa-guardian.js /home/node/app/wa-guardian.js
COPY --chown=1000:1000 cloudflare-keepalive-setup.py /home/node/app/cloudflare-keepalive-setup.py
COPY --chown=1000:1000 openclaw-sync.py /home/node/app/openclaw-sync.py
COPY --chown=1000:1000 jupyter-devdata-sync.py /home/node/app/jupyter-devdata-sync.py
COPY --chown=1000:1000 multi-provider-key-rotator.cjs /home/node/app/multi-provider-key-rotator.cjs
RUN printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'case "$(printf "%s" "${DEV_MODE}" | tr "[:upper:]" "[:lower:]")" in' \
  '  true|1|yes|on)' \
  "    python3 -c \"from pathlib import Path; import shutil, jupyter_server; template_dir = Path(jupyter_server.__file__).parent / 'templates'; template_dir.mkdir(parents=True, exist_ok=True); shutil.copyfile('/home/node/app/login.html', template_dir / 'login.html')\"" \
  '    ;;' \
  'esac' \
  > /tmp/setup-jupyter-template.sh && \
  chmod +x /tmp/setup-jupyter-template.sh && \
  /tmp/setup-jupyter-template.sh && \
  rm -f /tmp/setup-jupyter-template.sh
RUN chmod +x /home/node/app/start.sh \
              /home/node/app/cloudflare-proxy-setup.py \
              /home/node/app/cloudflare-keepalive-setup.py \
              /home/node/app/openclaw-sync.py \
              /home/node/app/multi-provider-key-rotator.cjs

USER node

ENV HOME=/home/node \
    OPENCLAW_VERSION=${OPENCLAW_VERSION} \
    PATH=/home/node/.local/bin:/usr/local/bin:$PATH \
    NODE_PATH=/home/node/browser-deps/node_modules \
    NODE_OPTIONS="--require /opt/cloudflare-proxy.js"

WORKDIR /home/node/app

# 7861 = public entrypoint (dashboard + proxy for both OpenClaw and JupyterLab)
EXPOSE 7861

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD curl -fsS http://localhost:7861/health || exit 1

CMD ["/home/node/app/start.sh"]

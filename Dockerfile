# ════════════════════════════════════════════════════════════════
# 🦞 HuggingClaw — OpenClaw Gateway for HuggingFace Spaces
# ════════════════════════════════════════════════════════════════
# Multi-stage build: uses pre-built OpenClaw image for fast builds

# ── Stage 1: Pull pre-built OpenClaw ──
ARG OPENCLAW_VERSION=latest
FROM ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION} AS openclaw

# ── Stage 2: Runtime ──
FROM node:22-slim
ARG OPENCLAW_VERSION=latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
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
    rm -rf /var/lib/apt/lists/*

# Reuse existing node user (UID 1000)
RUN mkdir -p /home/node/app /home/node/.openclaw && \
    chown -R 1000:1000 /home/node

# Copy pre-built OpenClaw (skips npm install entirely — much faster!)
COPY --from=openclaw --chown=1000:1000 /app /home/node/.openclaw/openclaw-app

# Add Playwright in an isolated sidecar node_modules so we do not mutate the
# bundled OpenClaw app dependency tree.
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
COPY --chown=1000:1000 iframe-fix.cjs /home/node/app/iframe-fix.cjs
COPY --chown=1000:1000 start.sh /home/node/app/start.sh
COPY --chown=1000:1000 wa-guardian.js /home/node/app/wa-guardian.js
COPY --chown=1000:1000 workspace-sync.py /home/node/app/workspace-sync.py
RUN chmod +x /home/node/app/start.sh /home/node/app/cloudflare-proxy-setup.py

USER node

ENV HOME=/home/node \
    OPENCLAW_VERSION=${OPENCLAW_VERSION} \
    PATH=/home/node/.local/bin:/usr/local/bin:$PATH \
    NODE_PATH=/home/node/browser-deps/node_modules \
    NODE_OPTIONS="--require /opt/cloudflare-proxy.js"

WORKDIR /home/node/app

EXPOSE 7861

# health-server.js exposes /health on 7861 and proxies to the gateway on 7860.
# 90s start period covers OpenClaw's plugin install + gateway boot on cold start.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD curl -fsS http://localhost:7861/health || exit 1

CMD ["/home/node/app/start.sh"]

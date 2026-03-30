FROM node:22-slim

# Version pinning (default: latest)
ARG OPENCLAW_VERSION=latest

# Install git, ca-certificates, jq, and curl
RUN apt-get update && apt-get install -y \
    git \
    ca-certificates \
    jq \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Reuse existing node user (UID 1000)
RUN mkdir -p /home/node/app /home/node/.openclaw && \
    chown -R 1000:1000 /home/node

# Install OpenClaw (version configurable via build arg)
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Copy files
COPY --chown=1000:1000 dns-fix.js /opt/dns-fix.js
COPY --chown=1000:1000 health-server.js /home/node/app/health-server.js
COPY --chown=1000:1000 start.sh /home/node/app/start.sh
COPY --chown=1000:1000 keep-alive.sh /home/node/app/keep-alive.sh
COPY --chown=1000:1000 workspace-sync.sh /home/node/app/workspace-sync.sh
RUN chmod +x /home/node/app/start.sh /home/node/app/keep-alive.sh /home/node/app/workspace-sync.sh

USER node

ENV HOME=/home/node \
    PATH=/home/node/.local/bin:/usr/local/bin:$PATH \
    NODE_OPTIONS="--require /opt/dns-fix.js"

WORKDIR /home/node/app

EXPOSE 7860

CMD ["/home/node/app/start.sh"]

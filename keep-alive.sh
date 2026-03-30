#!/bin/bash
# Self-ping keep-alive for HF Spaces
# HF Spaces sleeps after 48h of inactivity (no HTTP requests)
# This script pings the Space's own URL to prevent that
#
# HF provides SPACE_HOST env var automatically (e.g., "username-spacename.hf.space")
# Runs as a background process alongside the gateway

INTERVAL="${KEEP_ALIVE_INTERVAL:-300}"  # Default: every 5 minutes

if [ "$INTERVAL" = "0" ]; then
  echo "⏸️  Keep-alive: disabled (KEEP_ALIVE_INTERVAL=0)"
  exit 0
fi

if [ -z "$SPACE_HOST" ]; then
  echo "⏸️  Keep-alive: SPACE_HOST not set (not on HF Spaces?), skipping."
  exit 0
fi

# Ping the Space URL — any HTTP response (even 404) counts as activity
PING_URL="https://${SPACE_HOST}"

echo "💓 Keep-alive started: pinging ${PING_URL} every ${INTERVAL}s"

while true; do
  sleep "$INTERVAL"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PING_URL" 2>/dev/null)
  if [ "$HTTP_CODE" = "000" ]; then
    echo "💓 Keep-alive: ping failed (network error), retrying next cycle..."
  else
    echo "💓 Keep-alive: OK"
  fi
done

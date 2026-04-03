#!/bin/bash
set -euo pipefail

# Create or update a UptimeRobot monitor for this Hugging Face Space.
#
# Requirements:
# - UPTIMEROBOT_API_KEY: Main API key from UptimeRobot
# - SPACE_HOST or first CLI arg: your HF Space host, e.g. "user-space.hf.space"
#
# Optional:
# - UPTIMEROBOT_MONITOR_NAME: friendly name for the monitor
# - UPTIMEROBOT_ALERT_CONTACTS: dash-separated alert contact IDs, e.g. "123456-789012"
# - UPTIMEROBOT_INTERVAL: monitoring interval in minutes (subject to account limits)

API_URL="https://api.uptimerobot.com/v2"
API_KEY="${UPTIMEROBOT_API_KEY:-}"
SPACE_HOST_INPUT="${1:-${SPACE_HOST:-}}"

if [ -z "$API_KEY" ]; then
  echo "Missing UPTIMEROBOT_API_KEY."
  echo "Use the Main API key from UptimeRobot -> Integrations."
  echo "Do not use the Read-only API key or a Monitor-specific API key."
  exit 1
fi

if [ -z "$SPACE_HOST_INPUT" ]; then
  echo "Missing Space host."
  echo "Usage: UPTIMEROBOT_API_KEY=... ./setup-uptimerobot.sh your-space.hf.space"
  exit 1
fi

SPACE_HOST_CLEAN="${SPACE_HOST_INPUT#https://}"
SPACE_HOST_CLEAN="${SPACE_HOST_CLEAN#http://}"
SPACE_HOST_CLEAN="${SPACE_HOST_CLEAN%%/*}"

MONITOR_URL="https://${SPACE_HOST_CLEAN}/health"
MONITOR_NAME="${UPTIMEROBOT_MONITOR_NAME:-HuggingClaw ${SPACE_HOST_CLEAN}}"
INTERVAL="${UPTIMEROBOT_INTERVAL:-5}"

echo "Checking existing UptimeRobot monitors for ${MONITOR_URL}..."
MONITORS_RESPONSE=$(curl -sS -X POST "${API_URL}/getMonitors" \
  -d "api_key=${API_KEY}" \
  -d "format=json" \
  -d "logs=0" \
  -d "response_times=0" \
  -d "response_times_limit=1")

MONITOR_ID=$(printf '%s' "$MONITORS_RESPONSE" | jq -r --arg url "$MONITOR_URL" '
  (.monitors // []) | map(select(.url == $url)) | first | .id // empty
')

if [ -n "$MONITOR_ID" ]; then
  echo "Monitor already exists (id=${MONITOR_ID}) for ${MONITOR_URL}"
  exit 0
fi

echo "Creating new UptimeRobot monitor for ${MONITOR_URL}..."

CURL_ARGS=(
  -sS
  -X POST "${API_URL}/newMonitor"
  -d "api_key=${API_KEY}"
  -d "format=json"
  -d "type=1"
  -d "friendly_name=${MONITOR_NAME}"
  -d "url=${MONITOR_URL}"
  -d "interval=${INTERVAL}"
)

if [ -n "${UPTIMEROBOT_ALERT_CONTACTS:-}" ]; then
  CURL_ARGS+=(-d "alert_contacts=${UPTIMEROBOT_ALERT_CONTACTS}")
fi

CREATE_RESPONSE=$(curl "${CURL_ARGS[@]}")
CREATE_STATUS=$(printf '%s' "$CREATE_RESPONSE" | jq -r '.stat // "fail"')

if [ "$CREATE_STATUS" != "ok" ]; then
  echo "Failed to create monitor."
  printf '%s\n' "$CREATE_RESPONSE"
  exit 1
fi

NEW_ID=$(printf '%s' "$CREATE_RESPONSE" | jq -r '.monitor.id // empty')
echo "Created UptimeRobot monitor ${NEW_ID:-"(id unavailable)"} for ${MONITOR_URL}"

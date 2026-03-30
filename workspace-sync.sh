#!/bin/bash
# Periodic workspace sync to HF Dataset
# Commits and pushes workspace changes every SYNC_INTERVAL seconds
# Runs as a background process alongside the gateway

INTERVAL="${SYNC_INTERVAL:-600}"  # Default: every 10 minutes
WORKSPACE="/home/node/.openclaw/workspace"

# Wait for workspace to be initialized
sleep 30

if [ ! -d "$WORKSPACE/.git" ]; then
  echo "📁 Workspace sync: no git repo found, skipping."
  exit 0
fi

echo "🔄 Workspace sync started: syncing every ${INTERVAL}s"

while true; do
  sleep "$INTERVAL"
  
  cd "$WORKSPACE" || continue
  
  # Check if there are any changes
  git add -A 2>/dev/null
  if git diff --cached --quiet 2>/dev/null; then
    # No changes
    continue
  fi
  
  # Commit and push
  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if git commit -m "Auto-sync ${TIMESTAMP}" 2>/dev/null; then
    if git push origin main 2>/dev/null; then
      echo "🔄 Workspace sync: pushed changes (${TIMESTAMP})"
    else
      echo "🔄 Workspace sync: commit ok, push failed (will retry)"
    fi
  fi
done

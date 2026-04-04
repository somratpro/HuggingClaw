#!/usr/bin/env python3
"""
HuggingClaw Workspace Sync — HuggingFace Hub based backup
Uses huggingface_hub Python library instead of git for more reliable
HF Dataset operations (handles auth, LFS, retries automatically).

Falls back to git-based sync if HF_USERNAME or HF_TOKEN are not set.
"""

import os
import sys
import time
import signal
import shutil
import subprocess
from pathlib import Path

OPENCLAW_HOME = Path("/home/node/.openclaw")
WORKSPACE = OPENCLAW_HOME / "workspace"
STATE_DIR = WORKSPACE / ".huggingclaw-state"
OPENCLAW_STATE_BACKUP_DIR = STATE_DIR / "openclaw"
PERSISTED_STATE_PATHS = {
    "agents": OPENCLAW_HOME / "agents",
    "memory": OPENCLAW_HOME / "memory",
    "extensions": OPENCLAW_HOME / "extensions",
}
WHATSAPP_CREDS_DIR = Path("/home/node/.openclaw/credentials/whatsapp/default")
WHATSAPP_BACKUP_DIR = STATE_DIR / "credentials" / "whatsapp" / "default"
RESET_MARKER = WORKSPACE / ".reset_credentials"
INTERVAL = int(os.environ.get("SYNC_INTERVAL", "600"))
INITIAL_DELAY = int(os.environ.get("SYNC_START_DELAY", "10"))
HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_USERNAME = os.environ.get("HF_USERNAME", "")
BACKUP_DATASET = os.environ.get("BACKUP_DATASET_NAME", "huggingclaw-backup")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
WHATSAPP_ENABLED = os.environ.get("WHATSAPP_ENABLED", "").strip().lower() == "true"

running = True

def signal_handler(sig, frame):
    global running
    running = False

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


def count_files(path: Path) -> int:
    """Count regular files recursively under a path."""
    if not path.exists():
        return 0
    return sum(1 for child in path.rglob("*") if child.is_file())


def snapshot_state_into_workspace() -> None:
    """
    Mirror persistent state into the workspace-backed dataset repo.

    This keeps WhatsApp credentials in a hidden folder that is synced together
    with the workspace, without changing the live credentials location.
    """
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)

        for name, source_path in PERSISTED_STATE_PATHS.items():
            if not source_path.exists():
                continue

            backup_path = OPENCLAW_STATE_BACKUP_DIR / name
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            if backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            shutil.copytree(source_path, backup_path)
    except Exception as e:
        print(f"  ⚠️ Could not snapshot OpenClaw state: {e}")

    try:
        if not WHATSAPP_ENABLED:
            return

        STATE_DIR.mkdir(parents=True, exist_ok=True)

        if RESET_MARKER.exists():
            if WHATSAPP_BACKUP_DIR.exists():
                shutil.rmtree(WHATSAPP_BACKUP_DIR, ignore_errors=True)
                print("🧹 Removed backed-up WhatsApp credentials after reset request.")
            RESET_MARKER.unlink(missing_ok=True)
            return

        if not WHATSAPP_CREDS_DIR.exists():
            return

        file_count = count_files(WHATSAPP_CREDS_DIR)
        if file_count < 2:
            if file_count > 0:
                print(f"📦 WhatsApp backup skipped: credentials incomplete ({file_count} files).")
            return

        WHATSAPP_BACKUP_DIR.parent.mkdir(parents=True, exist_ok=True)
        if WHATSAPP_BACKUP_DIR.exists():
            shutil.rmtree(WHATSAPP_BACKUP_DIR, ignore_errors=True)
        shutil.copytree(WHATSAPP_CREDS_DIR, WHATSAPP_BACKUP_DIR)
    except Exception as e:
        print(f"  ⚠️ Could not snapshot WhatsApp state: {e}")


def has_changes():
    """Check if workspace has uncommitted changes (git-based check)."""
    try:
        subprocess.run(["git", "add", "-A"], cwd=WORKSPACE, capture_output=True)
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=WORKSPACE, capture_output=True
        )
        return result.returncode != 0
    except Exception:
        return False

def write_sync_status(status, message=""):
    """Write sync status to file for the health server dashboard."""
    try:
        import json
        data = {
            "status": status,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "message": message
        }
        with open("/tmp/sync-status.json", "w") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"  ⚠️ Could not write sync status: {e}")

def trigger_webhook(event, status, message):
    """Trigger webhook notification."""
    if not WEBHOOK_URL:
        return
    try:
        import urllib.request
        import json
        data = json.dumps({
            "event": event,
            "status": status,
            "message": message,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }).encode('utf-8')
        req = urllib.request.Request(WEBHOOK_URL, data=data, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"  ⚠️ Webhook delivery failed: {e}")

def sync_with_hf_hub():
    """Sync workspace using huggingface_hub library."""
    try:
        from huggingface_hub import HfApi, upload_folder

        api = HfApi(token=HF_TOKEN)
        repo_id = f"{HF_USERNAME}/{BACKUP_DATASET}"

        # Ensure dataset exists
        try:
            api.repo_info(repo_id=repo_id, repo_type="dataset")
        except Exception:
            print(f"  📝 Creating dataset {repo_id}...")
            try:
                api.create_repo(repo_id=repo_id, repo_type="dataset", private=True)
                print(f"  ✅ Dataset created: {repo_id}")
            except Exception as e:
                print(f"  ⚠️  Could not create dataset: {e}")
                return False

        # Upload workspace
        upload_folder(
            folder_path=str(WORKSPACE),
            repo_id=repo_id,
            repo_type="dataset",
            token=HF_TOKEN,
            commit_message=f"Auto-sync {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
            ignore_patterns=[".git/*", ".git"],
        )
        return True

    except ImportError:
        print("  ⚠️  huggingface_hub not installed, falling back to git")
        return False
    except Exception as e:
        print(f"  ⚠️  HF Hub sync failed: {e}")
        return False


def sync_with_git():
    """Fallback: sync workspace using git."""
    try:
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        subprocess.run(["git", "add", "-A"], cwd=WORKSPACE, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", f"Auto-sync {ts}"],
            cwd=WORKSPACE, capture_output=True
        )
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=WORKSPACE, capture_output=True
        )
        return result.returncode == 0
    except Exception:
        return False


def main():
    if "--snapshot-once" in sys.argv:
        snapshot_state_into_workspace()
        write_sync_status("configured", "State snapshot refreshed during shutdown.")
        return

    if not WORKSPACE.exists():
        print("📁 Workspace sync: workspace not found, exiting.")
        return

    use_hf_hub = bool(HF_TOKEN and HF_USERNAME)
    git_dir = WORKSPACE / ".git"

    if not use_hf_hub and not git_dir.exists():
        print("📁 Workspace sync: no git repo and no HF credentials, skipping.")
        return

    # Give the gateway a short head start before the first sync probe.
    if use_hf_hub:
        write_sync_status("configured", f"Backup enabled. Waiting for next sync in {INTERVAL}s.")
    else:
        write_sync_status("configured", f"Git sync enabled. Waiting for next sync in {INTERVAL}s.")

    # Give the gateway a short head start before the first sync probe.
    time.sleep(INITIAL_DELAY)

    snapshot_state_into_workspace()

    if use_hf_hub:
        print(f"🔄 Workspace sync started (huggingface_hub): every {INTERVAL}s → {HF_USERNAME}/{BACKUP_DATASET}")
    else:
        print(f"🔄 Workspace sync started (git): every {INTERVAL}s")

    while running:
        time.sleep(INTERVAL)
        if not running:
            break

        snapshot_state_into_workspace()

        if not has_changes():
            continue

        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        write_sync_status("syncing", f"Starting sync at {ts}")

        if use_hf_hub:
            if sync_with_hf_hub():
                print(f"🔄 Workspace sync (hf_hub): pushed changes ({ts})")
                write_sync_status("success", "Successfully pushed to HF Hub")
            else:
                # Fallback to git
                if sync_with_git():
                    print(f"🔄 Workspace sync (git fallback): pushed changes ({ts})")
                    write_sync_status("success", "Successfully pushed via git fallback")
                else:
                    msg = f"Workspace sync: failed ({ts}), will retry"
                    print(f"🔄 {msg}")
                    write_sync_status("error", msg)
                    trigger_webhook("sync", "error", msg)
        else:
            if sync_with_git():
                print(f"🔄 Workspace sync (git): pushed changes ({ts})")
                write_sync_status("success", "Successfully pushed via git")
            else:
                msg = f"Workspace sync: push failed ({ts}), will retry"
                print(f"🔄 {msg}")
                write_sync_status("error", msg)
                trigger_webhook("sync", "error", msg)


if __name__ == "__main__":
    main()

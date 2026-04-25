#!/usr/bin/env python3
"""
HuggingClaw workspace/state backup via huggingface_hub.

This keeps OpenClaw workspace data, app state, and optional WhatsApp
credentials inside a private HF dataset without embedding HF tokens in git
remotes or requiring a manual HF_USERNAME secret.
"""

import hashlib
import json
import os
import shutil
import signal
import sys
import tempfile
import threading
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

from huggingface_hub import HfApi, snapshot_download, upload_folder
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

OPENCLAW_HOME = Path("/home/node/.openclaw")
WORKSPACE = OPENCLAW_HOME / "workspace"
STATUS_FILE = Path("/tmp/sync-status.json")
INTERVAL = int(os.environ.get("SYNC_INTERVAL", "180"))
INITIAL_DELAY = int(os.environ.get("SYNC_START_DELAY", "10"))
HF_TOKEN = os.environ.get("HF_TOKEN", "").strip()
HF_USERNAME = os.environ.get("HF_USERNAME", "").strip()
SPACE_AUTHOR_NAME = os.environ.get("SPACE_AUTHOR_NAME", "").strip()
BACKUP_DATASET_NAME = os.environ.get("BACKUP_DATASET_NAME", "huggingclaw-backup").strip()
WHATSAPP_ENABLED = os.environ.get("WHATSAPP_ENABLED", "").strip().lower() == "true"

STATE_DIR = WORKSPACE / ".huggingclaw-state"
OPENCLAW_STATE_BACKUP_DIR = STATE_DIR / "openclaw"
EXCLUDED_STATE_NAMES = {
    "workspace",
    "openclaw-app",
    "gateway.log",
    "browser",
}
WHATSAPP_CREDS_DIR = OPENCLAW_HOME / "credentials" / "whatsapp" / "default"
WHATSAPP_BACKUP_DIR = STATE_DIR / "credentials" / "whatsapp" / "default"
RESET_MARKER = WORKSPACE / ".reset_credentials"
HF_API = HfApi(token=HF_TOKEN) if HF_TOKEN else None
STOP_EVENT = threading.Event()
_REPO_ID_CACHE: str | None = None


def write_status(status: str, message: str) -> None:
    payload = {
        "status": status,
        "message": message,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    tmp_path = STATUS_FILE.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload), encoding="utf-8")
    tmp_path.replace(STATUS_FILE)


def count_files(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for child in path.rglob("*") if child.is_file())


def snapshot_state_into_workspace() -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        if OPENCLAW_STATE_BACKUP_DIR.exists():
            shutil.rmtree(OPENCLAW_STATE_BACKUP_DIR, ignore_errors=True)
        OPENCLAW_STATE_BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        for source_path in OPENCLAW_HOME.iterdir():
            if source_path.name in EXCLUDED_STATE_NAMES:
                continue

            backup_path = OPENCLAW_STATE_BACKUP_DIR / source_path.name
            if source_path.is_dir():
                shutil.copytree(source_path, backup_path)
            elif source_path.is_file():
                shutil.copy2(source_path, backup_path)
    except Exception as exc:
        print(f"  ⚠️ Could not snapshot OpenClaw state: {exc}")

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
    except Exception as exc:
        print(f"  ⚠️ Could not snapshot WhatsApp state: {exc}")


def restore_embedded_state() -> None:
    state_backup_root = STATE_DIR / "openclaw"
    if state_backup_root.is_dir():
        print("🧠 Restoring OpenClaw state...")
        for source_path in state_backup_root.iterdir():
            name = source_path.name
            if name in EXCLUDED_STATE_NAMES:
                if source_path.is_dir():
                    shutil.rmtree(source_path, ignore_errors=True)
                else:
                    source_path.unlink(missing_ok=True)
                print(f"  ↷ Skipping stale backup entry: {name}")
                continue
            target_path = OPENCLAW_HOME / name
            shutil.rmtree(target_path, ignore_errors=True)
            if target_path.is_file():
                target_path.unlink(missing_ok=True)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            if source_path.is_dir():
                shutil.copytree(source_path, target_path)
            else:
                shutil.copy2(source_path, target_path)
        print("  ✅ OpenClaw state restored")

    if WHATSAPP_ENABLED and WHATSAPP_BACKUP_DIR.is_dir():
        file_count = count_files(WHATSAPP_BACKUP_DIR)
        if file_count >= 2:
            print("📱 Restoring WhatsApp credentials...")
            shutil.rmtree(WHATSAPP_CREDS_DIR, ignore_errors=True)
            WHATSAPP_CREDS_DIR.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(WHATSAPP_BACKUP_DIR, WHATSAPP_CREDS_DIR)
            os.chmod(OPENCLAW_HOME / "credentials", 0o700)
            print("  ✅ WhatsApp credentials restored")
        else:
            print(f"  ⚠️ Saved WhatsApp credentials look incomplete ({file_count} files), skipping restore.")


def resolve_backup_namespace() -> str:
    global _REPO_ID_CACHE
    if _REPO_ID_CACHE:
        return _REPO_ID_CACHE

    namespace = HF_USERNAME or SPACE_AUTHOR_NAME
    if not namespace and HF_API is not None:
        whoami = HF_API.whoami()
        namespace = whoami.get("name") or whoami.get("user") or ""

    namespace = str(namespace).strip()
    if not namespace:
        raise RuntimeError(
            "Could not determine the Hugging Face username for backups. "
            "Set HF_USERNAME or use a token tied to your account."
        )

    _REPO_ID_CACHE = f"{namespace}/{BACKUP_DATASET_NAME}"
    return _REPO_ID_CACHE


def ensure_repo_exists() -> str:
    repo_id = resolve_backup_namespace()
    try:
        HF_API.repo_info(repo_id=repo_id, repo_type="dataset")
    except RepositoryNotFoundError:
        HF_API.create_repo(repo_id=repo_id, repo_type="dataset", private=True)
    return repo_id


def metadata_marker(root: Path) -> tuple[int, int, int]:
    if not root.exists():
        return (0, 0, 0)

    file_count = 0
    total_size = 0
    newest_mtime = 0
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith(".git/"):
            continue
        try:
            stat = path.stat()
        except OSError:
            continue
        file_count += 1
        total_size += int(stat.st_size)
        newest_mtime = max(newest_mtime, int(stat.st_mtime_ns))
    return (file_count, total_size, newest_mtime)


def fingerprint_dir(root: Path) -> str:
    hasher = hashlib.sha256()
    if not root.exists():
        return hasher.hexdigest()

    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        rel = path.relative_to(root).as_posix()
        if rel.startswith(".git/"):
            continue
        hasher.update(rel.encode("utf-8"))
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                hasher.update(chunk)
    return hasher.hexdigest()


def create_snapshot_dir(source_root: Path) -> Path:
    staging_root = Path(tempfile.mkdtemp(prefix="huggingclaw-sync-"))
    for path in sorted(source_root.rglob("*")):
        rel = path.relative_to(source_root)
        rel_posix = rel.as_posix()
        if rel_posix.startswith(".git/") or rel_posix == ".git":
            continue
        target = staging_root / rel
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    return staging_root


def restore_workspace() -> bool:
    if not HF_TOKEN:
        write_status("disabled", "HF_TOKEN is not configured.")
        return False

    repo_id = resolve_backup_namespace()
    write_status("restoring", f"Restoring workspace from {repo_id}")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            snapshot_download(
                repo_id=repo_id,
                repo_type="dataset",
                token=HF_TOKEN,
                local_dir=tmpdir,
            )

            tmp_path = Path(tmpdir)
            if not any(tmp_path.iterdir()):
                write_status("fresh", "Backup dataset is empty. Starting fresh.")
                return True

            WORKSPACE.mkdir(parents=True, exist_ok=True)
            for child in list(WORKSPACE.iterdir()):
                if child.name == ".git":
                    continue
                if child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
                else:
                    child.unlink(missing_ok=True)

            for child in tmp_path.iterdir():
                if child.name == ".git":
                    continue
                destination = WORKSPACE / child.name
                if child.is_dir():
                    shutil.copytree(child, destination)
                else:
                    shutil.copy2(child, destination)

        restore_embedded_state()
        write_status("restored", f"Restored workspace from {repo_id}")
        return True
    except RepositoryNotFoundError:
        write_status("fresh", f"Backup dataset {repo_id} does not exist yet.")
        return True
    except HfHubHTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            write_status("fresh", f"Backup dataset {repo_id} does not exist yet.")
            return True
        write_status("error", f"Restore failed: {exc}")
        print(f"Restore failed: {exc}", file=sys.stderr)
        return False
    except Exception as exc:
        write_status("error", f"Restore failed: {exc}")
        print(f"Restore failed: {exc}", file=sys.stderr)
        return False


def sync_once(
    last_fingerprint: str | None = None,
    last_marker: tuple[int, int, int] | None = None,
) -> tuple[str, tuple[int, int, int]]:
    if not HF_TOKEN:
        write_status("disabled", "HF_TOKEN is not configured.")
        return (last_fingerprint or "", last_marker or (0, 0, 0))

    snapshot_state_into_workspace()
    repo_id = ensure_repo_exists()
    current_marker = metadata_marker(WORKSPACE)

    if last_marker is not None and current_marker == last_marker:
        write_status("synced", "No workspace changes detected.")
        return (last_fingerprint or "", current_marker)

    current_fingerprint = fingerprint_dir(WORKSPACE)
    if last_fingerprint is not None and current_fingerprint == last_fingerprint:
        write_status("synced", "No workspace changes detected.")
        return (last_fingerprint, current_marker)

    write_status("syncing", f"Uploading workspace to {repo_id}")
    snapshot_dir = create_snapshot_dir(WORKSPACE)
    try:
        upload_folder(
            folder_path=str(snapshot_dir),
            repo_id=repo_id,
            repo_type="dataset",
            token=HF_TOKEN,
            commit_message=f"HuggingClaw sync {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
            ignore_patterns=[".git/*", ".git"],
        )
    finally:
        shutil.rmtree(snapshot_dir, ignore_errors=True)

    write_status("success", f"Uploaded workspace to {repo_id}")
    return (current_fingerprint, current_marker)


def handle_signal(_sig, _frame) -> None:
    STOP_EVENT.set()


def loop() -> int:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        repo_id = resolve_backup_namespace()
        write_status("configured", f"Backup loop active for {repo_id} with {INTERVAL}s interval.")
    except Exception as exc:
        write_status("error", str(exc))
        print(f"📁 Workspace sync: {exc}")
        return 1

    last_fingerprint = fingerprint_dir(WORKSPACE)
    last_marker = metadata_marker(WORKSPACE)

    time.sleep(INITIAL_DELAY)
    print(f"🔄 Workspace sync started: every {INTERVAL}s → {repo_id}")

    while not STOP_EVENT.is_set():
        try:
            last_fingerprint, last_marker = sync_once(last_fingerprint, last_marker)
        except Exception as exc:
            write_status("error", f"Sync failed: {exc}")
            print(f"📁 Workspace sync failed: {exc}")

        if STOP_EVENT.wait(INTERVAL):
            break

    return 0


def main() -> int:
    WORKSPACE.mkdir(parents=True, exist_ok=True)

    if len(sys.argv) < 2:
        return loop()

    command = sys.argv[1]
    if command == "restore":
        return 0 if restore_workspace() else 1
    if command == "sync-once":
        try:
            sync_once()
            return 0
        except Exception as exc:
            write_status("error", f"Shutdown sync failed: {exc}")
            print(f"📁 Workspace sync: shutdown sync failed: {exc}")
            return 1
    if command == "loop":
        return loop()

    print(f"Unknown command: {command}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

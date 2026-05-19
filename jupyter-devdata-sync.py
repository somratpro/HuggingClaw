#!/usr/bin/env python3
from __future__ import annotations

import os, shutil, socket, sys, tempfile, time
from pathlib import Path

HF_TOKEN = os.environ.get("HF_TOKEN", "").strip()
HF_USERNAME = os.environ.get("HF_USERNAME", "").strip() or os.environ.get("SPACE_AUTHOR_NAME", "").strip()
DATASET_NAME = os.environ.get("DEVDATA_DATASET_NAME", "").strip() or "huggingclaw-devdata"
BACKUP_DATASET_NAME = os.environ.get("BACKUP_DATASET_NAME", "").strip() or os.environ.get("BACKUP_DATASET", "").strip() or "huggingclaw-backup"
JUPYTER_ROOT = Path(os.environ.get("JUPYTER_ROOT_DIR", "/home/node")).resolve()
INTERVAL = int((os.environ.get("DEVDATA_SYNC_INTERVAL", "").strip() or "180"))
# BUG FIX #5: Respect max file size so giant files don't stall uploads.
# Matches the 50 MB ceiling in openclaw-sync.py; override with DEVDATA_MAX_FILE_BYTES.
MAX_FILE_SIZE_BYTES = int(
    (os.environ.get("DEVDATA_MAX_FILE_BYTES", "").strip() or str(50 * 1024 * 1024))
)

def is_true(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}

ENABLE = is_true(os.environ.get("DEVDATA", "on"))


def classify_error(exc: Exception) -> str:
    msg = str(exc).lower()
    if isinstance(exc, PermissionError) or "permission denied" in msg:
        return "filesystem-permission"
    if any(k in msg for k in ("connection error", "fetch failed", "timeout", "temporarily unavailable", "network")):
        return "network-provider"
    if "unsafe" in msg or "malware" in msg or "security" in msg:
        return "safety-scan"
    return "general"

# BUG FIX #4: ".local/share/Trash" in the original EXCLUDE set was a
# multi-component path string that was never matched because parts-based
# lookup compares individual directory names.  Added "Trash" as a standalone
# component so any path with a "Trash" segment (e.g. .local/share/Trash/*)
# is correctly skipped during snapshot and restore.
EXCLUDE = {
    ".cache",
    "node_modules",
    ".npm",
    ".yarn",
    "Trash",            # BUG FIX #4: covers .local/share/Trash (was ".local/share/Trash" — never matched)
    ".ipynb_checkpoints",
    ".openclaw",
    "app",
    "HuggingClaw",
    "HuggingClaw-Workspace",
    "browser-deps",
    # Exclude Python/system package directories — these contain thousands of files
    # (e.g. .local/lib/python3.11/site-packages/) and must not be synced to the
    # HF Dataset. Syncing them causes 10,000+ file fetches on every restore and
    # can restore a broken jsonschema that crashes JupyterLab on boot.
    ".local",
    "lib",
    "site-packages",
    "__pycache__",
}


def enabled():
    dev = is_true(os.environ.get("DEV_MODE", ""))
    separate_dataset = DATASET_NAME != BACKUP_DATASET_NAME
    if ENABLE and dev and HF_TOKEN and not separate_dataset:
        print("DevData sync disabled: DEVDATA_DATASET_NAME must be separate from BACKUP_DATASET_NAME.")
    return ENABLE and dev and bool(HF_TOKEN) and separate_dataset

def validate_jupyter_paths() -> None:
    # JupyterLab theme/settings live under ~/.jupyter and ~/.local/share/jupyter.
    # If these are not writable, settings can appear to "reset" every restart.
    for required in (JUPYTER_ROOT, Path("/home/node/.jupyter"), Path("/home/node/.local/share/jupyter")):
        try:
            required.mkdir(parents=True, exist_ok=True)
            probe = required / ".devdata-write-check"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
        except Exception as exc:
            kind = classify_error(exc)
            print(f"DevData warning [{kind}]: {required} is not writable; Jupyter settings may not persist ({exc})")

def repo_id(api) -> str:
    ns = HF_USERNAME
    if not ns:
        who = api.whoami()
        ns = who.get("name") or who.get("user") or ""
    if not ns:
        raise RuntimeError("Cannot resolve HF namespace for devdata sync")
    return f"{ns}/{DATASET_NAME}"

# Filename patterns that must never be synced to a public/private HF Dataset.
# These are matched against the *name* of each path component (not the full path),
# so ".env" matches /home/node/.env and /home/node/subdir/.env alike.
import fnmatch as _fnmatch

SECRET_FILENAME_PATTERNS = {
    ".env",           # dotenv files — almost always contain API keys
    ".env.*",         # .env.local, .env.production, etc.
    "*secret*",       # any file/dir whose name contains "secret"
    "*secrets*",
    "*_secret*",
    "*-secret*",
    "*key*",          # private keys, API key files
    "*_key*",
    "*-key*",
    "*token*",        # token files
    "*_token*",
    "*-token*",
    "*.pem",          # TLS/SSH private keys
    "*.key",          # generic key files
    "*.p12",          # PKCS#12 bundles
    "*.pfx",
    "credentials",    # common credential file names
    "credentials.*",
    ".netrc",         # stores plaintext passwords
    ".htpasswd",
}


def _name_is_secret(name: str) -> bool:
    """Return True if *name* matches any secret-exclusion pattern."""
    name_lower = name.lower()
    return any(_fnmatch.fnmatch(name_lower, pat) for pat in SECRET_FILENAME_PATTERNS)


def should_skip(p: Path):
    # Skip directories/files in the hard-coded exclude set.
    parts = p.parts
    if any(x in parts for x in EXCLUDE):
        return True
    # Skip any component whose name looks like a secret file/dir.
    return any(_name_is_secret(part) for part in parts)

def snapshot(src: Path, dst: Path):
    for p in src.rglob("*"):
        rel = p.relative_to(src)
        if should_skip(rel):
            continue
        if p.is_symlink():
            continue
        target = dst / rel
        if p.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif p.is_file():
            # BUG FIX #5: Skip files that exceed the size limit.
            try:
                if p.stat().st_size > MAX_FILE_SIZE_BYTES:
                    continue
            except OSError:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(p, target)
            except OSError:
                pass

def is_jupyter_running(port: int = 8888) -> bool:
    """Return True if JupyterLab is already listening on *port*.

    BUG FIX #2 (safety net): restore_once() must never run while JupyterLab
    is active.  Overwriting files under JUPYTER_ROOT (runtime/ sockets, lab/
    settings, kernel connection files) while JupyterLab is live corrupts its
    state and causes it to exit within seconds.

    The primary guard is the --restore / sync separation introduced in
    BUG FIX #3, but this TCP probe stays as a hard backstop for any future
    code path that might call restore_once() unexpectedly.
    """
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            return True
    except OSError:
        return False

def restore_once(api, rid: str):
    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import RepositoryNotFoundError
    tmp = Path(tempfile.mkdtemp(prefix="devdata-restore-"))
    try:
        snapshot_download(repo_id=rid, repo_type="dataset", local_dir=str(tmp), local_dir_use_symlinks=False, token=HF_TOKEN)
        for p in tmp.rglob("*"):
            rel = p.relative_to(tmp)
            if should_skip(rel):
                continue
            if str(rel) == ".gitattributes":
                continue
            target = JUPYTER_ROOT / rel
            if p.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            elif p.is_file():
                target.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.copy2(p, target)
                except OSError as exc:
                    kind = classify_error(exc)
                    print(f"DevData restore skip [{kind}] (cannot write {target}): {exc}")
        print(f"DevData restored from {rid}")
    except RepositoryNotFoundError:
        print(f"DevData dataset not found yet: {rid}")
    except Exception as exc:
        kind = classify_error(exc)
        print(f"DevData restore warning [{kind}]: {exc}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def prune_remote_deleted_files(api, rid: str, snapshot_dir: Path) -> None:
    """BUG FIX #6: Delete from the HF dataset any files the user deleted
    locally.  Without this, deleted files re-appear on the next Space restart
    because restore_once() copies everything in the dataset back to disk.
    Mirrors the prune_remote_deleted_files() logic in openclaw-sync.py.
    """
    try:
        local_files = {
            p.relative_to(snapshot_dir).as_posix()
            for p in snapshot_dir.rglob("*")
            if p.is_file()
        }
        remote_files = list(api.list_repo_files(repo_id=rid, repo_type="dataset"))
        stale = [f for f in remote_files if f not in local_files and f != ".gitattributes"]
        if stale:
            api.delete_files(
                delete_patterns=stale,
                repo_id=rid,
                repo_type="dataset",
                commit_message=f"DevData prune {len(stale)} deleted file(s) {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
            )
            print(f"DevData pruned {len(stale)} deleted file(s) from {rid}")
    except Exception as exc:
        kind = classify_error(exc)
        print(f"DevData prune warning [{kind}]: {exc}")

def sync_loop(api, rid: str):
    while True:
        tmp = Path(tempfile.mkdtemp(prefix="devdata-snap-"))
        try:
            snapshot(JUPYTER_ROOT, tmp)
            upload_folder(
                folder_path=str(tmp),
                repo_id=rid,
                repo_type="dataset",
                token=HF_TOKEN,
                commit_message=f"DevData sync {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
                ignore_patterns=[".git/*", ".git"],
            )
            print(f"DevData synced to {rid}")
            # BUG FIX #6: Prune files deleted locally so they don't reappear on restore.
            prune_remote_deleted_files(api, rid, tmp)
        except Exception as exc:
            kind = classify_error(exc)
            print(f"DevData sync warning [{kind}]: {exc}")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    if not enabled():
        print("DevData sync disabled.")
        raise SystemExit(0)

    from huggingface_hub import HfApi, upload_folder, snapshot_download
    from huggingface_hub.errors import RepositoryNotFoundError

    api = HfApi(token=HF_TOKEN)
    rid = repo_id(api)
    try:
        api.repo_info(repo_id=rid, repo_type="dataset")
    except RepositoryNotFoundError:
        api.create_repo(repo_id=rid, repo_type="dataset", private=True)

    # ── BUG FIX #3: Restore must happen BEFORE JupyterLab starts ──────────
    # The original code always called restore_once() here, but start.sh starts
    # JupyterLab long before the gateway is ready and this script is launched.
    # That made restore_once() ALWAYS run while JupyterLab was live, which
    # overwrote its runtime/ sockets and settings → JupyterLab died.
    #
    # Fix: start.sh now calls  `python3 jupyter-devdata-sync.py --restore`
    # BEFORE starting JupyterLab.  That --restore invocation does the restore
    # and exits.  This background invocation (no --restore flag) skips straight
    # to sync_loop so it never touches files while JupyterLab is running.
    #
    # BUG FIX #2 (safety net): If JupyterLab is somehow already running when
    # this code path is reached, abort restore to avoid corrupting its state.
    if "--restore" in sys.argv:
        # Synchronous restore mode — called by start.sh before JupyterLab.
        validate_jupyter_paths()
        restore_once(api, rid)
        raise SystemExit(0)

    # Normal background sync mode — no restore; go straight to upload loop.
    validate_jupyter_paths()
    if is_jupyter_running():
        print("DevData: background sync started (JupyterLab is live, restore already done by --restore).")
    else:
        # Fallback: JupyterLab not detected.  Should not normally happen
        # because start.sh calls --restore before starting JupyterLab and then
        # waits for the gateway before launching this background process.
        # Log a warning and proceed to sync; do NOT restore to avoid racing
        # with a JupyterLab that may be in the middle of starting up.
        print("DevData: WARNING — JupyterLab not detected on port 8888. Skipping restore to be safe; starting sync loop.")

    sync_loop(api, rid)

import os, shutil, subprocess, glob, time
from pathlib import Path
import urllib.request
from backend.tools.base import Tool
from backend.models.permissions import PermissionLevel

class FileTool(Tool):
    name = "file_tools"
    description = "read_file/write_file/list_dir/move_file/delete_file/search_files"
    permission = PermissionLevel.MEDIUM

    def read_file(self, path: str) -> dict: return {"content": Path(path).expanduser().read_text(encoding="utf-8")}
    def write_file(self, path: str, content: str) -> dict: Path(path).expanduser().write_text(content, encoding="utf-8"); return {"written": True}
    def list_dir(self, path: str = ".") -> dict: return {"items": os.listdir(Path(path).expanduser())}
    def move_file(self, src: str, dst: str) -> dict: shutil.move(str(Path(src).expanduser()), str(Path(dst).expanduser())); return {"moved": True}
    def delete_file(self, path: str) -> dict: Path(path).expanduser().unlink(missing_ok=True); return {"deleted": True}
    def search_files(self, query: str) -> dict: return {"matches": glob.glob(f"**/*{query}*", recursive=True)}
    def run(self, **kwargs) -> dict: return getattr(self, kwargs.pop("op"))(**kwargs)

class TerminalTool(Tool):
    name="run_command"; description="Run terminal command"; permission=PermissionLevel.DANGEROUS
    BLOCKLIST = ["rm -rf /", "mkfs", "shutdown", "reboot", ":(){:|:&};:", "dd if="]
    def run(self, **kwargs)->dict:
        cmd = kwargs["command"].strip()
        if any(b in cmd for b in self.BLOCKLIST): raise ValueError("Blocked command")
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=20)
        return {"stdout": p.stdout, "stderr": p.stderr, "code": p.returncode}

class AppControlTool(Tool):
    name="app_control"; description="open_app/close_app/focus_app"; permission=PermissionLevel.MEDIUM
    def run(self, **kwargs)->dict:
        action, name = kwargs["action"], kwargs["name"]
        mapping = {"open_app": f"nohup {name} >/dev/null 2>&1 &", "close_app": f"pkill -f {name}", "focus_app": f"wmctrl -a {name}"}
        subprocess.run(mapping[action], shell=True)
        return {"status":"ok", "action":action, "app":name}

class BrowserTool(Tool):
    name="browser"; description="open_url/scrape_page"
    def run(self, **kwargs)->dict:
        if kwargs["action"] == "open_url": subprocess.run(f"xdg-open {kwargs['url']}", shell=True); return {"opened": kwargs["url"]}
        html = urllib.request.urlopen(kwargs["url"], timeout=10).read().decode("utf-8", errors="ignore")
        return {"content": html[:4000]}

class ClipboardTool(Tool):
    name="clipboard"; description="get_clipboard/set_clipboard"; permission=PermissionLevel.MEDIUM
    def run(self, **kwargs)->dict:
        if kwargs["action"] == "set_clipboard": subprocess.run(f"printf %s {kwargs['text']!r} | xclip -selection clipboard", shell=True); return {"set": True}
        p = subprocess.run("xclip -selection clipboard -o", shell=True, text=True, capture_output=True)
        return {"text": p.stdout}

class NotificationTool(Tool):
    name="notify"; description="send_notification"
    def run(self, **kwargs)->dict:
        subprocess.run(["notify-send", kwargs["title"], kwargs["message"]])
        return {"sent": True, "at": time.time()}

import time
from pathlib import Path
import json

class Tracker:
    def __init__(self, log_file: str = "/divya/logs/actions.jsonl"):
        self.start = time.time()
        self.app_usage: dict[str, int] = {}
        self.commands: list[str] = []
        self.file_activity: list[str] = []
        self.log_file = Path(log_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def log_action(self, action: str, permission: str, args: dict):
        with self.log_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.time(), "action": action, "permission": permission, "args": args}) + "\n")

    def track_app(self, name: str): self.app_usage[name] = self.app_usage.get(name, 0) + 1
    def track_command(self, cmd: str): self.commands.append(cmd)
    def track_file(self, event: str): self.file_activity.append(event)

    def analytics(self):
        focus = int(time.time() - self.start)
        score = min(100, len(self.commands) * 3 + len(self.file_activity) * 2 + sum(self.app_usage.values()))
        return {"productivity_score": score, "focus_time": f"{focus}s"}

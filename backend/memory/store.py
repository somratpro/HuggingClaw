from pathlib import Path
import json

class MemoryStore:
    def __init__(self, file: str = "/divya/memory/long_term.json"):
        self.short_term: dict[str, list[str]] = {}
        self.file = Path(file)
        self.file.parent.mkdir(parents=True, exist_ok=True)
        if not self.file.exists(): self.file.write_text("{}", encoding="utf-8")

    def store_memory(self, session_id: str, text: str):
        self.short_term.setdefault(session_id, []).append(text)
        data = json.loads(self.file.read_text(encoding="utf-8"))
        data.setdefault(session_id, []).append(text)
        self.file.write_text(json.dumps(data), encoding="utf-8")

    def search_memory(self, session_id: str, query: str):
        data = json.loads(self.file.read_text(encoding="utf-8"))
        merged = self.short_term.get(session_id, []) + data.get(session_id, [])
        return [m for m in merged if query.lower() in m.lower()]

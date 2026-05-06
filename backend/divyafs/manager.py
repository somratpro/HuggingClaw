from pathlib import Path
import sqlite3
import numpy as np
import faiss

class DivyaFS:
    def __init__(self, root: str = "/divya"):
        self.root = Path(root)
        for p in ["files", "memory", "logs", "projects"]:
            (self.root / p).mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(self.root / "metadata.db"), check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, tag TEXT, version INTEGER, updated_at TEXT)")
        self.index = faiss.IndexFlatL2(8)
        self.refs: list[str] = []

    def upsert_metadata(self, path: str, tag: str):
        self.db.execute("INSERT INTO files(path,tag,version,updated_at) VALUES(?,?,1,datetime('now')) ON CONFLICT(path) DO UPDATE SET tag=excluded.tag, version=files.version+1, updated_at=datetime('now')", (path, tag))
        self.db.commit()

    def add_vector(self, vec: list[float], ref: str):
        self.index.add(np.array([vec], dtype="float32")); self.refs.append(ref)

    def search_semantic(self, vec: list[float], k: int = 5):
        if not self.refs: return []
        _, idx = self.index.search(np.array([vec], dtype="float32"), k)
        return [self.refs[i] for i in idx[0] if i >= 0]

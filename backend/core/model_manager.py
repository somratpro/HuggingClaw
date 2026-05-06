import json
from typing import Any
import httpx
from backend.schemas.contracts import AIAction

class ModelManager:
    def __init__(self, base_url: str, api_key: str, model_id: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_id = model_id

    def generate_action(self, prompt: str) -> AIAction:
        if not self.api_key and "localhost" in self.base_url:
            return AIAction(thought="Using local deterministic fallback", action="list_dir", args={"path": "."})
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload: dict[str, Any] = {
            "model": self.model_id,
            "messages": [{"role": "system", "content": "Return JSON with thought, action, args only."}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        }
        with httpx.Client(timeout=20) as client:
            res = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            raw = res.json()["choices"][0]["message"]["content"]
            return AIAction(**json.loads(raw))

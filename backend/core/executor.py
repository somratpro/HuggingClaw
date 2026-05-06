from backend.tools.registry import ToolRegistry
from backend.models.permissions import PermissionLevel
from backend.schemas.contracts import AIAction
from backend.tracking.analytics import Tracker

class Executor:
    def __init__(self, registry: ToolRegistry, tracker: Tracker):
        self.registry = registry
        self.tracker = tracker

    def execute_steps(self, steps: list[AIAction], confirm_dangerous: bool = False) -> list[dict]:
        results = []
        for step in steps:
            tool = self.registry.get(step.action)
            self.tracker.log_action(step.action, tool.permission.value, step.args)
            if tool.permission == PermissionLevel.DANGEROUS and not confirm_dangerous:
                results.append({"success": False, "error": "Confirmation required", "step": step.model_dump()})
                continue
            for attempt in range(3):
                try:
                    out = tool.run(**step.args)
                    results.append({"success": True, "output": out, "attempt": attempt + 1, "step": step.model_dump()})
                    break
                except Exception as e:
                    if attempt == 2:
                        results.append({"success": False, "error": str(e), "step": step.model_dump()})
        return results

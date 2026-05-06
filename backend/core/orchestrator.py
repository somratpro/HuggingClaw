from backend.core.planner import Planner
from backend.core.model_manager import ModelManager
from backend.core.executor import Executor
from backend.schemas.contracts import AIAction
from backend.memory.store import MemoryStore

class Orchestrator:
    def __init__(self, planner: Planner, model: ModelManager, executor: Executor, memory: MemoryStore):
        self.planner = planner
        self.model = model
        self.executor = executor
        self.memory = memory

    def run_goal(self, message: str, session_id: str, confirm_dangerous: bool = False) -> dict:
        planned = self.planner.plan(message)
        model_step = self.model.generate_action(message)
        steps: list[AIAction] = [*planned, model_step]
        results = self.executor.execute_steps(steps, confirm_dangerous=confirm_dangerous)
        self.memory.store_memory(session_id, message)
        return {
            "explanation": "I planned the task, selected a minimal tool action, then executed safely with logging.",
            "plan": [s.model_dump() for s in steps],
            "results": results,
            "memory_hits": self.memory.search_memory(session_id, message),
        }

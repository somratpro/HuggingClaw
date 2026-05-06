from backend.schemas.contracts import AIAction

class Planner:
    def plan(self, goal: str) -> list[AIAction]:
        g = goal.lower()
        if "organize" in g and "download" in g:
            return [
                AIAction(thought="Inspect Downloads directory", action="list_dir", args={"path": "~/Downloads"}),
                AIAction(thought="Search items that can be grouped", action="search_files", args={"query": "Downloads"}),
            ]
        return [
            AIAction(thought=f"Inspect workspace for: {goal}", action="list_dir", args={"path": "."}),
            AIAction(thought="Search relevant files", action="search_files", args={"query": goal.split()[0]}),
        ]

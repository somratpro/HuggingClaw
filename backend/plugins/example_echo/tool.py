from backend.tools.base import Tool

class PluginTool(Tool):
    name = "echo_plugin"
    description = "Echo message for plugin verification"
    def run(self, **kwargs) -> dict:
        return {"echo": kwargs.get("text", "")}

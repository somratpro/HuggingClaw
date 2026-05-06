import importlib.util
from pathlib import Path
from backend.tools.system_tools import FileTool, TerminalTool, AppControlTool, BrowserTool, ClipboardTool, NotificationTool

class _FileOpWrapper:
    def __init__(self, file_tool: FileTool, op: str):
        self.file_tool = file_tool
        self.permission = file_tool.permission
        self.op = op
    def run(self, **kwargs):
        return self.file_tool.run(op=self.op, **kwargs)

class ToolRegistry:
    def __init__(self):
        self.file_tool = FileTool()
        self.tools = {
            "file_tools": self.file_tool,
            "run_command": TerminalTool(),
            "app_control": AppControlTool(),
            "browser": BrowserTool(),
            "clipboard": ClipboardTool(),
            "notify": NotificationTool(),
        }

    def load_plugins(self, plugin_dir: str = "backend/plugins"):
        for p in Path(plugin_dir).glob("*/tool.py"):
            spec = importlib.util.spec_from_file_location(p.stem, p)
            if not spec or not spec.loader:
                continue
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            tool = mod.PluginTool()
            self.tools[tool.name] = tool

    def get(self, name: str):
        if name in {"read_file","write_file","list_dir","move_file","delete_file","search_files"}:
            return _FileOpWrapper(self.file_tool, name)
        if name not in self.tools:
            raise KeyError(f"Tool '{name}' not found")
        return self.tools[name]

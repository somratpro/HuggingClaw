from backend.tools.registry import ToolRegistry

def readiness_check() -> dict:
    required = {"read_file","write_file","list_dir","move_file","delete_file","search_files","run_command","app_control","browser","clipboard","notify"}
    reg = ToolRegistry(); reg.load_plugins()
    available = set(reg.tools.keys()) | {"read_file","write_file","list_dir","move_file","delete_file","search_files"}
    missing = sorted(list(required - available))
    return {"ready": len(missing) == 0, "missing_tools": missing}

from fastapi import APIRouter
from backend.schemas.contracts import ChatRequest, ExecuteRequest, AIAction, MemorySearchRequest, ScheduleRequest, TriggerRequest
from backend.core.planner import Planner
from backend.core.executor import Executor
from backend.core.model_manager import ModelManager
from backend.core.orchestrator import Orchestrator
from backend.core.launch_check import readiness_check
from backend.core.config import settings
from backend.tools.registry import ToolRegistry
from backend.memory.store import MemoryStore
from backend.tracking.analytics import Tracker
from backend.automation.engine import AutomationEngine
from backend.tools.system_tools import TerminalTool

router = APIRouter()
registry = ToolRegistry(); registry.load_plugins()
tracker = Tracker()
planner = Planner()
executor = Executor(registry, tracker)
memory = MemoryStore()
model = ModelManager(base_url=settings.base_url, api_key=settings.api_key, model_id=settings.model_id)
orchestrator = Orchestrator(planner, model, executor, memory)
automation = AutomationEngine(); automation.start()

@router.post('/chat')
def chat(req: ChatRequest):
    return orchestrator.run_goal(req.message, req.session_id, req.confirm_dangerous)

@router.post('/workflow')
def workflow(req: ChatRequest):
    return orchestrator.run_goal(req.message, req.session_id, req.confirm_dangerous)

@router.post('/execute')
def execute(req: ExecuteRequest):
    step = AIAction(thought='Direct execute request', action=req.action, args=req.args)
    return {'result': executor.execute_steps([step], confirm_dangerous=req.confirm_dangerous)}

@router.post('/memory/search')
def memory_search(req: MemorySearchRequest):
    return {'matches': memory.search_memory(req.session_id, req.query)}

@router.get('/analytics')
def analytics():
    return tracker.analytics()

@router.get('/system/snapshot')
def system_snapshot():
    t = TerminalTool()
    cpu = t.run(command="uptime")
    disk = t.run(command="df -h")
    mem = t.run(command="free -h")
    return {'cpu': cpu['stdout'], 'disk': disk['stdout'], 'memory': mem['stdout']}

@router.post('/automation/schedule')
def schedule(req: ScheduleRequest):
    def _job():
        executor.execute_steps([AIAction(thought=f'Scheduled job {req.name}', action=req.action, args=req.args)], confirm_dangerous=True)
    automation.schedule_daily(req.hour, req.minute, _job)
    return {'scheduled': True, 'name': req.name, 'time': f'{req.hour:02d}:{req.minute:02d}'}

@router.post('/automation/trigger')
def trigger(req: TriggerRequest):
    automation.emit_event(req.event)
    return {'triggered': req.event}

@router.get('/tools')
def tools():
    return {'tools': sorted(list(registry.tools.keys())), 'analytics': tracker.analytics()}

@router.get('/launch-check')
def launch_check():
    return readiness_check()

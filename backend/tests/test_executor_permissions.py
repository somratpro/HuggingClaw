from backend.tools.registry import ToolRegistry
from backend.tracking.analytics import Tracker
from backend.core.executor import Executor
from backend.schemas.contracts import AIAction


def test_dangerous_requires_confirmation(tmp_path):
    ex = Executor(ToolRegistry(), Tracker(log_file=str(tmp_path / 'log.jsonl')))
    out = ex.execute_steps([AIAction(thought='t', action='run_command', args={'command':'echo hi'})], confirm_dangerous=False)
    assert out[0]['success'] is False
    assert 'Confirmation required' in out[0]['error']

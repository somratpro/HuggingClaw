from backend.memory.store import MemoryStore
from backend.core.planner import Planner


def test_memory_store_roundtrip(tmp_path):
    store = MemoryStore(file=str(tmp_path / 'mem.json'))
    store.store_memory('s1', 'organize downloads')
    assert store.search_memory('s1', 'organize')


def test_planner_returns_structured_actions():
    steps = Planner().plan('clean desktop')
    assert len(steps) >= 1
    assert all(hasattr(s, 'thought') and hasattr(s, 'action') for s in steps)


def test_planner_handles_organize_downloads():
    steps = Planner().plan('organize my downloads')
    assert steps[0].action == 'list_dir'

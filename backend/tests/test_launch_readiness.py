from backend.core.launch_check import readiness_check


def test_readiness_has_required_shape():
    data = readiness_check()
    assert 'ready' in data
    assert 'missing_tools' in data

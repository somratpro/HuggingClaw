from fastapi import FastAPI
from backend.api.routes import router
from backend.automation.engine import AutomationEngine
from backend.core.launch_check import readiness_check

app = FastAPI(title="DivyaOS API", version="1.0.0")
app.include_router(router)
automation = AutomationEngine()

@app.get('/healthz')
def healthz():
    return {"status": "ok"}

@app.get('/readyz')
def readyz():
    return readiness_check()

@app.on_event("startup")
def startup() -> None:
    automation.start()

@app.on_event("shutdown")
def shutdown() -> None:
    automation.stop()

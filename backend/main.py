from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.api.stream import router as stream_router
from backend.automation.engine import AutomationEngine
from backend.core.launch_check import readiness_check
from backend.core.config import settings
from backend.core.security_middleware import verify_token, enforce_rate_limit

app = FastAPI(title="DivyaOS API", version="1.2.0")
app.include_router(router)
app.include_router(stream_router)
automation = AutomationEngine()

origins = [o.strip() for o in settings.allowed_origins.split(',')] if settings.allowed_origins else ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

@app.middleware('http')
async def security_layer(request: Request, call_next):
    enforce_rate_limit(request)
    verify_token(request)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response

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

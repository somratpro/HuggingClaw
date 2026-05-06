# DivyaOS

DivyaOS is an AI-native operating environment on Linux with chat-first control.

## Completed now
- FastAPI backend with endpoints: chat/workflow/execute/tools/analytics/memory search/system snapshot/health/ready/automation.
- WebSocket action trace endpoint: `ws://localhost:8000/ws/chat`.
- Planner → ModelManager → Executor orchestrated flow.
- Mandatory tool system (file/terminal/app/browser/clipboard/notification).
- DivyaFS + memory + tracking + automation + plugin loading.
- React + Tauri UI shell with Chat, Dashboard, File Explorer, Floating Assistant, OS toggles.
- CI workflow for backend dependency install + tests.
- Docker + Docker Compose launch support.

## Security upgrades
- Header token auth for all non-health requests: `x-divya-token`.
- Request rate limiting per IP.
- CORS origin control via env.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`).

## API
- `GET /healthz`
- `GET /readyz`
- `GET /launch-check`
- `POST /chat`
- `POST /workflow`
- `POST /execute`
- `POST /memory/search`
- `GET /analytics`
- `GET /system/snapshot`
- `POST /automation/schedule`
- `POST /automation/trigger`
- `GET /tools`
- `WS /ws/chat`

## Launch local
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

## Launch with Docker
```bash
cp .env.example .env
docker compose up --build
```

## GUI
```bash
cd gui
npm install
npm run dev
```

## Safety and behavior
- Structured AI action format: `{"thought":"...","action":"tool_name","args":{}}`
- Dangerous operations require `confirm_dangerous=true`.
- Terminal tool blocks high-risk destructive commands.
- All actions logged to `/divya/logs/actions.jsonl`.


## CI Notes
- Linux test workflow runs on Python 3.10 and 3.11.
- Docker image build runs after Linux tests pass.
- Numpy is pinned to `1.26.4` for `faiss-cpu==1.8.0.post1` compatibility.

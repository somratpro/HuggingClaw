from fastapi import APIRouter, WebSocket
import json
import time

router = APIRouter()

@router.websocket('/ws/chat')
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "status", "message": "planning", "ts": time.time()}))
            await websocket.send_text(json.dumps({"type": "echo", "message": text, "ts": time.time()}))
            await websocket.send_text(json.dumps({"type": "status", "message": "completed", "ts": time.time()}))
    except Exception:
        await websocket.close()

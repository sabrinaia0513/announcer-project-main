from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.security import verify_ws_token
from services.websocket import notifier

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/notify/{username}")
async def websocket_notify(websocket: WebSocket, username: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    verified_username = verify_ws_token(token)
    if verified_username != username:
        await websocket.close(code=4003)
        return

    await notifier.connect(websocket, username)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notifier.disconnect(username)

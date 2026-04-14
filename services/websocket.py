from fastapi import WebSocket, WebSocketDisconnect

from core.security import verify_ws_token


class NotificationManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.connections[username] = websocket

    def disconnect(self, username: str):
        if username in self.connections:
            del self.connections[username]

    async def send_personal_message(self, message: str, username: str):
        if username in self.connections:
            await self.connections[username].send_text(message)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)


# 싱글톤 인스턴스
notifier = NotificationManager()
chat_manager = ConnectionManager()

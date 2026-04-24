from fastapi import WebSocket


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


# 싱글톤 인스턴스
notifier = NotificationManager()

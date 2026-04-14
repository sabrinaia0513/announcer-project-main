import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database
from core.config import ALLOWED_ORIGINS
from routers import auth, upload, posts, comments, users, scripts, admin, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_tables()
    db = database.SessionLocal()
    try:
        user = db.query(database.User).filter(database.User.username == "sabrinaia").first()
        if user:
            user.is_admin = True
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 라우터 등록
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(users.router)
app.include_router(scripts.router)
app.include_router(admin.router)
app.include_router(ws.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
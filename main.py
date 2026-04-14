import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database
from core.config import ALLOWED_ORIGINS, API_PREFIX, APP_HOST, APP_PORT, APP_RELOAD, INITIAL_ADMIN_USERNAMES, UPLOAD_DIR
from routers import auth, upload, posts, comments, users, scripts, admin, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_tables()
    db = database.SessionLocal()
    try:
        if INITIAL_ADMIN_USERNAMES:
            admin_users = (
                db.query(database.User)
                .filter(database.User.username.in_(INITIAL_ADMIN_USERNAMES))
                .all()
            )
            for user in admin_users:
                user.is_admin = True
            if admin_users:
                db.commit()
    finally:
        db.close()
    yield

docs_url = f"{API_PREFIX}/docs" if API_PREFIX else "/docs"
redoc_url = f"{API_PREFIX}/redoc" if API_PREFIX else "/redoc"
openapi_url = f"{API_PREFIX}/openapi.json" if API_PREFIX else "/openapi.json"

app = FastAPI(lifespan=lifespan, docs_url=docs_url, redoc_url=redoc_url, openapi_url=openapi_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 라우터 등록
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX)
app.include_router(posts.router, prefix=API_PREFIX)
app.include_router(comments.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(scripts.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(ws.router, prefix=API_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=APP_RELOAD)
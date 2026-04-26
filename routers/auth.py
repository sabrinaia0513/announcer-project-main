from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import database
import auth
from core.config import (
    LOGIN_RATE_LIMIT_MAX_REQUESTS,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    SIGNUP_RATE_LIMIT_MAX_REQUESTS,
    SIGNUP_RATE_LIMIT_WINDOW_SECONDS,
)
from core.deps import get_db
from core.rate_limit import rate_limiter
from core.security import get_user_level
from schemas.schemas import UserCreate

router = APIRouter(tags=["auth"])

signup_rate_limit = rate_limiter.limit(
    scope="signup",
    max_requests=SIGNUP_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=SIGNUP_RATE_LIMIT_WINDOW_SECONDS,
    detail="회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
)

login_rate_limit = rate_limiter.limit(
    scope="login",
    max_requests=LOGIN_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    detail="로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
)


@router.post("/signup")
def signup(
    user_data: UserCreate,
    _: None = Depends(signup_rate_limit),
    db: Session = Depends(get_db),
):
    existing_user = db.query(database.User).filter(database.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    existing_nickname = db.query(database.User).filter(database.User.nickname == user_data.nickname).first()
    if existing_nickname:
        raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
    hashed_pw = auth.get_password_hash(user_data.password)
    new_user = database.User(username=user_data.username, nickname=user_data.nickname, hashed_password=hashed_pw, points=0)
    db.add(new_user)
    db.commit()
    return {"message": "회원가입 완료"}


@router.post("/login")
def login(
    _: None = Depends(login_rate_limit),
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(database.User).filter(database.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "nickname": user.nickname,
        "username": user.username,
        "level": get_user_level(user.points, user.is_admin),
        "points": user.points,
        "is_admin": user.is_admin,
    }

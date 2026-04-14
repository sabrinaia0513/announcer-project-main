from typing import Optional

from fastapi import HTTPException
from jose import JWTError, jwt

import auth
from core.config import ALLOWED_EXTENSIONS


def verify_ws_token(token: str) -> Optional[str]:
    """WebSocket 연결 시 토큰을 검증하고 username을 반환합니다."""
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def get_user_level(points: int) -> str:
    if points < 50:
        return "🌱 씨앗"
    elif points < 150:
        return "🌿 새싹"
    elif points < 300:
        return "🍀 잎새"
    elif points < 500:
        return "🌳 나무"
    else:
        return "👑 열매"


def validate_file_extension(filename: str) -> str:
    """안전한 확장자인지 확인 후 확장자를 반환합니다."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext

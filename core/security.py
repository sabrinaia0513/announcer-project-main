from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from fastapi import HTTPException
from jose import JWTError, jwt

import auth
from core.config import ALLOWED_EXTENSIONS

KST = timezone(timedelta(hours=9), name="KST")


def verify_ws_token(token: str) -> Optional[str]:
    """WebSocket 연결 시 토큰을 검증하고 username을 반환합니다."""
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def get_user_level(points: int, is_admin: bool = False) -> str:
    if is_admin:
        return "관리자"
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


def normalize_external_link(url: Optional[str]) -> Optional[str]:
    if url is None:
        return None

    normalized = url.strip()
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("공고 링크는 http:// 또는 https:// 로 시작하는 올바른 주소여야 합니다.")

    return normalized


def get_safe_external_link(url: Optional[str]) -> Optional[str]:
    try:
        return normalize_external_link(url)
    except ValueError:
        return None


def format_datetime_kst(value: Optional[datetime], fmt: str = "%Y-%m-%d %H:%M") -> Optional[str]:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(KST).strftime(fmt)


def validate_file_extension(filename: str, allowed_extensions: set[str] = ALLOWED_EXTENSIONS) -> str:
    """안전한 확장자인지 확인 후 확장자를 반환합니다."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. 허용: {', '.join(sorted(allowed_extensions))}"
        )
    return ext

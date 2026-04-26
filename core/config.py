import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# ==========================================
# 허용 파일 확장자 화이트리스트
# ==========================================
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov", "mp3", "wav", "ogg"}
SCRIPT_ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS | {"txt", "pdf", "doc", "docx", "hwp", "hwpx"}
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", str(10 * 1024 * 1024)))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(BASE_DIR / "uploads"))


def _parse_csv_env(name: str, default: str) -> list[str]:
	raw_value = os.environ.get(name, default)
	return [item.strip() for item in raw_value.split(",") if item.strip()]


def _parse_positive_int_env(name: str, default: int) -> int:
	value = os.environ.get(name, str(default)).strip()
	try:
		parsed = int(value)
	except ValueError:
		return default
	return parsed if parsed > 0 else default


def _normalize_path_prefix(value: str) -> str:
	value = value.strip()
	if not value or value == "/":
		return ""
	return f"/{value.strip('/')}"

# ==========================================
# CORS 허용 오리진 (프론트엔드 도메인만 허용)
# ==========================================
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://annausung.com",
    "https://www.annausung.com",
    "https://announcer-project-main.vercel.app" # Vercel 주소도 잊지 말고 넣어주세요!
]
INITIAL_ADMIN_USERNAMES = set(_parse_csv_env("INITIAL_ADMIN_USERNAMES", ""))
API_PREFIX = _normalize_path_prefix(os.environ.get("API_PREFIX", ""))

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{(BASE_DIR / 'community.db').as_posix()}")
APP_HOST = os.environ.get("APP_HOST", "0.0.0.0")
APP_PORT = int(os.environ.get("APP_PORT", "8000"))
APP_RELOAD = os.environ.get("APP_RELOAD", "false").lower() == "true"
SIGNUP_RATE_LIMIT_MAX_REQUESTS = _parse_positive_int_env("SIGNUP_RATE_LIMIT_MAX_REQUESTS", 3)
SIGNUP_RATE_LIMIT_WINDOW_SECONDS = _parse_positive_int_env("SIGNUP_RATE_LIMIT_WINDOW_SECONDS", 600)
LOGIN_RATE_LIMIT_MAX_REQUESTS = _parse_positive_int_env("LOGIN_RATE_LIMIT_MAX_REQUESTS", 5)
LOGIN_RATE_LIMIT_WINDOW_SECONDS = _parse_positive_int_env("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 60)
UPLOAD_RATE_LIMIT_MAX_REQUESTS = _parse_positive_int_env("UPLOAD_RATE_LIMIT_MAX_REQUESTS", 10)
UPLOAD_RATE_LIMIT_WINDOW_SECONDS = _parse_positive_int_env("UPLOAD_RATE_LIMIT_WINDOW_SECONDS", 60)

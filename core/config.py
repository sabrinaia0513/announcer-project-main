import os

# ==========================================
# 허용 파일 확장자 화이트리스트
# ==========================================
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov", "mp3", "wav", "ogg"}
MAX_FILE_SIZE = 10 * 1024 * 1024

# ==========================================
# CORS 허용 오리진 (프론트엔드 도메인만 허용)
# ==========================================
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

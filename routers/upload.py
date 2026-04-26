import os
import shutil
import uuid

from fastapi import APIRouter, Depends, UploadFile, File

import database
from core.config import (
    MAX_FILE_SIZE,
    UPLOAD_DIR,
    UPLOAD_RATE_LIMIT_MAX_REQUESTS,
    UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
)
from core.deps import get_current_user
from core.rate_limit import rate_limiter
from core.security import validate_file_extension
from fastapi import HTTPException

router = APIRouter(tags=["upload"])

upload_rate_limit = rate_limiter.limit(
    scope="upload",
    max_requests=UPLOAD_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
    detail="업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
)


@router.post("/upload")
def upload_file(
    _: None = Depends(upload_rate_limit),
    file: UploadFile = File(...),
    current_user: database.User = Depends(get_current_user),
):
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="첨부파일은 10MB를 초과할 수 없습니다.")

    ext = validate_file_extension(file.filename)
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_url": f"/uploads/{filename}"}

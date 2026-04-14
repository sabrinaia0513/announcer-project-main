import os
import shutil
import uuid

from fastapi import APIRouter, Depends, UploadFile, File

import database
from core.deps import get_current_user
from core.config import MAX_FILE_SIZE, UPLOAD_DIR
from core.security import validate_file_extension
from fastapi import HTTPException

router = APIRouter(tags=["upload"])


@router.post("/upload")
def upload_file(file: UploadFile = File(...), current_user: database.User = Depends(get_current_user)):
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

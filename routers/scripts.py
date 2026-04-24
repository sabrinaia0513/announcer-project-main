import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

import database
from core.deps import get_db, get_current_user
from core.config import MAX_FILE_SIZE, SCRIPT_ALLOWED_EXTENSIONS, UPLOAD_DIR
from core.security import format_datetime_kst, validate_file_extension

router = APIRouter(tags=["scripts"])


@router.get("/scripts")
def get_scripts(db: Session = Depends(get_db)):
    scripts = db.query(database.Script).order_by(database.Script.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "content": s.content,
            "file_url": s.file_url,
            "created_at": format_datetime_kst(s.created_at),
        }
        for s in scripts
    ]


@router.post("/scripts")
def create_script(
    title: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 대본을 업로드할 수 있습니다.")

    file_url = None
    if file:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="대본 첨부파일은 10MB를 초과할 수 없습니다.")

        ext = validate_file_extension(file.filename, SCRIPT_ALLOWED_EXTENSIONS)
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/uploads/{unique_filename}"

    new_script = database.Script(title=title, content=content, file_url=file_url)
    db.add(new_script)
    db.commit()
    return {"message": "대본이 성공적으로 업로드되었습니다!"}

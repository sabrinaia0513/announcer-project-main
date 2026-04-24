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


def remove_script_file(file_url: str | None):
    if not file_url:
        return

    filename = file_url.replace("/uploads/", "", 1)
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)


def save_script_file(file: UploadFile | None):
    if not file:
        return None

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

    return f"/uploads/{unique_filename}"


@router.get("/scripts")
def get_scripts(
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    file_url = save_script_file(file)

    new_script = database.Script(title=title, content=content, file_url=file_url)
    db.add(new_script)
    db.commit()
    return {"message": "대본이 성공적으로 업로드되었습니다!"}


@router.put("/scripts/{script_id}")
def update_script(
    script_id: int,
    title: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 대본을 수정할 수 있습니다.")

    script = db.query(database.Script).filter(database.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다.")

    script.title = title
    script.content = content

    if file:
        remove_script_file(script.file_url)
        script.file_url = save_script_file(file)

    db.commit()
    return {"message": "대본이 수정되었습니다."}


@router.delete("/scripts/{script_id}")
def delete_script(
    script_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 대본을 삭제할 수 있습니다.")

    script = db.query(database.Script).filter(database.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다.")

    remove_script_file(script.file_url)
    db.delete(script)
    db.commit()
    return {"message": "대본이 삭제되었습니다."}

import os
import shutil
import uuid
from urllib.parse import quote
from zipfile import BadZipFile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from docx import Document
from sqlalchemy.orm import Session

import database
from core.deps import get_db, get_current_user
from core.config import MAX_FILE_SIZE, SCRIPT_ALLOWED_EXTENSIONS, UPLOAD_DIR
from core.security import format_datetime_kst, validate_file_extension

router = APIRouter(tags=["scripts"])


def build_download_headers(filename: str):
    quoted_filename = quote(filename)
    return {
        "Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"
    }


def get_script_file_path(file_url: str | None):
    if not file_url:
        return None

    filename = file_url.replace("/uploads/", "", 1)
    return os.path.join(UPLOAD_DIR, filename)


def extract_prompt_content_from_file(file_url: str | None):
    file_path = get_script_file_path(file_url)
    if not file_path or not os.path.exists(file_path):
        return None

    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".docx":
            document = Document(file_path)
            paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
            return "\n".join(paragraphs) or None

        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as text_file:
                content = text_file.read().strip()
            return content or None
    except (BadZipFile, UnicodeDecodeError, ValueError) as error:
        print(f"대본 첨부파일 텍스트 추출 실패: {error}")

    return None


def resolve_prompt_content(content: str | None, file_url: str | None):
    extracted_content = extract_prompt_content_from_file(file_url)
    manual_content = (content or "").strip()

    return {
        "prompt_content": extracted_content or manual_content,
        "prompt_source": "file" if extracted_content else "content",
    }


def build_script_payload(script: database.Script, include_download_count: bool = False):
    prompt_payload = resolve_prompt_content(script.content, script.file_url)
    payload = {
        "id": script.id,
        "title": script.title,
        "content": script.content,
        "file_url": script.file_url,
        "created_at": format_datetime_kst(script.created_at),
        **prompt_payload,
    }
    if include_download_count:
        payload["download_count"] = script.download_count or 0
    return payload


def remove_script_file(file_url: str | None):
    if not file_url:
        return

    file_path = get_script_file_path(file_url)
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
    return [build_script_payload(s, include_download_count=current_user.is_admin) for s in scripts]


@router.get("/scripts/{script_id}/download")
def download_script(
    script_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    script = db.query(database.Script).filter(database.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다.")

    safe_title = "".join("_" if char in '/\\?%*:|\"<>' else char for char in script.title).strip() or "script"

    if script.file_url:
        file_path = get_script_file_path(script.file_url)
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="첨부 파일을 찾을 수 없습니다.")

        script.download_count = (script.download_count or 0) + 1
        db.commit()

        ext = os.path.splitext(file_path)[1] or ".bin"
        filename = f"[대본]_{safe_title}{ext}"
        return FileResponse(
            file_path,
            media_type="application/octet-stream",
            headers=build_download_headers(filename),
        )

    script.download_count = (script.download_count or 0) + 1
    db.commit()

    text_content = f"제목: {script.title}\n\n{script.content}"
    filename = f"[대본]_{safe_title}.txt"
    return Response(
        content=text_content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers=build_download_headers(filename),
    )


@router.post("/scripts")
def create_script(
    title: str = Form(...),
    content: str = Form(""),
    file: UploadFile = File(None),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 대본을 업로드할 수 있습니다.")

    file_url = save_script_file(file)
    prompt_payload = resolve_prompt_content(content, file_url)
    manual_content = content.strip()

    if not title.strip():
        raise HTTPException(status_code=400, detail="대본 제목을 입력해주세요.")

    if not prompt_payload["prompt_content"]:
        raise HTTPException(status_code=400, detail="대본 본문을 입력하거나 텍스트를 읽을 수 있는 docx/txt 파일을 첨부해주세요.")

    new_script = database.Script(title=title.strip(), content=manual_content, file_url=file_url)
    db.add(new_script)
    db.commit()
    return {"message": "대본이 성공적으로 업로드되었습니다!"}


@router.put("/scripts/{script_id}")
def update_script(
    script_id: int,
    title: str = Form(...),
    content: str = Form(""),
    file: UploadFile = File(None),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 대본을 수정할 수 있습니다.")

    script = db.query(database.Script).filter(database.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다.")

    next_title = title.strip()
    next_content = content.strip()

    if not next_title:
        raise HTTPException(status_code=400, detail="대본 제목을 입력해주세요.")

    if file:
        remove_script_file(script.file_url)
        script.file_url = save_script_file(file)

    prompt_payload = resolve_prompt_content(next_content, script.file_url)
    if not prompt_payload["prompt_content"]:
        raise HTTPException(status_code=400, detail="대본 본문을 입력하거나 텍스트를 읽을 수 있는 docx/txt 파일을 첨부해주세요.")

    script.title = next_title
    script.content = next_content

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

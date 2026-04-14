from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

import database
from core.deps import get_db, get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/promote")
def promote_user(
    target_username: str = Form(...),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다. 관리자만 이용 가능합니다.")

    target = db.query(database.User).filter(database.User.username == target_username).first()
    if not target:
        raise HTTPException(status_code=404, detail="해당 아이디를 가진 유저를 찾을 수 없습니다.")

    if target.is_admin:
        raise HTTPException(status_code=400, detail="이미 관리자인 유저입니다.")

    target.is_admin = True
    db.commit()
    return {"message": f"🎉 성공! [{target.nickname}]님을 새로운 관리자로 임명했습니다."}

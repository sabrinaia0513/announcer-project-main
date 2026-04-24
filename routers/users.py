from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

import database
import auth
from core.deps import get_db, get_current_user
from core.security import format_datetime_kst, get_user_level
from schemas.schemas import UserUpdateInfo

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/activity")
def get_user_activity(
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    my_posts = [
        {"글번호": p.id, "제목": p.title, "작성시간": format_datetime_kst(p.created_at)}
        for p in current_user.posts
    ]
    my_comments = [
        {"댓글번호": c.id, "내용": c.content, "원문번호": c.post_id, "작성시간": format_datetime_kst(c.created_at)}
        for c in current_user.comments
    ]
    liked_post_records = (
        db.query(database.PostLike)
        .filter(database.PostLike.user_id == current_user.id)
        .options(joinedload(database.PostLike.post).joinedload(database.Post.author))
        .all()
    )
    liked_posts = [
        {"글번호": rec.post.id, "제목": rec.post.title, "작성자": rec.post.author.nickname}
        for rec in liked_post_records
    ]
    return {
        "nickname": current_user.nickname,
        "points": current_user.points,
        "level": get_user_level(current_user.points, current_user.is_admin),
        "my_posts": my_posts[::-1],
        "my_comments": my_comments[::-1],
        "liked_posts": liked_posts[::-1],
    }


@router.put("/me")
def update_user_info(
    update_data: UserUpdateInfo,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if update_data.new_nickname:
        existing_nickname = (
            db.query(database.User)
            .filter(database.User.nickname == update_data.new_nickname, database.User.id != current_user.id)
            .first()
        )
        if existing_nickname:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        current_user.nickname = update_data.new_nickname
    if update_data.new_password:
        current_user.hashed_password = auth.get_password_hash(update_data.new_password)
    db.commit()
    return {"message": "수정 완료", "new_nickname": current_user.nickname}

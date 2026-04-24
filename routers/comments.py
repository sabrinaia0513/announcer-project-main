import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, subqueryload

import database
from core.deps import get_db, get_current_user
from core.security import format_datetime_kst, get_user_level
from schemas.schemas import CommentCreate, CommentUpdate
from services.websocket import notifier

router = APIRouter(tags=["comments"])


@router.post("/comments")
async def create_comment(
    comment_data: CommentCreate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if comment_data.parent_id:
        parent = (
            db.query(database.Comment)
            .filter(
                database.Comment.id == comment_data.parent_id,
                database.Comment.post_id == comment_data.post_id,
            )
            .first()
        )
        if not parent:
            raise HTTPException(status_code=400, detail="유효하지 않은 부모 댓글입니다.")

    new_comment = database.Comment(
        content=comment_data.content,
        user_id=current_user.id,
        post_id=comment_data.post_id,
        parent_id=comment_data.parent_id,
    )
    db.add(new_comment)
    current_user.points += 5
    db.commit()

    post = db.query(database.Post).filter(database.Post.id == comment_data.post_id).first()
    if post and post.author.username != current_user.username:
        msg = json.dumps({"text": f"💬 {current_user.nickname}님이 회원님의 글에 댓글을 남겼습니다."})
        await notifier.send_personal_message(msg, post.author.username)
    return {"message": "등록 완료"}


@router.get("/posts/{post_id}/comments")
def get_comments(post_id: int, sort_by: str = "latest", db: Session = Depends(get_db)):
    comments_query = (
        db.query(database.Comment)
        .filter(database.Comment.post_id == post_id)
        .options(
            joinedload(database.Comment.author),
            subqueryload(database.Comment.likes).joinedload(database.CommentLike.user),
        )
    )

    if sort_by == "popular":
        comments = comments_query.all()
        comments.sort(key=lambda x: len(x.likes), reverse=True)
    else:
        comments = comments_query.order_by(database.Comment.id.asc()).all()

    result = []
    for c in comments:
        result.append(
            {
                "댓글번호": c.id,
                "내용": c.content,
                "작성자": c.author.nickname,
                "작성자등급": get_user_level(c.author.points, c.author.is_admin),
                "작성시간": format_datetime_kst(c.created_at),
                "좋아요수": len(c.likes),
                "좋아요누른사람들": [like.user.nickname for like in c.likes],
                "부모댓글번호": c.parent_id,
            }
        )
    return result


@router.put("/comments/{comment_id}")
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404)
    if comment.author.username != current_user.username:
        raise HTTPException(status_code=403)
    comment.content = comment_data.content
    db.commit()
    return {"message": "수정 완료"}


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404)

    if comment.author.username != current_user.username and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    comment.author.points = max(0, comment.author.points - 5)
    db.delete(comment)
    db.commit()
    return {"message": "삭제 완료"}


@router.post("/comments/{comment_id}/like")
async def toggle_comment_like(
    comment_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404)
    existing = (
        db.query(database.CommentLike)
        .filter(database.CommentLike.comment_id == comment_id, database.CommentLike.user_id == current_user.id)
        .first()
    )
    if existing:
        comment.author.points = max(0, comment.author.points - 2)
        db.delete(existing)
        db.commit()
        return {"message": "좋아요 취소"}
    else:
        db.add(database.CommentLike(user_id=current_user.id, comment_id=comment_id))
        if comment.author.username != current_user.username:
            comment.author.points += 2
            msg = json.dumps({"text": f"👍 {current_user.nickname}님이 회원님의 댓글을 좋아합니다. (+2점)"})
            await notifier.send_personal_message(msg, comment.author.username)
        db.commit()
        return {"message": "좋아요 완료"}

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, subqueryload

import database
from core.deps import get_db, get_current_user
from core.security import get_user_level
from schemas.schemas import PostCreate, PostUpdate
from services.websocket import notifier

router = APIRouter(tags=["posts"])


@router.post("/posts")
def create_post(
    post_data: PostCreate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_post = database.Post(
        title=post_data.title,
        content=post_data.content,
        category=post_data.category,
        file_url=post_data.file_url,
        deadline=post_data.deadline,
        external_link=post_data.external_link,
        user_id=current_user.id,
    )
    db.add(new_post)
    current_user.points += 10
    db.commit()
    return {"message": "등록 완료"}


@router.get("/announcements")
def get_announcements(db: Session = Depends(get_db)):
    announcements = (
        db.query(database.Post)
        .filter(database.Post.category == "공고", database.Post.deadline.isnot(None))
        .options(joinedload(database.Post.author))
        .order_by(database.Post.deadline.asc())
        .all()
    )
    return [
        {"글번호": post.id, "제목": post.title, "마감일": str(post.deadline), "링크": post.external_link}
        for post in announcements
    ]


@router.get("/posts")
def get_posts(
    skip: int = 0,
    limit: int = Query(default=5, le=50),
    search: Optional[str] = None,
    category: Optional[str] = "전체",
    sort_by: Optional[str] = "latest",
    db: Session = Depends(get_db),
):
    query = db.query(database.Post)

    if category and category != "전체":
        query = query.filter(database.Post.category == category)
    if search:
        search_formatted = f"%{search}%"
        query = query.filter(
            database.Post.title.like(search_formatted) | database.Post.content.like(search_formatted)
        )

    total_count = query.count()

    if sort_by == "popular":
        paged_posts = (
            query.order_by(database.Post.like_count.desc(), database.Post.id.desc())
            .options(joinedload(database.Post.author), subqueryload(database.Post.likes).joinedload(database.PostLike.user))
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        paged_posts = (
            query.order_by(database.Post.id.desc())
            .options(joinedload(database.Post.author), subqueryload(database.Post.likes).joinedload(database.PostLike.user))
            .offset(skip)
            .limit(limit)
            .all()
        )

    result = []
    for post in paged_posts:
        result.append(
            {
                "글번호": post.id,
                "제목": post.title,
                "내용": post.content,
                "카테고리": post.category or "자유",
                "file_url": post.file_url,
                "deadline": str(post.deadline) if post.deadline else None,
                "external_link": post.external_link,
                "작성자": post.author.nickname,
                "작성자등급": get_user_level(post.author.points),
                "작성시간": post.created_at.strftime("%Y-%m-%d %H:%M"),
                "좋아요수": len(post.likes),
                "좋아요누른사람들": [like.user.nickname for like in post.likes],
            }
        )
    return {"total_count": total_count, "posts": result}


@router.get("/posts/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(database.Post)
        .options(joinedload(database.Post.author), subqueryload(database.Post.likes).joinedload(database.PostLike.user))
        .filter(database.Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    return {
        "글번호": post.id,
        "제목": post.title,
        "내용": post.content,
        "카테고리": post.category or "자유",
        "file_url": post.file_url,
        "deadline": str(post.deadline) if post.deadline else None,
        "external_link": post.external_link,
        "작성자": post.author.nickname,
        "작성자등급": get_user_level(post.author.points),
        "작성시간": post.created_at.strftime("%Y-%m-%d %H:%M"),
        "좋아요수": len(post.likes),
        "좋아요누른사람들": [like.user.nickname for like in post.likes],
    }


@router.put("/posts/{post_id}")
def update_post(
    post_id: int,
    post_data: PostUpdate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if post.author.username != current_user.username:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    post.title = post_data.title
    post.content = post_data.content
    post.category = post_data.category
    post.file_url = post_data.file_url
    post.deadline = post_data.deadline
    post.external_link = post_data.external_link
    db.commit()
    return {"message": "수정 완료"}


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if post.author.username != current_user.username and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    post.author.points = max(0, post.author.points - 10)
    db.delete(post)
    db.commit()
    return {"message": "삭제 완료"}


@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: int,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404)

    existing_like = (
        db.query(database.PostLike)
        .filter(database.PostLike.post_id == post_id, database.PostLike.user_id == current_user.id)
        .first()
    )

    if existing_like:
        post.author.points = max(0, post.author.points - 3)
        db.delete(existing_like)
        post.like_count = max(0, (post.like_count or 0) - 1)
        db.commit()
        return {"message": "좋아요 취소"}
    else:
        db.add(database.PostLike(user_id=current_user.id, post_id=post_id))
        post.like_count = (post.like_count or 0) + 1
        if post.author.username != current_user.username:
            post.author.points += 3
            msg = json.dumps({"text": f"❤️ {current_user.nickname}님이 회원님의 [{post.title}] 글을 좋아합니다. (+3점)"})
            await notifier.send_personal_message(msg, post.author.username)
        db.commit()
        return {"message": "좋아요 완료"}

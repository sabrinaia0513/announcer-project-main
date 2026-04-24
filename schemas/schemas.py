from typing import Optional
from datetime import date

from pydantic import BaseModel, validator

from core.security import normalize_external_link


class UserCreate(BaseModel):
    username: str
    nickname: str
    password: str


class UserUpdateInfo(BaseModel):
    new_nickname: Optional[str] = None
    new_password: Optional[str] = None


class PostCreate(BaseModel):
    title: str
    content: str
    category: str
    file_url: Optional[str] = None
    deadline: Optional[date] = None
    external_link: Optional[str] = None

    @validator("external_link", pre=True, always=True)
    def validate_external_link(cls, value, values):
        normalized_link = normalize_external_link(value)
        if values.get("category") == "공고" and not normalized_link:
            raise ValueError("공고 게시글에는 공식 링크가 필요합니다.")
        return normalized_link


class PostUpdate(BaseModel):
    title: str
    content: str
    category: str
    file_url: Optional[str] = None
    deadline: Optional[date] = None
    external_link: Optional[str] = None

    @validator("external_link", pre=True, always=True)
    def validate_external_link(cls, value, values):
        normalized_link = normalize_external_link(value)
        if values.get("category") == "공고" and not normalized_link:
            raise ValueError("공고 게시글에는 공식 링크가 필요합니다.")
        return normalized_link


class CommentCreate(BaseModel):
    post_id: int
    content: str
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str

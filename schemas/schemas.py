from typing import Optional
from datetime import date

from pydantic import BaseModel


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


class PostUpdate(BaseModel):
    title: str
    content: str
    category: str
    file_url: Optional[str] = None
    deadline: Optional[date] = None
    external_link: Optional[str] = None


class CommentCreate(BaseModel):
    post_id: int
    content: str
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str

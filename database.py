from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date, UniqueConstraint, inspect, text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    nickname = Column(String)
    hashed_password = Column(String)
    points = Column(Integer, default=0)
    is_admin = Column(Boolean, default=False) 
    
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")

class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='uq_post_like'),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), index=True)
    user = relationship("User")
    post = relationship("Post", back_populates="likes")

class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint('user_id', 'comment_id', name='uq_comment_like'),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), index=True)
    user = relationship("User")
    comment = relationship("Comment", back_populates="likes")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String, default="자유", index=True)
    file_url = Column(String, nullable=True)
    like_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    deadline = Column(Date, nullable=True)  
    external_link = Column(String, nullable=True) 

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), index=True)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True, index=True)

    author = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")

class Script(Base):
    __tablename__ = "scripts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)       
    content = Column(Text)                   
    file_url = Column(String, nullable=True) 
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)) 

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_post_view_count_column():
    inspector = inspect(engine)
    if "posts" not in inspector.get_table_names():
        return

    post_columns = {column["name"] for column in inspector.get_columns("posts")}
    if "view_count" in post_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0"))

def create_tables():
    Base.metadata.create_all(bind=engine)
    ensure_post_view_count_column()
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey,func,DateTime,text
from sqlalchemy.orm import relationship,mapped_column,Mapped
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.lib.db import Base
from app.models.types import StringUUID
import enum


class UserStatusEnum(enum.StrEnum):
    PENDING = "pending"
    UNINITIALIZED = "uninitialized"
    ACTIVE = "active"
    BANNED = "banned"
    CLOSED = "closed"

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(StringUUID,primary_key=True, default=uuid.uuid4)
    name = Column(String(255), index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password = Column(String(255), nullable=True)
    # status = Column(Boolean, default=True)


    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")

    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id: Mapped[str] = mapped_column(StringUUID,primary_key=True, default=uuid.uuid4)
    user_id = Column(StringUUID, ForeignKey("users.id"))
    provider = Column(String(50), index=True)
    provider_user_id = Column(String(255), unique=True, index=True)
    access_token = Column(String(255), nullable=True)
    refresh_token = Column(String(255), nullable=True)
    expires_at = Column(Integer, nullable=True)

    user = relationship("User", back_populates="oauth_accounts")

    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
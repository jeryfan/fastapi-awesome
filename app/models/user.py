from sqlalchemy import Column, Integer, String, Boolean, ForeignKey,func,DateTime,text,Enum
from sqlalchemy.orm import relationship,mapped_column,Mapped
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.models.db import Base
from app.models.types import StringUUID
from app.models.base import TimestampMixin
import enum


class UserStatus(enum.StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"

class User(TimestampMixin,Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(StringUUID,primary_key=True, default=uuid.uuid4)
    name:Mapped[str] = mapped_column(String(255), index=True, nullable=True)
    email:Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password:Mapped[str] = mapped_column(String(255), nullable=True)
    status:Mapped[UserStatus] = mapped_column(Enum(UserStatus), nullable=False, index=True, default=UserStatus.ACTIVE)

    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

class OAuthAccount(TimestampMixin,Base):
    __tablename__ = "oauth_accounts"

    id: Mapped[str] = mapped_column(StringUUID,primary_key=True, default=uuid.uuid4)
    user_id: Mapped[StringUUID] = mapped_column(StringUUID, ForeignKey("users.id"))
    provider:Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    provider_user_id:Mapped[str] = mapped_column(String(255),unique=True, index=True, nullable=False)
    access_token:Mapped[str] = mapped_column(String(255), nullable=True)
    refresh_token:Mapped[str] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    user:Mapped[User] = relationship("User", back_populates="oauth_accounts")

    
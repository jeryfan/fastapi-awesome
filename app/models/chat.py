from app.models.db import Base
from app.models.base import TimestampMixin
import uuid
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import String, Text, Enum
from .types import StringUUID
import enum


class RoleType(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(TimestampMixin, Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        StringUUID, primary_key=True, default=uuid.uuid4, index=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_by: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)


class Message(TimestampMixin, Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        StringUUID, primary_key=True, default=uuid.uuid4, index=True
    )
    conversation_id: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)
    role: Mapped[RoleType] = mapped_column(Enum(RoleType), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)

from app.models.db import Base
from app.models.base import TimestampMixin
import uuid
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import ForeignKey, String, Text, Enum, JSON, Integer
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

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(TimestampMixin, Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        StringUUID, primary_key=True, default=uuid.uuid4, index=True
    )
    conversation_id: Mapped[str] = mapped_column(
        StringUUID, ForeignKey("conversations.id"), nullable=False, index=True
    )
    role: Mapped[RoleType] = mapped_column(Enum(RoleType), nullable=False, index=True)
    content: Mapped[dict | list | str] = mapped_column(JSON, nullable=False)
    created_by: Mapped[str] = mapped_column(StringUUID, nullable=False, index=True)

    model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    finish_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)

    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )

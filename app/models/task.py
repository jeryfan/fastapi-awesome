from app.models.db import Base
from app.models.base import TimestampMixin
import enum
from sqlalchemy import Enum, text, Column, String, Text
from sqlalchemy.orm import mapped_column, Mapped
from .types import StringUUID


class TaskStatus(str, enum.Enum):
    PENDING = "pedding"
    PROGRESS = "progress"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        StringUUID, primary_key=True, server_default=text("uuid_generate_v4()")
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), nullable=False, index=True, default=TaskStatus.PENDING
    )
    error: Mapped[str] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = Column(StringUUID, nullable=False)

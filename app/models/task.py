
from app.models.db import Base
from app.models.base import TimestampMixin
import enum
from sqlalchemy import Enum,text

class TaskStatus(str, enum.Enum):
    PENDING = "pedding"
    PROGRESS = "progress"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task(TimestampMixin,Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(StringUUID,primary_key=True, default=uuid.uuid4)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, index=True, default=TaskStatus.PENDING)
    error: Mapped[str] = mapped_column(text, nullable=True)
    user_id: int = Column(Integer, ForeignKey("users.id"))



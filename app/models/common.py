from sqlalchemy import (
    Column,
    Integer,
    String,
    text,
    TEXT,
)
from sqlalchemy.orm import mapped_column, Mapped
from datetime import datetime
from app.models.db import Base
from .types import StringUUID
from app.models.base import TimestampMixin
import uuid


class UploadFile(TimestampMixin, Base):
    __tablename__ = "upload_files"

    id: Mapped[str] = mapped_column(
        StringUUID, primary_key=True, index=True, default=uuid.uuid4
    )
    storage_type: Mapped[str] = Column(String(255), nullable=False)
    key: Mapped[str] = Column(String(255), nullable=False)
    name: Mapped[str] = Column(String(255), nullable=False)
    size: Mapped[int] = Column(Integer, nullable=False)
    extension: Mapped[str] = Column(String(255), nullable=False, index=True)
    mime_type: Mapped[str] = Column(String(255), nullable=True, index=True)

    created_by: Mapped[str] = Column(StringUUID, nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(TEXT, default="")

    def __init__(
        self,
        *,
        storage_type: str,
        key: str,
        name: str,
        size: int,
        extension: str,
        mime_type: str,
        created_by: str,
        created_at: datetime,
        source_url: str = "",
    ):
        self.storage_type = storage_type
        self.key = key
        self.name = name
        self.size = size
        self.extension = extension
        self.mime_type = mime_type
        self.created_by = created_by
        self.created_at = created_at
        self.source_url = source_url

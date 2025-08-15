from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class UploadFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    storage_type: str
    key: str
    name: str
    size: int
    extension: str
    mime_type: Optional[str]
    created_by: UUID
    source_url: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    file_url: Optional[str] = None

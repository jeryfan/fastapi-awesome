from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List

from app.models.task import TaskStatus


class TaskCreate(BaseModel):

    file_id: str = Field(...)

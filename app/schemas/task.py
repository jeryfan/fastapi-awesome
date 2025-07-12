from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

from app.models.task import TaskStatus


class TaskCreate(BaseModel):

    file_id: str = Field(...)


class TaskListIn(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    size: int = Field(10, ge=1, le=100, description="每页数量")
    status: Optional[TaskStatus] = Field(None, description="任务状态")
    name: Optional[str] = Field(None, description="任务名称")


class TaskListOut(BaseModel):

    id: str = Field(..., description="任务ID")
    name: str = Field(default="", description="任务名称")
    task_id: str = Field(..., description="任务ID")
    file_id: str = Field(..., description="文件ID")
    status: TaskStatus = Field(..., description="任务状态")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = ConfigDict(from_attributes=True)

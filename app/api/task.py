from fastapi import APIRouter, Depends, HTTPException
from app import crud
from app.api.auth import get_current_user
from app.models.db import get_db
from app.models.task import TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate
from app.tasks.task import task_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/task", tags=["task"])


@router.post("/")
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):

    task_id = task_create.delay(task.file_id)
    t = await crud.task.insert(
        db,
        {
            "task_id": task_id,
            "file_id": task.file_id,
            "status": TaskStatus.PENDING,
            "created_by": user.id,
        },
    )
    return t.id

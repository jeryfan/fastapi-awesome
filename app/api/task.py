from fastapi import APIRouter, Depends, HTTPException
import pydantic
from app import crud
from app.api.auth import get_current_user
from app.models.db import get_db
from app.models.task import TaskStatus
from app.models.user import User
from app.schemas.response import ApiResponse
from app.schemas.task import TaskCreate, TaskListIn, TaskListOut
from app.tasks.task import task_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/task", tags=["task"])


@router.post("")
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):

    result = task_create.delay(task.file_id)
    t = await crud.task.insert(
        db,
        obj_in={
            "task_id": result.id,
            "file_id": task.file_id,
            "status": TaskStatus.PENDING,
            "created_by": user.id,
        },
    )
    return ApiResponse(data=t.task_id, code=200, msg="success")


@router.get("")
async def list_task(
    list_in: TaskListIn = Depends(), db: AsyncSession = Depends(get_db)
):

    skip = (list_in.page - 1) * list_in.size

    filters = {}
    if list_in.status:
        filters["status"] = list_in.status
    if list_in.name:
        filters["name__like"] = list_in.name

    data = await crud.task.query(
        db,
        skip=skip,
        limit=list_in.size,
        filters=filters,
        return_total=True,
        order_by="-id",
    )
    data["page"] = list_in.page
    data["size"] = list_in.size
    data["list"] = pydantic.TypeAdapter(list[TaskListOut]).validate_python(data["list"])
    return ApiResponse(data=data, code=200, msg="success")

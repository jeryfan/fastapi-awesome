from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.task import Task
from app.models.user import User, OAuthAccount
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from uuid import UUID
from typing import Optional


class CRUDTask(CRUDBase[Task]):
    pass


task_crud: CRUDTask = CRUDTask(Task)

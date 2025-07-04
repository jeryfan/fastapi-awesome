from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.common import UploadFile

from uuid import UUID
from typing import Optional


class CRUDUploadFile(CRUDBase[UploadFile]):
    pass


file_crud = CRUDUploadFile(UploadFile)

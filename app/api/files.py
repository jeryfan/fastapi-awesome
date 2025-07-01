import traceback
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.auth import get_current_user
from app.models.db import get_db
from app.models.user import User
from app.schemas.response import ApiResponse
from app.services.file_service import FileService
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/files")


@router.post("/upload")
async def upload_file(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    source_url: Optional[str] = "",
):
    try:
        content = (await file.read(),)
        file = FileService.upload_file(
            filename=file.filename,
            content=content,
            mimetype=file.content_type,
            user=current_user,
            source_url=source_url,
        )
        return ApiResponse(data=file, code=status.HTTP_200_OK)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

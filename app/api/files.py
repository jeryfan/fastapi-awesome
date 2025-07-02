import traceback
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status, Form
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.models.db import get_db
from app.models.user import User
from app.schemas.response import ApiResponse
from app.services.file_service import FileService
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/files")


class UploadStartRequest(BaseModel):
    filename: str
    total_chunks: int


class UploadCompleteRequest(BaseModel):
    upload_id: str
    filename: str


@router.post("/upload")
async def upload_file(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    source_url: Optional[str] = "",
):
    try:
        content = await file.read()
        file_service = FileService(db)
        file = await file_service.upload_file(
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


@router.post("/upload/start")
async def upload_start(
    request: UploadStartRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        file_service = FileService(db)
        upload_id = await file_service.start_chunked_upload(
            filename=request.filename, user=current_user
        )
        return ApiResponse(data={"upload_id": upload_id}, code=status.HTTP_200_OK)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/chunk")
async def upload_chunk(
    chunk: UploadFile,
    upload_id: Annotated[str, Form()],
    chunk_number: Annotated[int, Form()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        content = await chunk.read()
        file_service = FileService(db)
        await file_service.upload_chunk(
            upload_id=upload_id,
            chunk_number=chunk_number,
            content=content,
            user=current_user,
        )
        return ApiResponse(data=None, code=status.HTTP_200_OK)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/complete")
async def upload_complete(
    request: UploadCompleteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        file_service = FileService(db)
        file = await file_service.complete_chunked_upload(
            upload_id=request.upload_id,
            filename=request.filename,
            user=current_user,
        )
        return ApiResponse(data=file, code=status.HTTP_200_OK)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

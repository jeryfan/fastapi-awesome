import datetime
import hashlib
import os
import uuid
from typing import Any, Literal, Union
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.constants import (
    AUDIO_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
)
from app.models import UploadFile

from app.core.storage import storage
from app.config import settings

PREVIEW_WORDS_LIMIT = 3000


class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.chunk_dir = "/tmp/chunks"
        os.makedirs(self.chunk_dir, exist_ok=True)

    async def upload_file(
        self,
        *,
        filename: str,
        content: bytes,
        mimetype: str,
        user: Union[User, Any],
        source_url: str = "",
    ) -> UploadFile:
        # get file extension
        extension = os.path.splitext(filename)[1].lstrip(".").lower()

        # check if filename contains invalid characters
        if any(c in filename for c in ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]):
            raise ValueError("Filename contains invalid characters")

        if len(filename) > 200:
            filename = filename.split(".")[0][:200] + "." + extension

        # get file size
        file_size = len(content)

        # generate file key
        file_uuid = str(uuid.uuid4())

        file_key = "upload_files/" + str(user.id) + "/" + file_uuid + "." + extension

        # save file to storage
        storage.save(file_key, content)

        # save file to db
        upload_file = UploadFile(
            storage_type=settings.STORAGE_TYPE,
            key=file_key,
            name=filename,
            size=file_size,
            extension=extension,
            mime_type=mimetype,
            created_by=user.id,
            created_at=datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
            source_url=source_url,
        )

        self.db.add(upload_file)
        await self.db.commit()
        await self.db.refresh(upload_file)

        return upload_file

    async def start_chunked_upload(self, *, filename: str, user: Union[User, Any]) -> str:
        upload_id = str(uuid.uuid4())
        upload_dir = os.path.join(self.chunk_dir, upload_id)
        os.makedirs(upload_dir, exist_ok=True)
        return upload_id

    async def upload_chunk(
        self, *, upload_id: str, chunk_number: int, content: bytes, user: Union[User, Any]
    ):
        upload_dir = os.path.join(self.chunk_dir, upload_id)
        if not os.path.isdir(upload_dir):
            raise HTTPException(status_code=404, detail="Upload not found")

        chunk_path = os.path.join(upload_dir, str(chunk_number))
        with open(chunk_path, "wb") as f:
            f.write(content)

    async def complete_chunked_upload(
        self, *, upload_id: str, filename: str, user: Union[User, Any]
    ) -> UploadFile:
        upload_dir = os.path.join(self.chunk_dir, upload_id)
        if not os.path.isdir(upload_dir):
            raise HTTPException(status_code=404, detail="Upload not found")

        # List and sort chunks
        chunks = os.listdir(upload_dir)
        chunks.sort(key=int)

        # Combine chunks
        final_content = bytearray()
        for chunk_name in chunks:
            chunk_path = os.path.join(upload_dir, chunk_name)
            with open(chunk_path, "rb") as f:
                final_content.extend(f.read())
            os.remove(chunk_path)

        os.rmdir(upload_dir)

        # Get mimetype from filename
        extension = os.path.splitext(filename)[1].lstrip(".").lower()
        mimetype = "application/octet-stream"  # Default mimetype
        if extension in IMAGE_EXTENSIONS:
            mimetype = f"image/{extension}"
        elif extension in DOCUMENT_EXTENSIONS:
            mimetype = f"application/{extension}"
        elif extension in VIDEO_EXTENSIONS:
            mimetype = f"video/{extension}"
        elif extension in AUDIO_EXTENSIONS:
            mimetype = f"audio/{extension}"

        return await self.upload_file(
            filename=filename,
            content=bytes(final_content),
            mimetype=mimetype,
            user=user,
        )

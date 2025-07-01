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
    @staticmethod
    async def upload_file(
        *,
        db: AsyncSession,
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

        # if extension not in DOCUMENT_EXTENSIONS:
        #     raise UnsupportedFileTypeError()

        # get file size
        file_size = len(content)

        # generate file key
        file_uuid = str(uuid.uuid4())

        file_key = "upload_files/" + (user.id or "") + "/" + file_uuid + "." + extension

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

        db.add(upload_file)
        await db.commit()
        await db.refresh(upload_file)

        return upload_file

from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    msg: str = "success"
    data: Optional[T] = None


class MessageResponse(BaseModel):
    code: int = 200
    msg: str = "success"

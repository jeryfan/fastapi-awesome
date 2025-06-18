from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional

class UserBase(BaseModel):
    name: Optional[str] = None
    email: EmailStr


class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDB(UserBase):
    id: UUID

    class Config:
        from_attributes = True

class User(UserInDB):
    pass
from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str

class TokenData(BaseModel):
    id: Optional[str] = None
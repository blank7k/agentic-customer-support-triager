from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Literal

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: Literal["customer", "manager"]

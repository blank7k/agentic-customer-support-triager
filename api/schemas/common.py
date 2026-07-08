from pydantic import BaseModel
from typing import Dict, Any

class HTTPError(BaseModel):
    detail: str

class HealthStatus(BaseModel):
    status: str
    details: Dict[str, Any] = {}

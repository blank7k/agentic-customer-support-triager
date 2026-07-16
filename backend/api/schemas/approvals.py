from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class ApprovalDecision(BaseModel):
    decision: Literal["approved", "rejected"]

class ApprovalResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    escalated_by: str
    reason: str
    status: Literal["pending", "approved", "rejected"]
    manager_id: Optional[UUID] = None
    decided_at: Optional[datetime] = None
    created_at: datetime

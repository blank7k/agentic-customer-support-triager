from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class Profile(BaseModel):
    id: UUID
    email: str
    role: Literal["customer", "manager"]
    created_at: datetime

class Conversation(BaseModel):
    id: UUID
    user_id: UUID
    status: Literal["active", "pending_approval", "completed"]
    created_at: datetime

class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    sender: Literal["customer", "agent", "system"]
    content: str
    created_at: datetime

class Ticket(BaseModel):
    id: UUID
    conversation_id: UUID
    subject: str
    status: Literal["open", "in_progress", "closed"]
    category: Literal["billing", "shipping", "refund", "general"]
    created_at: datetime

class Approval(BaseModel):
    id: UUID
    conversation_id: UUID
    escalated_by: str = "refund"
    reason: str
    status: Literal["pending", "approved", "rejected"]
    manager_id: Optional[UUID] = None
    decided_at: Optional[datetime] = None
    created_at: datetime

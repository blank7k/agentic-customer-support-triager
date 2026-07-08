from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Literal, Optional, Dict, Any

class TicketCreate(BaseModel):
    conversation_id: UUID
    subject: str
    category: Literal["billing", "shipping", "refund", "general"]

class TicketResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    subject: str
    status: Literal["open", "in_progress", "closed"]
    category: Literal["billing", "shipping", "refund", "general"]
    created_at: datetime
    graph_state: Optional[Dict[str, Any]] = None


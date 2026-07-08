from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Literal, Dict, Any

class ChatStartResponse(BaseModel):
    conversation_id: UUID

class ChatRequest(BaseModel):
    conversation_id: UUID
    content: str

class ChatResponse(BaseModel):
    status: Literal["completed", "pending_approval"]
    response: Optional[str] = None
    escalated: bool
    escalation_reason: Optional[str] = None

class WebSocketMessage(BaseModel):
    event: Literal["user_message", "status", "interrupt", "completion", "error"]
    content: Optional[str] = None
    node: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

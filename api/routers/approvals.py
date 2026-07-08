from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from uuid import UUID
from typing import List, Dict, Any
from api.schemas.auth import UserOut
from api.schemas.approvals import ApprovalDecision, ApprovalResponse
from api.dependencies.auth import require_manager, security
from api.services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["Human Approvals (HITL)"])

@router.get("/pending", response_model=List[ApprovalResponse])
def list_pending_approvals(
    current_user: UserOut = Depends(require_manager),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Lists all pending human-in-the-loop approvals. Restricted to managers.
    """
    token = credentials.credentials
    return ApprovalService.list_pending_approvals(token)

@router.post("/{thread_id}/decide", response_model=Dict[str, Any])
def submit_decision(
    thread_id: UUID,
    payload: ApprovalDecision,
    current_user: UserOut = Depends(require_manager),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Submits a manager decision (approve/reject) for an escalated refund conversation.
    Resumes LangGraph execution and returns the final customer support email.
    """
    token = credentials.credentials
    try:
        return ApprovalService.submit_decision(
            manager_id=current_user.id,
            thread_id=thread_id,
            decision=payload.decision,
            jwt_token=token
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

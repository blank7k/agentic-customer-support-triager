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

@router.get("/{thread_id}/state", response_model=Dict[str, Any])
def get_thread_state(
    thread_id: UUID,
    current_user: UserOut = Depends(require_manager),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Retrieves the raw LangGraph checkpointer state values for a given thread.
    Restricted to managers.
    """
    from api.services.graph_service import GraphService
    state = GraphService.get_thread_state(str(thread_id))
    if not state or not state.values:
        raise HTTPException(status_code=404, detail="Thread state not found or empty")
    return {
        "tasks": state.values.get("tasks", []),
        "results": state.values.get("results", []),
        "current_task_index": state.values.get("current_task_index", 0),
        "approval_required": state.values.get("approval_required", False),
        "approval_status": state.values.get("approval_status", "pending"),
        "approval_reason": state.values.get("approval_reason", None),
        "final_response": state.values.get("final_response", "")
    }


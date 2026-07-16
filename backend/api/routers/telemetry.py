from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from api.dependencies.auth import require_manager
from config import gateway

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Analytics Dashboard"])

@router.get("/report", response_model=List[Dict[str, Any]])
def get_telemetry_report(current_user=Depends(require_manager)):
    """
    Returns the accumulated transaction logs recorded by the LiteLLM Gateway
    (provider, model, token usage, cost, latency, and caching status).
    """
    return gateway.telemetry_logs

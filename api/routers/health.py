from fastapi import APIRouter
from api.schemas.common import HealthStatus
from api.database.client import get_supabase_client
import time

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/liveness", response_model=HealthStatus)
def get_liveness():
    """Simple probe verifying that the FastAPI server process is active."""
    return HealthStatus(status="healthy")

@router.get("/readiness", response_model=HealthStatus)
def get_readiness():
    """Readiness probe checking connection status to the Supabase PostgreSQL backend."""
    start_time = time.perf_counter()
    details = {}
    
    try:
        supabase = get_supabase_client()
        # Query profiles table structure for test read connectivity
        response = supabase.table("profiles").select("id").limit(1).execute()
        details["supabase_db"] = "connected"
    except Exception as e:
        details["supabase_db"] = f"error: {str(e)}"
        
    latency = time.perf_counter() - start_time
    details["latency_seconds"] = latency
    
    status = "ready" if "error" not in str(details) else "unready"
    return HealthStatus(status=status, details=details)

from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any
from fastapi import HTTPException
from api.database.client import get_supabase_client, get_supabase_admin_client
from api.services.graph_service import GraphService

class ApprovalService:
    @staticmethod
    def list_pending_approvals(jwt_token: str) -> List[Dict[str, Any]]:
        """
        Lists all pending human-in-the-loop approvals for support managers.
        Restricted to managers via database RLS.
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("approvals").select("*").eq("status", "pending").execute()
        return response.data or []

    @staticmethod
    def submit_decision(manager_id: UUID, thread_id: UUID, decision: str, jwt_token: str) -> Dict[str, Any]:
        """
        Submits the manager's decision (approve/reject), injects it into LangGraph state checkpointer,
        resumes the workflow run, and commits the output back to database logs.
        """
        supabase = get_supabase_client(jwt_token)
        admin_supabase = get_supabase_admin_client()
        
        # 1. Update database approval log
        decided_at = datetime.utcnow().isoformat()
        approval_update = supabase.table("approvals").update({
            "status": decision,
            "manager_id": str(manager_id),
            "decided_at": decided_at
        }).eq("conversation_id", str(thread_id)).eq("status", "pending").execute()
        
        if not approval_update.data:
            raise HTTPException(status_code=400, detail="No pending approval found for this conversation session")
            
        # 2. Inject decision into LangGraph State memory
        GraphService.inject_approval_decision(str(thread_id), decision)
        
        # 3. Resume Graph execution
        res = GraphService.run_workflow(str(thread_id), None)
        
        # 4. Commit final response to PostgreSQL (Bypassing RLS via admin client)
        final_text = res.get("final_response", "")
        
        # Update conversation status to completed
        admin_supabase.table("conversations").update({
            "status": "completed"
        }).eq("id", str(thread_id)).execute()
        
        # Save resolution response to messages history
        admin_supabase.table("messages").insert({
            "conversation_id": str(thread_id),
            "sender": "agent",
            "content": final_text
        }).execute()
        
        return {
            "status": "completed",
            "final_response": final_text
        }


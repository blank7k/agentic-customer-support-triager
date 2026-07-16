from uuid import UUID
from typing import Dict, Any
from api.database.client import get_supabase_client, get_supabase_admin_client
from api.services.graph_service import GraphService
from api.schemas.chat import ChatResponse

class ChatService:
    @staticmethod
    def start_conversation(user_id: UUID, jwt_token: str) -> UUID:
        """
        Creates a new conversation record in the PostgreSQL database under the user's RLS session.
        Returns the backend-generated conversation UUID ID.
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("conversations").insert({
            "user_id": str(user_id),
            "status": "active"
        }).execute()
        
        if not response.data:
            raise Exception("Failed to initialize conversation session in DB")
            
        return UUID(response.data[0]["id"])

    @staticmethod
    def post_message(user_id: UUID, conversation_id: UUID, content: str, jwt_token: str) -> ChatResponse:
        """
        Saves a customer message, executes the LangGraph workflow via GraphService,
        and saves the agent's resolution response.
        """
        supabase = get_supabase_client(jwt_token)
        admin_supabase = get_supabase_admin_client() # System client for updating statuses bypassing client limits
        
        # 1. Commit customer message to database
        supabase.table("messages").insert({
            "conversation_id": str(conversation_id),
            "sender": "customer",
            "content": content
        }).execute()
        
        # 2. Invoke Graph execution
        res = GraphService.run_workflow(str(conversation_id), content)
        
        # 3. Check for interrupts (HITL Manager reviews)
        if res.get("status") == "interrupted":
            reason = res.get("escalation_reason", "Policy threshold exceeded")
            
            # Record pending approval in admin system context (RLS restricts customers from approvals write)
            admin_supabase.table("approvals").insert({
                "conversation_id": str(conversation_id),
                "reason": reason,
                "status": "pending"
            }).execute()
            
            # Update conversation status
            admin_supabase.table("conversations").update({
                "status": "pending_approval"
            }).eq("id", str(conversation_id)).execute()
            
            return ChatResponse(
                status="pending_approval",
                response=None,
                escalated=True,
                escalation_reason=reason
            )
            
        # 4. Completed: Save agent response to database
        final_text = res.get("final_response", "")
        supabase.table("messages").insert({
            "conversation_id": str(conversation_id),
            "sender": "agent",
            "content": final_text
        }).execute()
        
        return ChatResponse(
            status="completed",
            response=final_text,
            escalated=False
        )

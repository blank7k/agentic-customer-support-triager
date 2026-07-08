from uuid import UUID
from typing import List, Dict, Any
from api.database.client import get_supabase_client

class TicketService:
    @staticmethod
    def create_ticket(conversation_id: UUID, subject: str, category: str, jwt_token: str) -> Dict[str, Any]:
        """
        Creates a new support ticket associated with a conversation thread under the user's session context.
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("tickets").insert({
            "conversation_id": str(conversation_id),
            "subject": subject,
            "category": category,
            "status": "open"
        }).execute()
        
        if not response.data:
            raise Exception("Failed to create ticket in database")
            
        return response.data[0]

    @staticmethod
    def list_tickets(jwt_token: str) -> List[Dict[str, Any]]:
        """
        Lists all support tickets for the current authenticated user.
        Row Level Security (RLS) automatically filters database returns to owned conversations.
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("tickets").select("*").execute()
        return response.data or []

    @staticmethod
    def get_ticket(ticket_id: UUID, jwt_token: str) -> Dict[str, Any]:
        """
        Retrieves details of a specific ticket, hydrating it with active LangGraph thread state values
        (executed workers, planner decisions, and RAG context results).
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("tickets").select("*").eq("id", str(ticket_id)).execute()
        
        if not response.data:
            raise Exception("Ticket not found or access denied")
            
        ticket = response.data[0]
        
        try:
            from api.services.graph_service import GraphService
            state = GraphService.get_thread_state(ticket["conversation_id"])
            if state and state.values:
                # Map LangGraph checkpointer state to payload parameters
                ticket["graph_state"] = {
                    "tasks": state.values.get("tasks", []),
                    "results": state.values.get("results", []),
                    "current_task_index": state.values.get("current_task_index", 0),
                    "approval_required": state.values.get("approval_required", False),
                    "approval_status": state.values.get("approval_status", "pending"),
                    "approval_reason": state.values.get("approval_reason", None),
                    "final_response": state.values.get("final_response", "")
                }
        except Exception as ge:
            print("Warning: Failed to fetch graph state for ticket details:", ge)
            ticket["graph_state"] = None
            
        return ticket


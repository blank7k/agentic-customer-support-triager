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
        Retrieves details of a specific ticket.
        Raises an exception if the ticket is not found or is restricted by RLS.
        """
        supabase = get_supabase_client(jwt_token)
        response = supabase.table("tickets").select("*").eq("id", str(ticket_id)).execute()
        
        if not response.data:
            raise Exception("Ticket not found or access denied")
            
        return response.data[0]

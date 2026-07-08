from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from uuid import UUID
from typing import List
from api.schemas.auth import UserOut
from api.schemas.tickets import TicketCreate, TicketResponse
from api.dependencies.auth import get_current_user, security
from api.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Tickets Management"])

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    request: TicketCreate,
    current_user: UserOut = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Creates a new support ticket associated with an existing conversation session.
    """
    token = credentials.credentials
    try:
        return TicketService.create_ticket(
            conversation_id=request.conversation_id,
            subject=request.subject,
            category=request.category,
            jwt_token=token
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=List[TicketResponse])
def list_tickets(
    current_user: UserOut = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Lists support tickets. RLS automatically filters returns to the customer's owned items,
    or grants full retrieval access if the authenticated account role is 'manager'.
    """
    token = credentials.credentials
    return TicketService.list_tickets(token)

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Retrieves the details of a specific support ticket.
    """
    token = credentials.credentials
    try:
        return TicketService.get_ticket(ticket_id, token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

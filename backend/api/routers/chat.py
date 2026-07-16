from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from typing import Optional
from api.schemas.auth import UserOut
from api.schemas.chat import ChatStartResponse, ChatRequest, ChatResponse
from api.dependencies.auth import get_current_user, security
from api.core.security import verify_and_decode_jwt
from api.services.chat_service import ChatService
from api.database.client import get_supabase_client, get_supabase_admin_client
from graph import app
from guardrails import InputGuardrail

router = APIRouter(prefix="/chat", tags=["Chat & Conversations"])

def get_ws_user(token: str) -> Optional[UserOut]:
    """Helper to verify WebSocket access tokens."""
    payload = verify_and_decode_jwt(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    email = payload.get("email")
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}
    role = user_metadata.get("role") or app_metadata.get("role") or "customer"
    
    if not user_id or not email:
        return None
    return UserOut(id=UUID(user_id), email=email, role=role)

@router.post("/start", response_model=ChatStartResponse, status_code=status.HTTP_201_CREATED)
def start_conversation(
    current_user: UserOut = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Initializes a new conversation session record. Generates a new thread ID in the backend 
    and links it to the active authenticated user profile.
    """
    token = credentials.credentials
    conversation_id = ChatService.start_conversation(current_user.id, token)
    return ChatStartResponse(conversation_id=conversation_id)

@router.post("/message", response_model=ChatResponse)
def post_message(
    request: ChatRequest,
    current_user: UserOut = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Posts a customer message to a conversation thread. Executes the triager workflow,
    registers response history logs, and flags review actions.
    """
    token = credentials.credentials
    return ChatService.post_message(
        user_id=current_user.id,
        conversation_id=request.conversation_id,
        content=request.content,
        jwt_token=token
    )

@router.websocket("/ws/{thread_id}")
async def websocket_chat_endpoint(websocket: WebSocket, thread_id: UUID):
    """
    WebSocket endpoint for real-time customer triager interaction.
    Enforces JWT authentication via the query string parameter, streams LangGraph node events, 
    detects escalations, and persists conversation updates.
    """
    # 1. Handshake & Token Authenticate Check
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return
        
    user = get_ws_user(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid auth token")
        return
        
    await websocket.accept()
    
    supabase = get_supabase_client(token)
    admin_supabase = get_supabase_admin_client()
    
    try:
        while True:
            # 2. Wait for customer frame input
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            
            if not content:
                continue
                
            # 3. Save incoming customer message to PostgreSQL
            supabase.table("messages").insert({
                "conversation_id": str(thread_id),
                "sender": "customer",
                "content": content
            }).execute()
            
            # 4. Check Input Guardrails before starting graph execution
            guardrail = InputGuardrail()
            input_result = guardrail.validate(content)
            if not input_result.is_safe:
                # Save safety decline message to DB
                supabase.table("messages").insert({
                    "conversation_id": str(thread_id),
                    "sender": "agent",
                    "content": input_result.rejection_reason
                }).execute()
                
                await websocket.send_json({
                    "event": "completion",
                    "content": input_result.rejection_reason
                })
                continue
                
            # 5. Stream LangGraph node updates in real-time
            config = {"configurable": {"thread_id": str(thread_id)}}
            inputs = {"customer_request": input_result.processed_text}
            
            try:
                # Iterate dynamically over graph node executions
                async for event in app.astream(inputs, config, stream_mode="updates"):
                    for node_name, output in event.items():
                        await websocket.send_json({
                            "event": "status",
                            "node": node_name,
                            "content": f"Processing in {node_name}..."
                        })
            except Exception as graph_err:
                await websocket.send_json({
                    "event": "error",
                    "content": f"Graph execution error: {str(graph_err)}"
                })
                continue
                
            # 6. Check final thread execution outcome (Interrupted vs Completed)
            state = app.get_state(config)
            if state.next:
                # Interrupted at approvals checkpoint!
                reason = state.values.get("approval_reason", "Manager approval required")
                
                # Insert pending approval log in system bypass role
                admin_supabase.table("approvals").insert({
                    "conversation_id": str(thread_id),
                    "reason": reason,
                    "status": "pending"
                }).execute()
                
                # Flag conversation status to pending_approval
                admin_supabase.table("conversations").update({
                    "status": "pending_approval"
                }).eq("id", str(thread_id)).execute()
                
                await websocket.send_json({
                    "event": "interrupt",
                    "content": reason
                })
            else:
                # Completed successfully! Save final agent response
                final_response = state.values.get("final_response", "")
                
                supabase.table("messages").insert({
                    "conversation_id": str(thread_id),
                    "sender": "agent",
                    "content": final_response
                }).execute()
                
                await websocket.send_json({
                    "event": "completion",
                    "content": final_response
                })
                
    except WebSocketDisconnect:
        # Client disconnected cleanly
        pass
    except Exception as e:
        # Catch connection failures
        try:
            await websocket.send_json({"event": "error", "content": str(e)})
        except Exception:
            pass

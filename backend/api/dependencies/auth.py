from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from api.core.security import verify_and_decode_jwt
from api.schemas.auth import UserOut

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserOut:
    """
    Dependency to validate the authorization token and return the authenticated user details.
    """
    token = credentials.credentials
    payload = verify_and_decode_jwt(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("sub")
    email = payload.get("email")
    
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject or email parameters",
        )

    # Fetch role from profiles table to ensure DB-level role consistency
    try:
        from api.database.client import get_supabase_admin_client
        admin_client = get_supabase_admin_client()
        profile_res = admin_client.table("profiles").select("role").eq("id", user_id).execute()
        if profile_res.data:
            role = profile_res.data[0]["role"]
        else:
            role = "customer"
    except Exception as e:
        print(f"Error querying profiles table for role in API: {e}")
        role = "customer"
        
    return UserOut(
        id=UUID(user_id),
        email=email,
        role=role
    )

class RoleChecker:
    """Enforces role-based permissions in endpoint invocations."""
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Allowed roles: {self.allowed_roles}",
            )
        return current_user

# Declared guards
require_manager = RoleChecker(["manager"])
require_customer = RoleChecker(["customer"])

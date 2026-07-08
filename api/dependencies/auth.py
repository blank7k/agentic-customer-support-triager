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
    
    # Supabase JWT stores custom user attributes (like role) in metadata claims
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}
    
    # Extract role from metadata, defaulting to 'customer'
    role = user_metadata.get("role") or app_metadata.get("role") or "customer"
    
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject or email parameters",
        )
        
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

import jwt
from typing import Dict, Any, Optional
from api.core.config import settings
from api.database.client import get_supabase_client

def verify_and_decode_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and verifies a Supabase JWT token.
    First attempts local HS256 decode verification using the JWT Secret (no latency).
    Falls back to querying Supabase Auth server directly if local decoding fails or JWT secret key is misconfigured.
    """
    # 1. Local verification attempt
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=["HS256"], 
            audience="authenticated"
        )
        return payload
    except jwt.PyJWTError:
        # Local decode failed. Proceed to fallback network check.
        pass

    # 2. Network verification fallback via Supabase Auth API
    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            user = user_response.user
            user_metadata = getattr(user, "user_metadata", {}) or {}
            app_metadata = getattr(user, "app_metadata", {}) or {}
            
            # Format payload structure identically to decoded JWT
            return {
                "sub": str(user.id),
                "email": user.email,
                "user_metadata": user_metadata,
                "app_metadata": app_metadata
            }
    except Exception:
        pass
        
    return None

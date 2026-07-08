from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from api.core.config import settings

def get_supabase_client(jwt_token: str = None) -> Client:
    """
    Returns a Supabase client. If a JWT token is supplied, it attaches it to the 
    request headers to enforce database Row Level Security (RLS) policies.
    """
    if jwt_token:
        options = ClientOptions(headers={"Authorization": f"Bearer {jwt_token}"})
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options=options)
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client using the Service Role Key, bypassing RLS.
    Use ONLY for system administrative overrides (e.g. provisioning new users/profiles).
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

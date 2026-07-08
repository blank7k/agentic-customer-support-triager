import os
from dotenv import load_dotenv

# Load workspace .env file
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path)

class Settings:
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Customer Support Triager API"
    
    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")  # Supabase Anon Key for client RLS
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") # For admin trigger overrides
    
    # JWT Decryption fallback secret if signature needs local decode verification
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "fallback_jwt_secret_key_change_me")

settings = Settings()

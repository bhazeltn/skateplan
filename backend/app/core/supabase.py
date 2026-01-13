"""Supabase client configuration for SkatePlan backend."""
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client with service role key for admin operations
supabase: Optional[Client] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global supabase
    if supabase is None:
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return supabase

def verify_supabase_jwt(token: str) -> dict:
    """
    Verify Supabase JWT token and return user data.

    Args:
        token: JWT token from Authorization header

    Returns:
        dict: User data from token payload

    Raises:
        Exception: If token is invalid
    """
    client = get_supabase_client()
    # Supabase client automatically verifies JWT signature
    user = client.auth.get_user(token)
    return user.user.model_dump() if user.user else None

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase import create_client, Client
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/login/access-token", response_model=Token)
def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Proxies to Supabase Auth.
    """
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    try:
        res = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password,
        })
        
        if res.session:
            return {
                "access_token": res.session.access_token,
                "token_type": "bearer",
            }
        else:
             raise HTTPException(status_code=400, detail="Incorrect email or password")
             
    except Exception as e:
        # In a real app, parse 'e' to see if it's invalid creds vs system error
        raise HTTPException(status_code=400, detail="Incorrect email or password")

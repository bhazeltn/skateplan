from jose import jwt
import pytest
from app.core.config import settings

def test_jwt_decode():
    # 1. Generate a token
    data = {"sub": "1234567890", "name": "John Doe", "iat": 1516239022}
    token = jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    # 2. Decode it
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    
    assert payload["sub"] == "1234567890"
    assert payload["name"] == "John Doe"

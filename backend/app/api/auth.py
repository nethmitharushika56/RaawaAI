from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.services.sqlite_db import save_user, get_user, create_session, verify_session_token, delete_session

router = APIRouter(prefix="/auth")

class SignUpRequest(BaseModel):
    email: str
    password: str
    name: str = ""
    company: str = ""
    job_title: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

def _hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return pw_hash, salt

def get_current_user_email(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    token = authorization.split(" ")[1]
    session = verify_session_token(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return session["email"]

@router.post("/signup")
def signup(req: SignUpRequest):
    email = req.email.lower().strip()
    existing = get_user(email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    
    pw_hash, salt = _hash_password(req.password)
    user = save_user(
        email=email,
        password_hash=pw_hash,
        salt=salt,
        name=req.name,
        company=req.company,
        job_title=req.job_title
    )
    
    # Create session token
    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    create_session(token, email, expires_at)
    
    # Sanitized user output
    user_data = dict(user)
    user_data.pop("password_hash", None)
    user_data.pop("salt", None)
    
    return {"token": token, "user": user_data}

@router.post("/login")
def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = get_user(email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    pw_hash, _ = _hash_password(req.password, user["salt"])
    if pw_hash != user["password_hash"]:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    # Create session token
    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    create_session(token, email, expires_at)
    
    # Sanitized user output
    user_data = dict(user)
    user_data.pop("password_hash", None)
    user_data.pop("salt", None)
    
    return {"token": token, "user": user_data}

@router.get("/me")
def me(email: str = Depends(get_current_user_email)):
    user = get_user(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = dict(user)
    user_data.pop("password_hash", None)
    user_data.pop("salt", None)
    return {"user": user_data}

@router.post("/logout")
def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        delete_session(token)
    return {"status": "success"}

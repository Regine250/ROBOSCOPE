import random
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr

from db import db_cursor
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_COLORS = [
  '#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', 
  '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'
]

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

@router.post("/register")
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    hashed = hash_password(password)
    avatar_color = random.choice(AVATAR_COLORS)
    full_name = (payload.full_name or "").strip() or username

    with db_cursor() as cur:
        # Check if email exists
        existing_email = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing_email:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")

        # Check if username exists
        existing_user = cur.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if existing_user:
            raise HTTPException(status_code=400, detail="This username is already taken. Please choose another.")

        cur.execute("""
            INSERT INTO users (email, username, hashed_password, full_name, avatar_color)
            VALUES (?, ?, ?, ?, ?)
        """, (email, username, hashed, full_name, avatar_color))
        user_id = cur.lastrowid

    token = create_access_token(user_id=user_id, email=email, username=username, full_name=full_name)

    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "username": username,
            "full_name": full_name,
            "avatar_color": avatar_color,
        }
    }

@router.post("/login")
def login(payload: LoginRequest):
    identifier = payload.username_or_email.strip()
    password = payload.password

    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Please provide username/email and password.")

    with db_cursor() as cur:
        # Search by email or username
        row = cur.execute("""
            SELECT id, email, username, hashed_password, full_name, avatar_color, created_at
            FROM users
            WHERE email = ? OR username = ?
        """, (identifier.lower(), identifier)).fetchone()

    if not row or not verify_password(password, row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password."
        )

    user_id = row["id"]
    email = row["email"]
    username = row["username"]
    full_name = row["full_name"] or username
    avatar_color = row["avatar_color"] or '#06b6d4'

    token = create_access_token(user_id=user_id, email=email, username=username, full_name=full_name)

    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "username": username,
            "full_name": full_name,
            "avatar_color": avatar_color,
            "created_at": row["created_at"]
        }
    }

@router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "user": current_user
    }

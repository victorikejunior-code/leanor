"""Admin sign-in endpoints.

Sign-in needs **both** an email and a password: they are checked together in
``auth.verify_credentials`` so neither field can be probed on its own. When
``ADMIN_EMAIL`` (or ``ADMIN_PASSWORD``) is missing from ``.env`` every attempt
is rejected.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth import (
    clear_failures,
    is_locked_out,
    issue_token,
    register_failure,
    require_admin,
    verify_credentials,
)
from config import settings
from schemas import EMAIL_RE

router = APIRouter(prefix="/api/admin", tags=["admin"])

# One message for every failure mode — never reveal which field was wrong.
BAD_CREDENTIALS = "Incorrect email or password."


class LoginBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=200)


class LoginResponse(BaseModel):
    token: str
    expires_at: str
    auth_enabled: bool = True


@router.post("/login", response_model=LoginResponse)
def login(body: LoginBody, request: Request) -> LoginResponse:
    host = request.client.host if request.client else "unknown"

    if is_locked_out(host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in a few minutes.",
        )

    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        register_failure(host)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=BAD_CREDENTIALS
        )

    if not verify_credentials(email, body.password):
        register_failure(host)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=BAD_CREDENTIALS
        )

    clear_failures(host)
    token, expires_at = issue_token(subject=email)
    return LoginResponse(
        token=token,
        expires_at=datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        auth_enabled=settings.auth_enabled,
    )


@router.get("/session")
def session(claims: dict = Depends(require_admin)) -> dict:
    """Lets the frontend validate a stored token before showing the inbox."""
    return {
        "authenticated": True,
        "subject": claims.get("sub", "admin"),
        "expires_at": claims.get("exp"),
        "auth_enabled": settings.auth_enabled,
    }

"""Admin authentication.

Email + password -> signed, expiring token, using only the standard library
(HMAC-SHA256 over a compact ``payload.signature`` string). No extra
dependency, no server-side session table, nothing to clean up.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any

from fastapi import Header, HTTPException, status

from config import settings

logger = logging.getLogger("leanor.auth")

# --- tiny brute-force damper -------------------------------------------------
_MAX_ATTEMPTS = 8
_LOCKOUT_SECONDS = 300
_attempts: dict[str, list[float]] = {}


def _client_key(client_host: str) -> list[float]:
    now = time.time()
    recent = [t for t in _attempts.get(client_host, []) if now - t < _LOCKOUT_SECONDS]
    _attempts[client_host] = recent
    return recent


def register_failure(client_host: str) -> None:
    _client_key(client_host).append(time.time())


def clear_failures(client_host: str) -> None:
    _attempts.pop(client_host, None)


def is_locked_out(client_host: str) -> bool:
    """True when this client burned through its failed-attempt budget."""
    return len(_client_key(client_host)) >= _MAX_ATTEMPTS


# --- encoding helpers --------------------------------------------------------
def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _secret() -> bytes:
    """Signing key: TOKEN_SECRET when set, otherwise derived from the credentials."""
    if settings.token_secret:
        return settings.token_secret.encode("utf-8")
    raw = f"leanor::{settings.admin_email}::{settings.admin_password}"
    return hashlib.sha256(raw.encode()).digest()


def _sign(payload: str) -> str:
    signature = hmac.new(_secret(), payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


# --- public API --------------------------------------------------------------
def verify_credentials(candidate_email: str, candidate_password: str) -> bool:
    """Constant-time check of BOTH fields; wrong email and wrong password are
    indistinguishable to the caller (and to a timing attacker).

    Sign-in requires ``ADMIN_EMAIL`` *and* ``ADMIN_PASSWORD``: with either one
    missing from ``.env`` the comparison always fails, so nobody gets in.
    """
    email_ok = bool(settings.admin_email) and hmac.compare_digest(
        candidate_email.strip().lower(), settings.admin_email
    )
    password_ok = bool(settings.admin_password) and hmac.compare_digest(
        candidate_password.strip(), settings.admin_password
    )
    # evaluate both sides every time, then combine — keeps the timing flat
    return email_ok and password_ok


def issue_token(subject: str = "admin") -> tuple[str, int]:
    """Return ``(token, expires_at_epoch_seconds)``."""
    expires_at = int(time.time()) + settings.token_ttl_hours * 3600
    payload = _b64encode(
        b'{"sub":"%s","exp":%d}' % (subject.encode("ascii"), expires_at)
    )
    return _sign(payload), expires_at


def verify_token(token: str | None) -> dict[str, Any]:
    """Validate a token, raising 401 when it is missing, forged or expired."""
    if not settings.auth_enabled:
        return {"sub": "admin", "exp": None, "auth": "disabled"}

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload, _, signature = token.rpartition(".")
    if not payload or not signature:
        raise HTTPException(status_code=401, detail="Malformed admin token.")

    expected = _sign(payload).rpartition(".")[2]
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid admin token.")

    try:
        claims = json.loads(_b64decode(payload))
    except Exception:
        raise HTTPException(status_code=401, detail="Unreadable admin token.") from None

    expires_at = claims.get("exp")
    if isinstance(expires_at, int) and expires_at < int(time.time()):
        raise HTTPException(
            status_code=401, detail="Session expired — please sign in again."
        )
    return claims


def require_admin(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """FastAPI dependency: ``Authorization: Bearer <token>``."""
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    return verify_token(token)
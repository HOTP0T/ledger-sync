"""Gnos3 SSO bridge.

Exchanges a short-lived Gnos3-issued JWT for a ledger-sync session, so that
ledger-sync can be embedded as a single-sign-on module inside the Gnos3-K4mi
stack. Gnos3 mints an HS256 exchange token signed with the shared
``WEBUI_SECRET_KEY`` (exposed here as ``LEDGER_SYNC_GNOS3_SECRET_KEY``), with
claims ``{sub, email, iss: 'gnos3', iat, exp}``. We verify it, upsert a local
user keyed on the Gnos3 identity, and return ledger-sync's own access/refresh
tokens.

The endpoint is inert (404) unless ``LEDGER_SYNC_GNOS3_SECRET_KEY`` is set, so
the upstream deployment is unaffected.
"""

from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ledger_sync.config.settings import settings
from ledger_sync.db.session import get_session
from ledger_sync.schemas.auth import Token
from ledger_sync.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["gnos3-sso"])

# Provider name recorded on users created via the Gnos3 bridge. Identity is
# keyed on (auth_provider="gnos3", auth_provider_id=<gnos3 sub>).
GNOS3_PROVIDER = "gnos3"
_GNOS3_ISSUER = "gnos3"


class Gnos3ExchangeRequest(BaseModel):
    """Body carrying the short-lived Gnos3 exchange token."""

    gnos3_token: str


@router.post("/exchange", response_model=Token)
def exchange_gnos3_token(
    body: Gnos3ExchangeRequest,
    session: Annotated[Session, Depends(get_session)],
) -> Token:
    """Verify a Gnos3 exchange JWT and return ledger-sync session tokens."""
    secret = settings.gnos3_secret_key
    if not secret:
        # SSO bridge not configured -> behave as if the route does not exist.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gnos3 SSO is not enabled",
        )

    try:
        claims = jwt.decode(
            body.gnos3_token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Gnos3 token",
        ) from exc

    if claims.get("iss") != _GNOS3_ISSUER:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Untrusted token issuer",
        )

    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip()
    if not sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gnos3 token missing sub/email",
        )

    full_name = claims.get("name") or None

    # Reuse the OAuth upsert path with a dedicated "gnos3" provider. Creates the
    # user + default preferences on first sight, then mints ledger-sync tokens.
    return AuthService(session).oauth_login_or_register(
        email=email,
        full_name=full_name,
        provider=GNOS3_PROVIDER,
        provider_id=sub,
    )

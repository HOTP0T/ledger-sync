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

``GET /api/auth/gnos3/embed`` tells the frontend which Gnos3 origins may frame it
(``LEDGER_SYNC_FRAME_ANCESTORS``, the list the CSP ``frame-ancestors`` header already
publishes), so it accepts ``gnos3:theme`` messages from those origins only.
"""

import re
from typing import Annotated
from urllib.parse import urlparse

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


def frame_ancestor_sources(raw: str) -> list[str]:
    """Split ``LEDGER_SYNC_FRAME_ANCESTORS`` (spaces and/or commas) into CSP sources."""
    return [source for source in re.split(r"[\s,]+", raw.strip()) if source]


_DEFAULT_PORTS = {"http": 80, "https": 443}


def gnos3_parent_origins(raw: str) -> list[str]:
    """The exact http(s) origins in a frame-ancestors list, as a browser reports them.

    CSP keywords (``'self'``), wildcards, bare hosts and anything unparsable are left
    out: a message origin is compared for equality, so only exact origins can match.
    """
    origins: list[str] = []
    for source in frame_ancestor_sources(raw):
        if source.startswith("'") or "*" in source:
            continue
        parsed = urlparse(source)
        scheme = parsed.scheme.lower()
        if scheme not in _DEFAULT_PORTS or not parsed.hostname:
            continue
        try:
            port = parsed.port
        except ValueError:
            continue
        host = parsed.hostname  # lower-cased, IPv6 brackets stripped
        if ":" in host:
            host = f"[{host}]"
        origin = f"{scheme}://{host}"
        if port is not None and port != _DEFAULT_PORTS[scheme]:
            origin = f"{origin}:{port}"
        if origin not in origins:
            origins.append(origin)
    return origins


class Gnos3EmbedConfig(BaseModel):
    """What the frontend needs to run inside the Gnos3 frame."""

    sso_enabled: bool
    parent_origins: list[str]


@router.get("/gnos3/embed", response_model=Gnos3EmbedConfig)
def gnos3_embed_config() -> Gnos3EmbedConfig:
    """Public: the Gnos3 origins allowed to frame the app (no secret, no user data)."""
    return Gnos3EmbedConfig(
        sso_enabled=bool(settings.gnos3_secret_key),
        parent_origins=gnos3_parent_origins(settings.frame_ancestors),
    )


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

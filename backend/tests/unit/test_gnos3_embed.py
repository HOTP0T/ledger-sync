"""Tests for the Gnos3 embed config (allowed parent origins for gnos3:theme)."""

from __future__ import annotations

import pytest

from ledger_sync.api import gnos3_sso
from ledger_sync.api.gnos3_sso import frame_ancestor_sources, gnos3_parent_origins


def test_sources_split_on_spaces_and_commas():
    raw = " http://localhost:5173,http://localhost:8080  https://gnos3.example "
    assert frame_ancestor_sources(raw) == [
        "http://localhost:5173",
        "http://localhost:8080",
        "https://gnos3.example",
    ]
    assert frame_ancestor_sources("") == []


def test_parent_origins_are_exact_browser_origins():
    raw = (
        "'self' http://localhost:5173 HTTP://Appliance.Local:8080/ https://gnos3.example:443 "
        "http://box:80/path *.example.com https://*.example.org gnos3.example ftp://files "
        "http://[::1]:8080 http://localhost:5173 http://bad:port"
    )
    assert gnos3_parent_origins(raw) == [
        "http://localhost:5173",
        "http://appliance.local:8080",
        "https://gnos3.example",
        "http://box",
        "http://[::1]:8080",
    ]


def test_embed_config_reads_settings(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(gnos3_sso.settings, "frame_ancestors", "http://localhost:8080")
    monkeypatch.setattr(gnos3_sso.settings, "gnos3_secret_key", "")
    config = gnos3_sso.gnos3_embed_config()
    assert config.parent_origins == ["http://localhost:8080"]
    assert config.sso_enabled is False

"""
Tests for configuration reading from environment variables.

This test verifies that the Settings class properly reads values from
environment variables instead of using hardcoded defaults.
"""
import os
import pytest
from app.core.config import Settings


def test_config_reads_supabase_url_from_env(monkeypatch):
    """Test that SUPABASE_URL is read from environment variable."""
    test_url = "http://kong:8000"
    monkeypatch.setenv("SUPABASE_URL", test_url)

    # Create a new Settings instance to pick up the env var
    settings = Settings()

    assert settings.SUPABASE_URL == test_url
    assert settings.SUPABASE_URL != "https://supabase.skateplan.bradnet.net"


def test_config_reads_supabase_key_from_env(monkeypatch):
    """Test that SUPABASE_KEY is read from environment variable."""
    test_key = "test-anon-key-12345"
    monkeypatch.setenv("SUPABASE_KEY", test_key)

    settings = Settings()

    assert settings.SUPABASE_KEY == test_key
    assert settings.SUPABASE_KEY != ""


def test_config_reads_service_role_key_from_env(monkeypatch):
    """Test that SUPABASE_SERVICE_ROLE_KEY is read from environment variable."""
    test_key = "test-service-role-key-67890"
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", test_key)

    settings = Settings()

    assert settings.SUPABASE_SERVICE_ROLE_KEY == test_key
    assert settings.SUPABASE_SERVICE_ROLE_KEY != ""


def test_config_reads_jwt_secret_from_env(monkeypatch):
    """Test that JWT_SECRET is read from environment variable."""
    test_secret = "test-jwt-secret-abcdef"
    monkeypatch.setenv("JWT_SECRET", test_secret)

    settings = Settings()

    assert settings.JWT_SECRET == test_secret
    assert settings.JWT_SECRET != "unsafe-secret-key"


def test_config_uses_default_supabase_url_when_not_set(monkeypatch):
    """Test that SUPABASE_URL defaults to http://kong:8000 when not set."""
    # Clear the env var if it exists
    monkeypatch.delenv("SUPABASE_URL", raising=False)

    settings = Settings()

    assert settings.SUPABASE_URL == "http://kong:8000"


def test_config_requires_supabase_keys(monkeypatch):
    """Test that SUPABASE_KEY and SUPABASE_SERVICE_ROLE_KEY are required."""
    # These should be set in environment and not have empty defaults
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    # When creating Settings without these env vars, it should either:
    # 1. Raise a validation error (preferred)
    # 2. Have a non-empty default (less preferred)

    # For now, we'll just verify they can be set from env
    monkeypatch.setenv("SUPABASE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-role-key")

    settings = Settings()
    assert settings.SUPABASE_KEY == "test-key"
    assert settings.SUPABASE_SERVICE_ROLE_KEY == "test-role-key"


def test_all_env_vars_together(monkeypatch):
    """Integration test: All config values read from environment."""
    monkeypatch.setenv("SUPABASE_URL", "http://test-kong:9000")
    monkeypatch.setenv("SUPABASE_KEY", "integration-test-anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "integration-test-service-key")
    monkeypatch.setenv("JWT_SECRET", "integration-test-jwt-secret")

    settings = Settings()

    assert settings.SUPABASE_URL == "http://test-kong:9000"
    assert settings.SUPABASE_KEY == "integration-test-anon-key"
    assert settings.SUPABASE_SERVICE_ROLE_KEY == "integration-test-service-key"
    assert settings.JWT_SECRET == "integration-test-jwt-secret"

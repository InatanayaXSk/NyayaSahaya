"""Admin API — runtime configuration management.

Allows hot-patching environment variables without restarting the server.
Protected by a SETTINGS_SECRET header that must be set in the Render env.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.config import settings, EDITABLE_KEYS

router = APIRouter()


def _check_secret(x_settings_secret: Optional[str]):
    """Verify the admin secret from request header."""
    if not x_settings_secret or x_settings_secret != settings.SETTINGS_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing X-Settings-Secret header.")


class ConfigPatch(BaseModel):
    key: str
    value: str


@router.get("/admin/config")
async def get_config(x_settings_secret: Optional[str] = Header(default=None)):
    """Get all runtime-editable configuration values (secrets redacted)."""
    _check_secret(x_settings_secret)
    return {
        "config": settings.as_public_dict(),
        "editable_keys": sorted(EDITABLE_KEYS),
        "note": "Secret fields are shown as ••••••••. POST to update."
    }


@router.post("/admin/config")
async def update_config(patch: ConfigPatch, x_settings_secret: Optional[str] = Header(default=None)):
    """Update a single runtime configuration value."""
    _check_secret(x_settings_secret)
    try:
        old_value = getattr(settings, patch.key, "")
        settings.update(patch.key, patch.value)
        return {
            "status": "updated",
            "key": patch.key,
            "old": "••••••••" if patch.key in {"OPENROUTER_API_KEY", "ALCHEMY_API_KEY"} else old_value,
            "new": "••••••••" if patch.key in {"OPENROUTER_API_KEY", "ALCHEMY_API_KEY"} else patch.value,
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/admin/config/bulk")
async def bulk_update_config(patches: list[ConfigPatch], x_settings_secret: Optional[str] = Header(default=None)):
    """Update multiple runtime configuration values at once."""
    _check_secret(x_settings_secret)
    results = []
    for patch in patches:
        try:
            settings.update(patch.key, patch.value)
            results.append({"key": patch.key, "status": "updated"})
        except (KeyError, PermissionError) as e:
            results.append({"key": patch.key, "status": "error", "detail": str(e)})
    return {"results": results}

"""Hardware API — proxies requests to the Raspberry Pi hardware node.

When the RPi is unreachable, falls back to local mock data so the
frontend always gets a usable response.
"""
import httpx
from fastapi import APIRouter
from app.config import settings
from app.services.hardware_provider import hardware_provider

router = APIRouter()

RPI = settings.RPI_BASE_URL  # e.g. http://192.168.1.50:8001


async def _proxy_get(path: str, fallback: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{RPI}{path}")
            r.raise_for_status()
            return r.json()
    except (httpx.HTTPError, httpx.ConnectError):
        return {**fallback, "_source": "mock"}


async def _proxy_post(path: str, body: dict | None, fallback: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(f"{RPI}{path}", json=body)
            r.raise_for_status()
            return r.json()
    except (httpx.HTTPError, httpx.ConnectError):
        return {**fallback, "_source": "mock"}


@router.get("/hardware/status")
async def hardware_status():
    status = await hardware_provider.get_status()
    # Still attempt to proxy if RPi is theoretically available, but for our mock, we just return the provider status
    return status


@router.post("/hardware/authenticate")
async def authenticate():
    return await hardware_provider.request_biometric_scan(user_id=1) # Hardcoded for now



@router.get("/hardware/heartbeat")
async def heartbeat():
    return await _proxy_get("/heartbeat", {
        "cpu_load": 45.0, "ram_usage_gb": 2.1, "ram_total_gb": 4,
        "disk_io": "Stable", "temperature_c": 42.0,
    })


@router.post("/hardware/rfid/scan")
async def rfid_scan():
    return await _proxy_post("/rfid/scan", None, {
        "token_id": "mock_token", "authorized": True,
    })


@router.post("/hardware/crypto/sign")
async def crypto_sign(body: dict):
    return await _proxy_post("/crypto/sign", body, {
        "signature": "mock_sig", "algorithm": "ECDSA-secp256k1",
    })


@router.post("/hardware/crypto/verify")
async def crypto_verify(body: dict):
    return await _proxy_post("/crypto/verify", body, {
        "valid": True, "algorithm": "ECDSA-secp256k1",
    })


@router.get("/hardware/tls/status")
async def tls_status():
    return await _proxy_get("/tls/status", {
        "handshake": "complete", "protocol": "TLSv1.3",
        "cipher": "AES-256-GCM", "integrity": "100%",
    })

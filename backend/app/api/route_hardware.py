"""Hardware API — proxies requests to the Raspberry Pi hardware node.

When the RPi is unreachable, falls back to local mock data so the
frontend always gets a usable response.
"""
import hashlib
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User, DocumentLedger, Role
from app.api.route_users import get_current_user
from app.database import get_db
from app.services.hardware_provider import hardware_provider
from app.services.eth_service import eth_service
from app.services.file_service import file_service

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
async def get_hw_status(current_user: User = Depends(get_current_user)):
    """Check if the RPi is currently reachable on the network."""
    return await hardware_provider.get_status()


@router.post("/hardware/authenticate")
async def authenticate(current_user: User = Depends(get_current_user)):
    """Trigger a biometric scan requirement on the hardware node."""
    return await hardware_provider.request_biometric_scan(username=current_user.username)


@router.get("/hardware/ping")
async def hardware_ping(current_user: User = Depends(get_current_user)):
    """Perform a direct ping to the RPi and return the raw response."""
    online = await hardware_provider.is_online()
    return {
        "status": "online" if online else "offline",
        "ping_response": hardware_provider.cached_stats,
        "endpoint": "/ping"
    }


@router.post("/hardware/rfid/scan")
async def rfid_scan(current_user: User = Depends(get_current_user)):
    if not await hardware_provider.is_online():
        raise HTTPException(status_code=503, detail="Raspberry Pi is offline.")
    return await _proxy_post("/rfid/scan", None, {
        "token_id": "mock_token", "authorized": True,
    })


@router.post("/hardware/crypto/sign")
async def crypto_sign(body: dict, current_user: User = Depends(get_current_user)):
    if not await hardware_provider.is_online():
        raise HTTPException(status_code=503, detail="Raspberry Pi is offline.")
    return await _proxy_post("/crypto/sign", body, {
        "signature": "mock_sig", "algorithm": "ECDSA-secp256k1",
    })


@router.post("/hardware/crypto/verify")
async def crypto_verify(body: dict, current_user: User = Depends(get_current_user)):
    return await _proxy_post("/crypto/verify", body, {
        "valid": True, "algorithm": "ECDSA-secp256k1",
    })


@router.get("/hardware/tls/status")
async def tls_status(current_user: User = Depends(get_current_user)):
    return await _proxy_get("/tls/status", {
        "handshake": "complete", "protocol": "TLSv1.3",
        "cipher": "AES-256-GCM", "integrity": "100%",
    })


@router.post("/hardware/documents/{id_or_public_id}/verify-on-chain")
async def verify_on_chain(
    id_or_public_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full on-chain verification flow with Dual-Authorization."""
    from sqlalchemy.orm import selectinload
    
    if not await hardware_provider.is_online():
        raise HTTPException(status_code=503, detail="Hardware bridge offline.")

    # Load document with owner and shared_with relationship
    if id_or_public_id.isdigit():
        stmt = select(DocumentLedger).options(
            selectinload(DocumentLedger.owner),
            selectinload(DocumentLedger.shared_with)
        ).where(DocumentLedger.id == int(id_or_public_id))
    else:
        stmt = select(DocumentLedger).options(
            selectinload(DocumentLedger.owner),
            selectinload(DocumentLedger.shared_with)
        ).where(DocumentLedger.public_id == id_or_public_id)
        
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access Check: Current user must be either the owner or an authorized lawyer
    is_owner = doc.owner_username == current_user.username
    is_authorized_lawyer = any(u.username == current_user.username for u in doc.shared_with)
    
    if not (is_owner or is_authorized_lawyer):
        raise HTTPException(status_code=403, detail="Access denied")

    if doc.sealed:
        raise HTTPException(status_code=409, detail="Already sealed")

    if doc.eth_tx_hash:
        try:
            tx_status = eth_service.check_transaction_status(doc.eth_tx_hash)
            if tx_status is True:
                doc.sealed = True
                await db.commit()
                raise HTTPException(status_code=409, detail="Already sealed")
            elif tx_status is False:
                # Previous transaction failed/reverted. Clear it and allow retry.
                doc.eth_tx_hash = None
                doc.sealed = False
                await db.commit()
            else:
                raise HTTPException(status_code=409, detail="A transaction is already pending on-chain")
        except Exception:
            raise HTTPException(status_code=409, detail="A transaction is already pending on-chain")

    # Dual-Authorization Logic
    # We need a lawyer and a client.
    all_involved = [doc.owner] + doc.shared_with
    lawyers = [u.username for u in all_involved if u.role == Role.LAWYER]
    clients = [u.username for u in all_involved if u.role == Role.CLIENT]

    if not lawyers:
        raise HTTPException(status_code=400, detail="This document must be shared with or owned by a lawyer before sealing.")
    if not clients:
        raise HTTPException(status_code=400, detail="This document must be shared with or owned by a client before sealing.")

    lawyer_username = lawyers[0]
    client_username = clients[0]

    # --- PHASE 1: LAWYER AUTHORIZATION ---
    await hardware_provider._broadcast("INFO", f"DUAL-AUTH PHASE 1: Waiting for Lawyer ({lawyer_username})")
    lawyer_auth = await hardware_provider.request_biometric_scan(username=lawyer_username)
    if lawyer_auth.get("status") != "success":
        raise HTTPException(status_code=401, detail=f"Lawyer Authorization Failed: {lawyer_auth.get('message')}")

    # --- PHASE 2: CLIENT AUTHORIZATION ---
    await hardware_provider._broadcast("INFO", f"DUAL-AUTH PHASE 2: Waiting for Client ({client_username})")
    client_auth = await hardware_provider.request_biometric_scan(username=client_username)
    if client_auth.get("status") != "success":
        raise HTTPException(status_code=401, detail=f"Client Authorization Failed: {client_auth.get('message')}")

    # --- PHASE 3: BLOCKCHAIN COMMIT ---
    file_hash = doc.current_hash
    # We use a combined signature or just the final one? 
    # Usually, the contract might take both, but for now we anchor with the combined proof.
    combined_proof = f"Lawyer:{lawyer_auth.get('signature')}|Client:{client_auth.get('signature')}"
    
    tx_hash = eth_service.push_to_sepolia(file_hash, combined_proof)

    doc.eth_tx_hash = tx_hash
    doc.eth_chain_id = 11155111
    doc.sealed = False
    await db.commit()

    return {
        "status": "sealed",
        "tx_hash": tx_hash,
        "etherscan_url": f"https://sepolia.etherscan.io/tx/{tx_hash}",
    }


@router.get("/hardware/documents/{id_or_public_id}/chain-status")
async def chain_status(
    id_or_public_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if id_or_public_id.isdigit():
        stmt = select(DocumentLedger).where(DocumentLedger.id == int(id_or_public_id))
    else:
        stmt = select(DocumentLedger).where(DocumentLedger.public_id == id_or_public_id)
        
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    tx_status = None
    if doc.eth_tx_hash:
        # ALWAYS check the real blockchain — never trust the local sealed flag alone.
        # This corrects phantom "sealed" entries where the tx was never actually mined.
        try:
            tx_status = eth_service.check_transaction_status(doc.eth_tx_hash)
            if tx_status is True and not doc.sealed:
                # Transaction confirmed on-chain; update local flag
                doc.sealed = True
                await db.commit()
            elif tx_status is False:
                # Transaction failed/reverted. Clear it and allow retry.
                print(f"[chain-status] TX {doc.eth_tx_hash} reverted for {doc.public_id}. Clearing.")
                doc.eth_tx_hash = None
                doc.sealed = False
                await db.commit()
            elif tx_status is None and doc.sealed:
                # Local says sealed but blockchain says tx not found — phantom entry!
                print(f"[chain-status] PHANTOM detected: {doc.public_id} marked sealed but tx {doc.eth_tx_hash} not found on-chain. Resetting.")
                doc.eth_tx_hash = None
                doc.sealed = False
                await db.commit()
        except Exception as e:
            print(f"Error checking transaction status: {e}")

    tx_status_str = "none"
    if doc.eth_tx_hash:
        if tx_status is True:
            tx_status_str = "success"
        elif tx_status is False:
            tx_status_str = "failed"
        else:
            tx_status_str = "pending"

    return {
        "sealed": tx_status_str == "success",
        "tx_hash": doc.eth_tx_hash,
        "tx_status": tx_status_str,
        "etherscan_url": f"https://sepolia.etherscan.io/tx/{doc.eth_tx_hash}" if doc.eth_tx_hash else None,
    }


@router.get("/hardware/eth/balance")
async def eth_balance(current_user: User = Depends(get_current_user)):
    return {
        "address": eth_service.get_wallet_address(),
        "balance_eth": eth_service.get_balance(),
    }

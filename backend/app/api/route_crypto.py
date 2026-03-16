"""Cryptographic signing and verification mock API."""
import hashlib
import time
import random
from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()


def _mock_hash():
    return "0x" + hashlib.sha256(str(time.time()).encode()).hexdigest()


def _mock_signature():
    return "sig_ecdsa_" + hashlib.sha256(str(random.random()).encode()).hexdigest()[:12]


@router.post("/crypto/sign")
async def sign_document(request: dict):
    """Simulate ECDSA-P256 cryptographic signing."""
    now = datetime.now(timezone.utc)
    return {
        "doc_hash": _mock_hash(),
        "signature_id": _mock_signature(),
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "node_id": "LN-NODE-ALPHA-04-V3",
        "ecdsa_signature": _mock_hash(),
        "algorithm": "ECC-P256",
        "status": "Authentic",
        "latency_ms": random.randint(8, 25),
        "block_number": random.randint(40000, 50000),
        "quorum": "12/12",
    }


@router.post("/crypto/verify")
async def verify_document(request: dict):
    """Verify a document hash against the registry."""
    doc_hash = request.get("doc_hash", "")
    is_tampered = random.random() < 0.1  # 10% chance of tamper detection in demo

    return {
        "doc_hash": doc_hash or _mock_hash(),
        "status": "TAMPER DETECTED" if is_tampered else "INTEGRITY VERIFIED",
        "verified": not is_tampered,
        "verification_id": f"#{'ERR' if is_tampered else 'AXF'}-{random.randint(1000, 9999)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "file_payload_hash": {"algorithm": "SHA-256", "result": "MATCHED" if not is_tampered else "MISMATCH"},
            "metadata_header": {"algorithm": "Keccak-256", "result": "MATCHED" if not is_tampered else "MISMATCH"},
            "blockchain_block": {"network": "Mainnet-V2", "block": random.randint(18000000, 19000000), "result": "VERIFIED"},
        },
    }


@router.get("/crypto/network-status")
async def network_status():
    """Get current network registry stats."""
    return {
        "verified_hashes": 1248902,
        "active_nodes": 4829,
        "uptime_percent": 99.998,
        "tls_handshake": "100% Secure",
        "cert_expiry": "2025-12-31",
        "encryption": "AES-256-GCM",
        "recent_confirmations": [
            {"hash": "0x71c...e4a2", "node": "AWS-East-402", "timestamp": "2023-10-27 14:22:10", "status": "Confirmed"},
            {"hash": "0x22b...f910", "node": "GCP-Europe-11", "timestamp": "2023-10-27 14:21:45", "status": "Confirmed"},
            {"hash": "0x99a...d3c1", "node": "DigitalOcean-SGP", "timestamp": "2023-10-27 14:20:12", "status": "Pending"},
            {"hash": "0x44d...88e3", "node": "Edge-Node-NY", "timestamp": "2023-10-27 14:19:05", "status": "Confirmed"},
        ],
    }

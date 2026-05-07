import base64
import json
import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization, hashes

import rfid_module

KEY_DIR = os.path.join(os.path.dirname(__file__), "keys")
PRIVATE_KEY_FILE = os.path.join(KEY_DIR, "ed25519_private_key.pem")
PUBLIC_KEY_FILE = os.path.join(KEY_DIR, "ed25519_public_key.pem")

app = FastAPI()


def _ensure_keypair():
    os.makedirs(KEY_DIR, exist_ok=True)

    if os.path.isfile(PRIVATE_KEY_FILE) and os.path.isfile(PUBLIC_KEY_FILE):
        with open(PRIVATE_KEY_FILE, "rb") as file:
            private_key = serialization.load_pem_private_key(
                file.read(),
                password=None
            )
        with open(PUBLIC_KEY_FILE, "rb") as file:
            public_key = serialization.load_pem_public_key(file.read())
        return private_key, public_key

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    with open(PRIVATE_KEY_FILE, "wb") as file:
        file.write(private_pem)
    with open(PUBLIC_KEY_FILE, "wb") as file:
        file.write(public_pem)

    return private_key, public_key


def _canonical_json(payload):
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _hash_payload(payload):
    digest = hashes.Hash(hashes.SHA256())
    digest.update(_canonical_json(payload))
    return digest.finalize().hex()


def _sign_payload(private_key, payload):
    signature = private_key.sign(_canonical_json(payload))
    return base64.b64encode(signature).decode("ascii")


def _build_signed_payload(card_id, name, fingerprint_id):
    payload = {
        "user_id": card_id,
        "name": name,
        "fingerprint_id": fingerprint_id,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }

    payload_hash = _hash_payload(payload)
    payload_with_hash = {**payload, "hash": payload_hash}

    private_key, public_key = _ensure_keypair()
    signature = _sign_payload(private_key, payload_with_hash)

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")

    return {
        **payload_with_hash,
        "signature": signature,
        "public_key": public_pem,
        "algorithm": "Ed25519",
    }


@app.get("/")
@app.get("/ping")
def ping():
    import psutil
    
    # Get temperature (Raspberry Pi specific)
    temp = 0.0
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read()) / 1000.0
    except:
        pass

    stats = {
        "cpu_load": psutil.cpu_percent(),
        "ram_usage_gb": round(psutil.virtual_memory().used / (1024**3), 2),
        "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "temperature_c": round(temp, 1),
        "disk_io": "Active"
    }
    
    return {
        "message": "pong",
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stats": stats
    }


@app.get("/users/{card_id}")
def get_user_payload(card_id: int):
    user = rfid_module.get_user(card_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    name, fingerprint_id = user
    return _build_signed_payload(card_id, name, fingerprint_id)


@app.get("/users/by-name/{name}")
def get_user_payload_by_name(name: str):
    user = rfid_module.get_user_by_name(name)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card_id, user_name, fingerprint_id = user
    return _build_signed_payload(card_id, user_name, fingerprint_id)


@app.post("/authenticate")
def authenticate(request_data: dict):
    """Trigger physical RFID + Fingerprint scan on hardware."""
    import rfid_module
    import fingerprint_module

    target_username = request_data.get("username", "").lower()
    if not target_username:
         raise HTTPException(status_code=400, detail="Target username is required for authentication")

    # 1. RFID Scan (Blocking)
    print(f"Waiting for {target_username}'s RFID tap...")
    success, card_id, scanned_name, expected_fp = rfid_module.read_card()
    
    if not success:
        raise HTTPException(status_code=401, detail="Unauthorized RFID card")

    if scanned_name.lower() != target_username:
        print(f"Identity Mismatch: Hardware belongs to {scanned_name}, but request is for {target_username}")
        raise HTTPException(status_code=401, detail=f"Identity Mismatch: This card belongs to {scanned_name}")

    # 2. Fingerprint Scan (Blocking)
    print(f"RFID Verified for {scanned_name}. Waiting for fingerprint...")
    fp_success, actual_fp = fingerprint_module.scan_fingerprint()
    
    if not fp_success:
        raise HTTPException(status_code=401, detail="Fingerprint scan failed")
        
    if actual_fp != expected_fp:
        raise HTTPException(status_code=401, detail="Fingerprint mismatch for user")

    # 3. Sign and Return
    print(f"Hardware Identity Verified: {scanned_name}")
    return _build_signed_payload(card_id, scanned_name, actual_fp)
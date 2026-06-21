import base64
import json
import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization, hashes

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


def _get_user_info(target_name_or_id):
    """Utility to look up user in authorized_users.json without importing hardware modules."""
    import os
    from dotenv import load_dotenv
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.path.dirname(script_dir), ".env")
    load_dotenv(env_path)

    user_file = os.path.join(script_dir, "authorized_users.json")
    if os.path.isfile(user_file):
        try:
            with open(user_file, "r", encoding="utf-8") as f:
                users = json.load(f)
            
            # Helper to get fingerprint position from env overrides
            def get_fp_pos(name, default_val):
                if name.lower() == "tejasvi":
                    env_val = os.getenv("TEJASVI_FINGERPRINT")
                    if env_val is not None:
                        return int(env_val)
                elif name.lower() == "sudeep":
                    env_val = os.getenv("SUDEEP_FINGERPRINT")
                    if env_val is not None:
                        return int(env_val)
                return int(default_val)

            # Check by card_id (as string or int)
            if str(target_name_or_id) in users:
                u = users[str(target_name_or_id)]
                name = u.get("name")
                fp_pos = get_fp_pos(name, u.get("fingerprint_position", 1))
                return int(target_name_or_id), name, fp_pos
            
            # Check by name (case-insensitive)
            for cid, u in users.items():
                if u.get("name", "").lower() == str(target_name_or_id).lower():
                    name = u.get("name")
                    fp_pos = get_fp_pos(name, u.get("fingerprint_position", 1))
                    return int(cid), name, fp_pos
        except Exception as e:
            print("Error parsing authorized_users.json:", e)

    # Fallback default values
    return 123456789, str(target_name_or_id).capitalize(), 1


@app.get("/")
@app.get("/ping")
def ping():
    import psutil
    
    # Get temperature (Raspberry Pi specific, mocked if unavailable)
    temp = 0.0
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read()) / 1000.0
    except:
        temp = 36.5 # Mock normal RPi temp

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
    cid, name, fp_id = _get_user_info(card_id)
    return _build_signed_payload(cid, name, fp_id)


@app.get("/users/by-name/{name}")
def get_user_payload_by_name(name: str):
    cid, user_name, fp_id = _get_user_info(name)
    return _build_signed_payload(cid, user_name, fp_id)


@app.post("/authenticate")
def authenticate(request_data: dict):
    """Dummy authenticate endpoint that returns success immediately without physical hardware."""
    target_username = request_data.get("username", "").lower()
    if not target_username:
         raise HTTPException(status_code=400, detail="Target username is required for authentication")

    print(f"[DUMMY MODE] Document signing initiated. Immediately authenticating user: {target_username}")
    
    cid, name, fp_id = _get_user_info(target_username)
    return _build_signed_payload(cid, name, fp_id)

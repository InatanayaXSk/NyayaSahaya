# LexNet Knowledge Transfer

## Overview
This document explains the full codebase, how the system runs, the authentication flow, OLED behavior, and the FastAPI signing server.

## System Summary
- Hardware: RFID reader (MFRC522), fingerprint sensor (PyFingerprint), OLED (SSD1306/SH1106), Raspberry Pi GPIO.
- Auth factor order: RFID card, then fingerprint verification.
- Data outputs: local CSV audit log, and a signed JSON payload via FastAPI.

## File Map (All Files)
- api_server.py: FastAPI server that returns signed user payloads with Ed25519.
- authorized_users.json: Persistent store of RFID user mappings.
- crypto_module.py: CSV audit log with nonce + hash.
- data_log.csv: Audit trail of access attempts.
- fingerprint_module.py: Fingerprint scan and match for authentication.
- get_fingerprint.py: Standalone fingerprint scan test.
- main.py: Primary authentication flow and OLED messaging.
- oled_module.py: OLED rendering helpers.
- register_fingerprint.py: Enrollment flow (RFID + fingerprint).
- rfid_module.py: RFID reader and user mapping utilities.
- keys/: Ed25519 keypair storage for the API server.
- .venv/: Python virtual environment (local only).
- __pycache__/: Python bytecode cache.

## Detailed Module Behavior

### api_server.py
Purpose: Exposes signed user data to a frontend or other services.

Endpoints:
- GET /users/{card_id}: Returns signed payload for a given RFID card.
- GET /users/by-name/{name}: Returns signed payload for a given user name.

Payload fields:
- user_id (RFID card ID)
- name
- fingerprint_id (template position on sensor)
- issued_at (UTC ISO-8601)
- hash (SHA-256 over canonical JSON of the payload)
- signature (Ed25519 over payload with hash)
- public_key (PEM)
- algorithm (Ed25519)

Key management:
- Keys are stored in keys/ed25519_private_key.pem and keys/ed25519_public_key.pem.
- If missing, they are generated on first API request.

Signing flow:
1) Build payload (user_id, name, fingerprint_id, issued_at).
2) Canonicalize JSON (sorted keys, compact separators).
3) Compute SHA-256 hash of canonical JSON.
4) Add hash into payload.
5) Sign canonical JSON of payload+hash using Ed25519.

### authorized_users.json
Stores the RFID mapping used by authentication and the API server.
Example:
{
  "474254804681": {"name": "Tejasvi", "fingerprint_position": 2},
  "495335117682": {"name": "Sumadhva", "fingerprint_position": 3}
}

### crypto_module.py
Purpose: Audit logging for access attempts.

Behavior:
- All logs go to data_log.csv.
- Each entry includes timestamp, status, name, card ID, hash, and nonce.
- Hash is SHA-256 over: raw_data + SECRET_KEY + nonce.

Functions:
- log_success(name, card_id, fingerprint, timestamp)
- log_denied(card_id, timestamp)

### fingerprint_module.py
Purpose: During authentication, scan a finger and check for a matching template.

Flow:
1) Initialize PyFingerprint on /dev/serial0 at 57600.
2) Verify sensor password.
3) Wait for finger image.
4) Convert image to characteristics buffer.
5) Search for matching template.
6) Return (True, position) or (False, None).

### get_fingerprint.py
Purpose: Test script to scan and print a fingerprint match result.

### main.py
Purpose: Core authentication flow (RFID then fingerprint).

Flow:
1) Show Welcome and prompt to place card.
2) Read RFID card.
3) If card not enrolled: show Unknown Card, log denied, increment attempts.
4) If card enrolled: show Access Granted and user details.
5) Prompt for fingerprint.
6) If fingerprint mismatch: show FP Failed, log denied, increment attempts.
7) On success: show Verified and Processing, log success, show Signature Done.
8) End session with Thank You.

Lockout:
- After 3 failed attempts, display System Locked and exit.

### oled_module.py
Purpose: Render text centered on the OLED display.

Behavior:
- Initializes I2C OLED (default ssd1306 at address 0x3C).
- Draws a border around the screen.
- Splits input text by newline and centers each line.

### register_fingerprint.py
Purpose: Enrollment flow (RFID + fingerprint) to create a new user entry.

Flow:
1) Ask for name.
2) Scan RFID card.
3) If card exists, ask to overwrite.
4) Enroll fingerprint in sensor memory.
5) Save mapping to authorized_users.json.

### rfid_module.py
Purpose: RFID reader and user lookup.

Functions:
- scan_card_id(): reads RFID card ID from MFRC522.
- read_card(): returns (valid, card_id, name, fingerprint_position).
- get_user(card_id): lookup by RFID.
- get_user_by_name(name): lookup by name.
- register_user(card_id, name, fp_position): persist mapping.

## Authentication Flow (End-to-End)
1) User places RFID card.
2) Card ID is checked against authorized_users.json.
3) If valid, system prompts for fingerprint.
4) Fingerprint must match the enrolled template for that RFID card.
5) On success, a log entry is written and the OLED displays completion.
6) API server can be queried for signed payloads using card ID or name.

## OLED Display Messages
- Welcome / Place Card
- Unknown Card / Enroll First / Try X/Y
- Access Granted
- Name and Card ID
- Place Finger
- FP Failed / Try X/Y
- SYSTEM LOCKED or System Locked
- Verified
- Processing...
- Signature Done / name / card_id / timestamp
- Thank You

## How To Run

### 1) Enrollment (Register a New User)
Run this on the Raspberry Pi:
python register_fingerprint.py

### 2) Authentication Loop
Run:
python main.py

### 3) API Server (FastAPI)
Use a virtual environment and run:
python3 -m venv .venv
source .venv/bin/activate
python -m pip install fastapi uvicorn cryptography mfrc522
uvicorn api_server:app --host 0.0.0.0 --port 8000

Example requests:
- http://<RPi-IP>:8000/users/474254804681
- http://<RPi-IP>:8000/users/by-name/Tejasvi

## Frontend Integration Notes
- Use the RPi LAN IP or a hostname (e.g., raspberrypi.local).
- If the frontend is a browser app, enable CORS in FastAPI if needed.
- Verify the Ed25519 signature using the returned public key.

## Security Notes
- The API signs payloads with Ed25519 to provide integrity and authenticity.
- The audit log uses a keyed hash + nonce to reduce replay risk in logs.
- Protect the private key file in keys/ from unauthorized access.

## Troubleshooting
- RFID errors: ensure mfrc522 is installed in the same venv used by uvicorn.
- Fingerprint errors: check /dev/serial0 and sensor power.
- OLED blank: change ssd1306 to sh1106 in oled_module.py if needed.
- API 404 at /: expected, use /users/{id} or /users/by-name/{name}.

## Code Listings (Line-by-Line)

### api_server.py
```python
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
```

### crypto_module.py
```python
import csv
import os
import hashlib

FILE = "data_log.csv"
SECRET_KEY = "my_secure_key_123"


def encrypt(data):
  # Generate random nonce (like secure element challenge)
  nonce = os.urandom(4).hex()

  combined = data + SECRET_KEY + nonce
  hash_value = hashlib.sha256(combined.encode()).hexdigest()

  return hash_value, nonce


def log_success(name, card_id, fingerprint, timestamp):

  file_exists = os.path.isfile(FILE)

  raw_data = f"{name}|{card_id}|{fingerprint}|{timestamp}"

  hash_value, nonce = encrypt(raw_data)

  with open(FILE, mode='a', newline='') as file:
    writer = csv.writer(file)

    if not file_exists:
      writer.writerow([
        "Time", "Status", "Name", "Card_ID", "Hash", "Nonce"
      ])

    writer.writerow([
      timestamp, "SUCCESS", name, card_id, hash_value, nonce
    ])

  print("Saved SUCCESS (nonce-secure)")


def log_denied(card_id, timestamp):

  file_exists = os.path.isfile(FILE)

  raw_data = f"DENIED|{card_id}|{timestamp}"

  hash_value, nonce = encrypt(raw_data)

  with open(FILE, mode='a', newline='') as file:
    writer = csv.writer(file)

    if not file_exists:
      writer.writerow([
        "Time", "Status", "Name", "Card_ID", "Hash", "Nonce"
      ])

    writer.writerow([
      timestamp, "DENIED", "Unknown", card_id, hash_value, nonce
    ])

  print("Saved DENIED (nonce-secure)")
```

### fingerprint_module.py
```python
from pyfingerprint.pyfingerprint import PyFingerprint

def scan_fingerprint():
  try:
    f = PyFingerprint('/dev/serial0', 57600)

    if not f.verifyPassword():
      print("Wrong password")
      return False, None

    print("Waiting for finger...")

    while not f.readImage():
      pass

    print("Image taken")

    f.convertImage(0x01)

    position, accuracy = f.searchTemplate()

    print(f"Match: {position}, Accuracy: {accuracy}")

    if position == -1:
      return False, None
    else:
      return True, position

  except Exception as e:
    print("Fingerprint error:", e)
    return False, None
```

### get_fingerprint.py
```python
from pyfingerprint.pyfingerprint import PyFingerprint

def scan_fingerprint():
  try:
    f = PyFingerprint('/dev/serial0', 57600)

    if not f.verifyPassword():
      print("Wrong password")
      return False, None

    print("Waiting for finger...")

    while not f.readImage():
      pass

    print("Image taken")

    f.convertImage(0x01)

    result = f.searchTemplate()
    position, accuracy = result

    print("Result:", position, "Accuracy:", accuracy)

    if position == -1:
      return False, None
    else:
      return True, position

  except Exception as e:
    print("Fingerprint error:", e)
    return False, None

if __name__ == "__main__":
  scan_fingerprint()
```

### main.py
```python
import time
from datetime import datetime
import RPi.GPIO as GPIO

GPIO.setwarnings(False)

import rfid_module
import oled_module
import fingerprint_module
import crypto_module

MAX_ATTEMPTS = 3


def main():

  attempts = 0

  while attempts < MAX_ATTEMPTS:

    # ---- Welcome ----
    oled_module.display("Welcome\nPlace Card")
    time.sleep(2)

    valid, card_id, name, expected_fp = rfid_module.read_card()

    timestamp = datetime.now().strftime("%d-%m %H:%M")

    # ---- RFID DENIED ----
    if not valid:
      attempts += 1

      oled_module.display(f"Unknown Card\nEnroll First\nTry {attempts}/{MAX_ATTEMPTS}")
      crypto_module.log_denied(card_id, timestamp)
      print(
        f"Card {card_id} is not registered. Run register_fingerprint.py to enroll this user first."
      )

      time.sleep(3)
      continue

    # ---- RFID OK ----
    oled_module.display("Access Granted")
    time.sleep(2)

    oled_module.display(f"{name}\n{card_id}")
    time.sleep(3)

    # ---- Fingerprint ----
    oled_module.display("Place Finger")
    time.sleep(2)

    success, fp_position = fingerprint_module.scan_fingerprint()
    print("DEBUG \u2192 scanned:", fp_position, "expected:", expected_fp)

    # ---- FP FAIL ----
    if not success or fp_position != expected_fp:
      attempts += 1

      oled_module.display(f"FP Failed\nTry {attempts}/{MAX_ATTEMPTS}")
      crypto_module.log_denied(card_id, timestamp)

      time.sleep(3)

      if attempts >= MAX_ATTEMPTS:
        oled_module.display("SYSTEM LOCKED")
        time.sleep(5)
        return

      continue

    # ---- SUCCESS ----
    oled_module.display("Verified")
    time.sleep(2)

    oled_module.display("Processing...")
    time.sleep(3)

    # Save success
    crypto_module.log_success(name, card_id, fp_position, timestamp)

    # ---- FINAL DISPLAY ----
    oled_module.display(
      f"Signature Done\n{name}\n{card_id}\n{timestamp}"
    )

    time.sleep(7)

    oled_module.display("Thank You")
    time.sleep(3)

    return

  # ---- LOCK SYSTEM ----
    
  oled_module.display("System Locked")
  time.sleep(5)
  print("Too many failed attempts")


if __name__ == "__main__":
  try:
    main()
  finally:
    GPIO.cleanup()
```

### oled_module.py
```python
from luma.core.interface.serial import i2c
from luma.oled.device import ssd1306, sh1106
from luma.core.render import canvas
from PIL import ImageFont
import sys

# 1. Initialize Display Interface
try:
  serial = i2c(port=1, address=0x3C)
  # If ssd1306 shows nothing, change this line to: device = sh1106(serial)
  device = ssd1306(serial) 
except Exception as e:
  print(f"Could not connect to OLED: {e}")
  sys.exit(1)

# 2. Load font
font = ImageFont.load_default()

def display(text):
  """
  Refactored display function using the 'canvas' context manager.
  This handles the clearing and updating of the screen automatically.
  """
  print(f"OLED Output: {text}") # Keep terminal print for debugging

  with canvas(device) as draw:
    # Draw a border around the edge
    draw.rectangle(device.bounding_box, outline="white", fill="black")

    # Split text into lines
    lines = text.split("\n")
        
    # Calculate vertical centering
    # Default font height is roughly 10-12 pixels
    line_height = 12
    total_height = len(lines) * line_height
    y = (device.height - total_height) // 2

    for line in lines:
      # Calculate horizontal centering
      # Use textbbox for newer versions of Pillow (replaces textsize)
      bbox = draw.textbbox((0, 0), line, font=font)
      text_width = bbox[2] - bbox[0]
      x = (device.width - text_width) // 2

      # Draw the text
      draw.text((x, y), line, font=font, fill="white")
      y += line_height

# --- Test Execution ---
if __name__ == "__main__":
  # Test with a simple message
  display("LEXNET\nSYSTEM ACTIVE\nPORT: 0x3C")
```

### register_fingerprint.py
```python
from pyfingerprint.pyfingerprint import PyFingerprint
import time

import rfid_module

def enroll_fingerprint(port='/dev/serial0', baud=57600):
  try:
    f = PyFingerprint(port, baud)

    if not f.verifyPassword():
      raise ValueError("Sensor password is wrong")

    print("Place finger...")

    # Wait for finger
    while not f.readImage():
      pass

    # Convert first image
    f.convertImage(0x01)

    # Check if already exists
    result = f.searchTemplate()
    position = result[0]

    if position >= 0:
      print(f"Fingerprint already exists at position {position}")
      return False, position

    print("Remove finger...")
    time.sleep(2)

    print("Place the same finger again...")

    while not f.readImage():
      pass

    # Convert second image
    f.convertImage(0x02)

    # Compare both scans
    if f.compareCharacteristics() == 0:
      raise Exception("Fingerprints do not match")

    # Create template
    f.createTemplate()

    # Store template
    position = f.storeTemplate()

    print(f"Fingerprint enrolled successfully at position {position}")
    return True, position

  except Exception as e:
    print("Enrollment failed:", e)
    return False, None


def enroll_user():
  name = input("Enter user name: ").strip()
  if not name:
    print("Name is required")
    return False

  print("Place RFID card to register...")
  card_id = rfid_module.scan_card_id()
  print(f"Card scanned: {card_id}")

  existing = rfid_module.get_user(card_id)
  if existing:
    old_name, old_fp = existing
    confirm = input(
      f"Card already assigned to {old_name} (FP {old_fp}). Overwrite? (y/N): "
    ).strip().lower()
    if confirm != "y":
      print("Enrollment cancelled")
      return False

  success, fp_position = enroll_fingerprint()
  if not success:
    return False

  rfid_module.register_user(card_id, name, fp_position)
  print(
    f"User registered successfully: name={name}, card_id={card_id}, fp={fp_position}"
  )
  return True

if __name__ == "__main__":
  enroll_user()
```

### rfid_module.py
```python
import json
import os

from mfrc522 import SimpleMFRC522

USER_FILE = os.path.join(os.path.dirname(__file__), "authorized_users.json")

# Default map: RFID -> (Name, Fingerprint Position)
DEFAULT_USERS = {
  474254804681: ("Tejasvi", 2)
}


def _load_users():
  users = DEFAULT_USERS.copy()

  if not os.path.isfile(USER_FILE):
    return users

  try:
    with open(USER_FILE, "r", encoding="utf-8") as file:
      payload = json.load(file)

    for card_id, user in payload.items():
      users[int(card_id)] = (
        user["name"],
        int(user["fingerprint_position"])
      )
  except Exception as exc:
    print("Could not load authorized users:", exc)

  return users


def _save_users(users):
  payload = {}

  for card_id, (name, fp_position) in users.items():
    payload[str(card_id)] = {
      "name": name,
      "fingerprint_position": int(fp_position)
    }

  with open(USER_FILE, "w", encoding="utf-8") as file:
    json.dump(payload, file, indent=2)


AUTHORIZED_USERS = _load_users()
reader = SimpleMFRC522()


def get_user(card_id):
  return AUTHORIZED_USERS.get(card_id)


def get_user_by_name(name):
  for card_id, (user_name, fp_position) in AUTHORIZED_USERS.items():
    if user_name == name:
      return card_id, user_name, fp_position
  return None


def register_user(card_id, name, fp_position):
  AUTHORIZED_USERS[int(card_id)] = (name, int(fp_position))
  _save_users(AUTHORIZED_USERS)


def scan_card_id():
  card_id, _ = reader.read()
  return card_id


def read_card():
  card_id = scan_card_id()

  if card_id in AUTHORIZED_USERS:
    name, fp_position = AUTHORIZED_USERS[card_id]
    return True, card_id, name, fp_position

  return False, card_id, None, None
```

### authorized_users.json
```json
{
  "474254804681": {
  "name": "Tejasvi",
  "fingerprint_position": 2
  },
  "495335117682": {
  "name": "Sumadhva",
  "fingerprint_position": 3
  }
}
```

### data_log.csv
```csv
Time,Status,Name,Card_ID,Hash,Nonce
05-05 18:20,DENIED,Unknown,474254804681,de97cfa09239b7e0f32a48edea5124cf3c976af69b51fcc84e96a92c5df601fa,802d1ca7
05-05 18:21,DENIED,Unknown,474254804681,9da7263b7869ef9b1956489e38db394ec233050d96d022d3a7a27a713f538c89,002a78cf
05-05 18:21,DENIED,Unknown,474254804681,5e500c32f105ce02f6fab2a5d0759b49f3b7cec05ffaa468f42824a58c0ffa22,08653022
05-05 18:36,DENIED,Unknown,474254804681,da2cf4e215fdfec87977f0e913e58bbb258309a7f10c707982353650cde7b614,bd60bebf
05-05 18:38,DENIED,Unknown,474254804681,5c952cb53812e36e1e5d87bd11409ba8916eb5812b3cc0578bda96f289c6630e,1e746ba4
05-05 18:38,DENIED,Unknown,474254804681,22b437b32217c42c46af98b6ae0bb15f1bab47e21066206914b21ea426419099,ec90ce09
05-05 18:41,DENIED,Unknown,474254804681,da70ff0caea69bbc58e473758e512146f749a5b33e82a60fa1ed1363b1d1fae8,957a8a14
05-05 18:43,DENIED,Unknown,474254804681,83c4726e00e1ea0de85f71eecff43d38ea5fc3081dc5ef1d6a056e34578ca531,eb1b7b82
05-05 18:44,SUCCESS,Tejasvi,474254804681,bad1d3182bf58f208f3689f9da91e0978deab15540e9681354c46f5544587375,add146f3
05-05 19:11,SUCCESS,Tejasvi,474254804681,fd3d1e5b91dc2b7793697d41116dabede0a4615e0ef8df360eb584875e28b0f4,0926a90c
05-05 19:12,DENIED,Unknown,474254804681,4cd0176759cb021fd9a2c8d193a27053fe87e71c5b11ffdb14b4320bd6cecb02,cf81f1fc
05-05 19:12,DENIED,Unknown,474254804681,731b2e5a85a1654d2fcaca234f3bd60d4a4700c9d16e71eef457ddbfd13d66a4,57a47e5c
05-05 22:46,DENIED,Unknown,474254804681,01d987457ba1370d6c78bc4cbef2d23f120167cbe1fb71d197240ce579034c75,b5e1c03d
06-05 09:58,DENIED,Unknown,495335117682,b1511f2760500ca72c683ab0c4f500e06d1f58a7bec30620de4fb223a9667819,43e50e32
06-05 09:58,DENIED,Unknown,495335117682,3b5ff23280bdbb41f96bdba7a287f346a86f63d2de92180626776690c7ca2e34,fe1e62f8
06-05 09:58,DENIED,Unknown,474254804681,259451d704ddfa99fcfeef4feec162a06f4c7868182dcf0a549b6d77f5458f4b,2a42c148
06-05 09:59,DENIED,Unknown,474254804681,e0ff786fa6ccf36a6aa00c43e489c7b4efee7d8cb1312af12d4685ffc5e85bcb,abda35da
```

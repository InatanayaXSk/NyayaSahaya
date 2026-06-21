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

    # Load from .env file
    import os
    from dotenv import load_dotenv
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.path.dirname(script_dir), ".env")
    load_dotenv(env_path)

    if not os.path.isfile(USER_FILE):
        return users

    try:
        with open(USER_FILE, "r", encoding="utf-8") as file:
            payload = json.load(file)

        for card_id, user in payload.items():
            name = user["name"]
            fp_position = int(user["fingerprint_position"])
            
            # Override fingerprint position from env vars if present
            if name.lower() == "tejasvi":
                env_val = os.getenv("TEJASVI_FINGERPRINT")
                if env_val is not None:
                    fp_position = int(env_val)
            elif name.lower() == "sudeep":
                env_val = os.getenv("SUDEEP_FINGERPRINT")
                if env_val is not None:
                    fp_position = int(env_val)
                    
            users[int(card_id)] = (name, fp_position)
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
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
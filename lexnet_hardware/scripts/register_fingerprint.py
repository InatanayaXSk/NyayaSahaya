
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
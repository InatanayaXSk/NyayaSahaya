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
        print("DEBUG → scanned:", fp_position, "expected:", expected_fp)

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
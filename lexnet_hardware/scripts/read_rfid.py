#!/usr/bin/env python3
"""
RFID Card Reader Utility
Continuously reads from the RFID reader and prints the scanned card details.
"""

import sys
import time
from mfrc522 import SimpleMFRC522

def main():
    print("Initializing RFID reader module...")
    try:
        reader = SimpleMFRC522()
    except Exception as e:
        print(f"Error initializing RFID reader: {e}", file=sys.stderr)
        print("Make sure the MFRC522 module is correctly wired and SPI is enabled on your Raspberry Pi.", file=sys.stderr)
        sys.exit(1)

    print("RFID Reader is active. Place a card near the reader to scan...")
    print("Press Ctrl+C to exit.\n")
    
    last_card_id = None
    last_read_time = 0
    
    try:
        while True:
            # SimpleMFRC522.read() is blocking
            card_id, text = reader.read()
            current_time = time.time()
            
            # De-duplicate prints if the card remains near the reader (2 seconds threshold)
            if card_id != last_card_id or (current_time - last_read_time) > 2.0:
                timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
                print(f"[{timestamp}] Scanned Card ID: {card_id}")
                if text and text.strip():
                    print(f"               Card Text: {text.strip()}")
                
                last_card_id = card_id
                last_read_time = current_time
            
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nExiting RFID reader utility.")
    except Exception as e:
        print(f"\nRFID Reader Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Fingerprint Sensor Management CLI Utility
Provides comprehensive tools to register/enroll, list, delete, clear, search,
display info, compare, and download fingerprint images from the sensor.
"""

import sys
import os
import argparse
import time
import json
from pyfingerprint.pyfingerprint import PyFingerprint

def get_user_file_path():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "authorized_users.json")

def load_user_map():
    path = get_user_file_path()
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load authorized_users.json: {e}")
        return {}

def save_user_map(user_map):
    path = get_user_file_path()
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(user_map, f, indent=2)
    except Exception as e:
        print(f"Error: Could not save authorized_users.json: {e}")

def init_sensor(port='/dev/serial0', baud=57600):
    try:
        f = PyFingerprint(port, baud)
        if not f.verifyPassword():
            print("Error: The fingerprint sensor password is wrong!")
            return None
        return f
    except Exception as e:
        print(f"Error connecting to fingerprint sensor on {port}: {e}")
        if "Permission denied" in str(e):
            print("\nTip: Permission denied on the serial port.")
            print("     Make sure your user belongs to the 'dialout' group:")
            print("     sudo usermod -a -G dialout $USER")
            print("     (Note: You must log out and log back in for group changes to take effect)")
        elif "FileNotFoundError" in str(e) or "does not exist" in str(e):
            print("\nTip: Serial port not found. Verify your connection or try another port (e.g. /dev/ttyUSB0).")
        return None

def list_enrolled_templates(f):
    enrolled = []
    try:
        capacity = f.getStorageCapacity()
    except Exception:
        capacity = 1000  # Default fallback limit
        
    for page in range(4):
        try:
            indices = f.getTemplateIndex(page)
            for i, used in enumerate(indices):
                position = (page * len(indices)) + i
                if position >= capacity:
                    break
                if used:
                    enrolled.append(position)
        except Exception:
            # Out of bounds page or communication error
            break
    return enrolled

def enroll_fingerprint_raw(f, position=-1):
    try:
        print("Place finger on the sensor...")
        while not f.readImage():
            time.sleep(0.1)
        
        print("Processing image...")
        f.convertImage(0x01)
        
        # Check if already exists
        pos, accuracy = f.searchTemplate()
        if pos >= 0:
            print(f"Fingerprint already exists in the database at slot #{pos} (Accuracy: {accuracy})")
            return False, pos
            
        print("Remove finger...")
        time.sleep(2)
        
        print("Place the SAME finger again...")
        while not f.readImage():
            time.sleep(0.1)
            
        print("Processing second image...")
        f.convertImage(0x02)
        
        print("Comparing scans...")
        if f.compareCharacteristics() == 0:
            print("Error: Scans do not match. Enrollment aborted.")
            return False, None
            
        print("Creating template...")
        f.createTemplate()
        
        print("Storing template...")
        enrolled_pos = f.storeTemplate(position)
        return True, enrolled_pos
        
    except Exception as e:
        print(f"Error during enrollment: {e}")
        return False, None

def enroll_flow_only(f, position=-1):
    print("\n--- Enroll Fingerprint ---")
    if position == -1:
        pos_input = input("Enter slot number to store at (or press Enter for auto): ").strip()
        if pos_input:
            try:
                position = int(pos_input)
            except ValueError:
                print("Invalid slot number.")
                return False
    
    success, enrolled_pos = enroll_fingerprint_raw(f, position)
    if success:
        print(f"Success! Fingerprint enrolled at slot #{enrolled_pos}.")
        return True
    return False

def enroll_user_flow(f, name=None, rfid=None, scan_rfid=True):
    print("\n--- Register User (RFID + Fingerprint) ---")
    if not name:
        name = input("Enter user name: ").strip()
        if not name:
            print("Name is required.")
            return False
            
    card_id = rfid
    if not card_id and scan_rfid:
        print("Place RFID card on the RFID reader to register...")
        try:
            import rfid_module
            card_id = rfid_module.scan_card_id()
            print(f"Card scanned: {card_id}")
        except Exception as e:
            print(f"Failed to scan RFID card: {e}")
            manual = input("Enter RFID Card ID manually (or press Enter to cancel): ").strip()
            if not manual:
                return False
            try:
                card_id = int(manual)
            except ValueError:
                print("Invalid card ID.")
                return False
                
    user_map = load_user_map()
    if card_id:
        existing = user_map.get(str(card_id))
        if existing:
            confirm = input(f"Card {card_id} is already assigned to '{existing['name']}' (Fingerprint slot: {existing['fingerprint_position']}). Overwrite? (y/N): ").strip().lower()
            if confirm != "y":
                print("Registration cancelled.")
                return False

    success, fp_pos = enroll_fingerprint_raw(f)
    if not success:
        print("Fingerprint enrollment failed. Registration aborted.")
        return False
        
    if card_id:
        user_map[str(card_id)] = {
            "name": name,
            "fingerprint_position": fp_pos
        }
        save_user_map(user_map)
        print(f"Successfully registered user '{name}' with RFID {card_id} and Fingerprint slot #{fp_pos}.")
    else:
        print(f"Fingerprint enrolled at slot #{fp_pos}, but no RFID was provided/scanned.")
    return True

def search_flow(f):
    print("\n--- Search / Verify Fingerprint ---")
    try:
        print("Place finger on the sensor...")
        while not f.readImage():
            time.sleep(0.1)
            
        print("Processing image...")
        f.convertImage(0x01)
        
        print("Searching database...")
        position, accuracy = f.searchTemplate()
        
        if position == -1:
            print("No matching fingerprint template found in the database.")
            return False, None
        else:
            print(f"Match found! Slot #{position} with accuracy score {accuracy}.")
            
            # Look up associated user
            user_map = load_user_map()
            user_found = False
            for card_id, user_data in user_map.items():
                if user_data.get("fingerprint_position") == position:
                    print(f"Associated User: {user_data['name']} (RFID: {card_id})")
                    user_found = True
                    break
            if not user_found:
                print("No user associated with this fingerprint slot in authorized_users.json.")
            return True, position
            
    except Exception as e:
        print(f"Error during search: {e}")
        return False, None

def list_flow(f):
    print("\n--- Enrolled Fingerprints list ---")
    try:
        enrolled_positions = list_enrolled_templates(f)
        if not enrolled_positions:
            print("No fingerprints enrolled on the sensor.")
            return
            
        user_map = load_user_map()
        pos_to_user = {}
        for card_id, user_data in user_map.items():
            pos = user_data.get("fingerprint_position")
            if pos is not None:
                pos_to_user[int(pos)] = (user_data["name"], card_id)
                
        print(f"Found {len(enrolled_positions)} enrolled template(s):")
        print(f"{'Slot #':<8} | {'User Name':<20} | {'RFID Card ID':<15}")
        print("-" * 50)
        for pos in enrolled_positions:
            if pos in pos_to_user:
                name, card_id = pos_to_user[pos]
                print(f"{pos:<8} | {name:<20} | {card_id:<15}")
            else:
                print(f"{pos:<8} | {'[Unassigned]':<20} | {'[N/A]':<15}")
                
    except Exception as e:
        print(f"Error listing templates: {e}")

def delete_flow(f, position=None):
    print("\n--- Delete Fingerprint Template ---")
    if position is None:
        pos_input = input("Enter slot number to delete: ").strip()
        if not pos_input:
            print("Deletion cancelled.")
            return False
        try:
            position = int(pos_input)
        except ValueError:
            print("Invalid slot number.")
            return False
            
    try:
        enrolled = list_enrolled_templates(f)
        if position not in enrolled:
            confirm = input(f"Warning: Slot #{position} does not seem to be marked as used on sensor. Delete anyway? (y/N): ").strip().lower()
            if confirm != "y":
                return False
                
        success = f.deleteTemplate(position)
        if success:
            print(f"Successfully deleted template at slot #{position}.")
            
            # Clean up user associations
            user_map = load_user_map()
            modified = False
            for card_id, user_data in list(user_map.items()):
                if user_data.get("fingerprint_position") == position:
                    print(f"Clearing fingerprint association for user '{user_data['name']}' (RFID: {card_id})")
                    user_data["fingerprint_position"] = -1
                    modified = True
            if modified:
                save_user_map(user_map)
            return True
        else:
            print(f"Failed to delete template at slot #{position}.")
            return False
    except Exception as e:
        print(f"Error deleting template: {e}")
        return False

def clear_flow(f, force=False):
    print("\n--- Clear Fingerprint Database ---")
    if not force:
        confirm = input("WARNING: This will delete ALL fingerprint templates stored on the sensor! Are you absolutely sure? (type 'yes' to confirm): ").strip().lower()
        if confirm != "yes":
            print("Database clear cancelled.")
            return False
            
    try:
        success = f.clearDatabase()
        if success:
            print("Successfully cleared all templates from the sensor database.")
            
            # Clean up user associations
            user_map = load_user_map()
            modified = False
            for card_id, user_data in user_map.items():
                if user_data.get("fingerprint_position") != -1:
                    user_data["fingerprint_position"] = -1
                    modified = True
            if modified:
                save_user_map(user_map)
                print("Reset all user fingerprint associations in authorized_users.json.")
            return True
        else:
            print("Sensor reported failure while clearing database.")
            return False
    except Exception as e:
        print(f"Error clearing database: {e}")
        return False

def info_flow(f):
    print("\n--- Sensor System Information ---")
    try:
        params = f.getSystemParameters()
        status_reg, system_id, capacity, security_level, address, packet_length, baud_rate = params
        
        print(f"System ID:         {system_id}")
        print(f"Sensor Address:    {hex(address)}")
        print(f"Storage Capacity:  {capacity} templates")
        print(f"Security Level:    {security_level} (1-5, where 5 is highest)")
        print(f"Status Register:   {hex(status_reg)}")
        print(f"Packet Length:     {packet_length} (raw index)")
        print(f"Baud Rate:         {baud_rate * 9600} bps")
        
        count = f.getTemplateCount()
        print(f"Templates Enrolled:{count} / {capacity}")
    except Exception as e:
        print(f"Error retrieving sensor information: {e}")

def image_flow(f, output_path=None):
    print("\n--- Capture Fingerprint Image ---")
    if not output_path:
        output_path = input("Enter output image path (default: fingerprint.png): ").strip()
        if not output_path:
            output_path = "fingerprint.png"
            
    try:
        print("Place finger on the sensor...")
        while not f.readImage():
            time.sleep(0.1)
            
        print("Downloading image to file...")
        f.downloadImage(output_path)
        print(f"Successfully saved fingerprint image to '{output_path}'.")
        return True
    except Exception as e:
        print(f"Error capturing image: {e}")
        if "PIL" in str(e) or "Pillow" in str(e):
            print("\nTip: This function requires the 'Pillow' library.")
            print("     You can install it with: pip install Pillow")
        return False

def compare_flow(f):
    print("\n--- Compare Two Fingerprints ---")
    try:
        print("Place the FIRST finger on the sensor...")
        while not f.readImage():
            time.sleep(0.1)
        print("Processing first image...")
        f.convertImage(0x01)
        
        print("Remove finger...")
        time.sleep(2)
        
        print("Place the SECOND finger on the sensor...")
        while not f.readImage():
            time.sleep(0.1)
        print("Processing second image...")
        f.convertImage(0x02)
        
        print("Comparing characteristics...")
        score = f.compareCharacteristics()
        
        if score == 0:
            print("Result: The two fingerprints DO NOT match.")
        else:
            print(f"Result: Match found! The fingerprints match with a score of {score}.")
    except Exception as e:
        print(f"Error comparing fingerprints: {e}")

def interactive_menu(port, baud):
    print("Connecting to fingerprint sensor...")
    f = init_sensor(port, baud)
    if not f:
        print("Failed to initialize fingerprint sensor. Exiting.")
        return

    while True:
        print("\n" + "="*45)
        print("    FINGERPRINT SENSOR CONTROL PANEL")
        print("="*45)
        print(" 1. Enroll New Fingerprint (Template Only)")
        print(" 2. Register New User (RFID + Name + Fingerprint)")
        print(" 3. Search / Verify Fingerprint")
        print(" 4. List Enrolled Templates & Users")
        print(" 5. Delete Specific Fingerprint Slot")
        print(" 6. Clear Entire Fingerprint Database")
        print(" 7. Show Sensor System Information")
        print(" 8. Capture and Download Fingerprint Image")
        print(" 9. Compare Two Fingerprints")
        print(" 0. Exit")
        print("="*45)
        
        try:
            choice = input("Enter choice (0-9): ").strip()
            if choice == "1":
                enroll_flow_only(f)
            elif choice == "2":
                enroll_user_flow(f)
            elif choice == "3":
                search_flow(f)
            elif choice == "4":
                list_flow(f)
            elif choice == "5":
                delete_flow(f)
            elif choice == "6":
                clear_flow(f)
            elif choice == "7":
                info_flow(f)
            elif choice == "8":
                image_flow(f)
            elif choice == "9":
                compare_flow(f)
            elif choice == "0":
                print("Exiting controller.")
                break
            else:
                print("Invalid choice, please enter 0-9.")
        except KeyboardInterrupt:
            print("\nExiting controller.")
            break
        except Exception as e:
            print(f"An error occurred: {e}")

def main():
    parser = argparse.ArgumentParser(description="Fingerprint Sensor Management CLI Utility")
    parser.add_argument("--port", "-p", default="/dev/serial0", help="Serial port (default: /dev/serial0)")
    parser.add_argument("--baud", "-b", type=int, default=57600, help="Baud rate (default: 57600)")
    
    # Action flags
    parser.add_argument("--enroll", "-e", action="store_true", help="Enroll a new fingerprint template")
    parser.add_argument("--search", "-s", action="store_true", help="Scan finger and search database for a match")
    parser.add_argument("--list", "-l", action="store_true", help="List enrolled templates and their user associations")
    parser.add_argument("--delete", "-d", type=int, metavar="POSITION", help="Delete template at the specified slot number")
    parser.add_argument("--clear", action="store_true", help="Clear all templates from the sensor database")
    parser.add_argument("--info", "-i", action="store_true", help="Display fingerprint sensor system information")
    parser.add_argument("--image", action="store_true", help="Capture a fingerprint image and download it to a file")
    parser.add_argument("--compare", "-c", action="store_true", help="Compare two scans")
    
    # Sub-arguments/parameters
    parser.add_argument("--position", "-pos", type=int, default=-1, help="Specific slot for enrollment (default: auto)")
    parser.add_argument("--name", "-n", help="User name to register (used with enrollment)")
    parser.add_argument("--rfid", "-r", type=int, help="RFID Card ID to register (used with enrollment)")
    parser.add_argument("--scan-rfid", action="store_true", help="Scan RFID card during enrollment")
    parser.add_argument("--out", "-o", default="fingerprint.png", help="Output file path for the captured image (default: fingerprint.png)")
    
    args = parser.parse_args()
    
    # Check if any action flag is explicitly set
    has_action = any([
        args.enroll,
        args.search,
        args.list,
        args.delete is not None,
        args.clear,
        args.info,
        args.image,
        args.compare
    ])
    
    # If no action flag is explicitly set:
    if not has_action:
        # Check if enrollment parameters were passed
        if args.name or args.rfid or args.scan_rfid:
            # Default to enroll action
            args.enroll = True
        else:
            # Run interactive menu
            interactive_menu(args.port, args.baud)
            return

    # Execute specified action
    f = init_sensor(args.port, args.baud)
    if not f:
        sys.exit(1)
        
    if args.enroll:
        if args.name or args.rfid or args.scan_rfid:
            enroll_user_flow(f, name=args.name, rfid=args.rfid, scan_rfid=args.scan_rfid)
        else:
            enroll_flow_only(f, position=args.position)
            
    elif args.search:
        search_flow(f)
        
    elif args.list:
        list_flow(f)
        
    elif args.delete is not None:
        delete_flow(f, position=args.delete)
        
    elif args.clear:
        clear_flow(f, force=False)
        
    elif args.info:
        info_flow(f)
        
    elif args.image:
        image_flow(f, output_path=args.out)
        
    elif args.compare:
        compare_flow(f)

if __name__ == "__main__":
    main()
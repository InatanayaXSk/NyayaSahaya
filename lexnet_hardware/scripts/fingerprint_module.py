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
from luma.core.interface.serial import i2c
from luma.oled.device import ssd1306, sh1106
from luma.core.render import canvas
from PIL import ImageFont
import os
from smbus2 import SMBus

def _find_i2c_device():
    ports = [1, 2]
    addresses = [0x3C, 0x3D]

    for port in ports:
        if not os.path.exists(f"/dev/i2c-{port}"):
            continue
        try:
            with SMBus(port) as bus:
                for address in addresses:
                    try:
                        bus.write_quick(address)
                        return port, address
                    except Exception:
                        continue
        except Exception:
            continue

    return None, None


# 1. Initialize Display Interface
device = None
try:
    port, address = _find_i2c_device()
    if port is not None:
        serial = i2c(port=port, address=address)
        # If ssd1306 shows nothing, change this line to: device = sh1106(serial)
        device = ssd1306(serial)
    else:
        print("Could not connect to OLED: no I2C device found at 0x3C or 0x3D")
except Exception as e:
    print(f"Could not connect to OLED: {e}")
    device = None

# 2. Load font
font = ImageFont.load_default()

def display(text):
    """
    Refactored display function using the 'canvas' context manager.
    This handles the clearing and updating of the screen automatically.
    """
    print(f"OLED Output: {text}") # Keep terminal print for debugging

    if device is None:
        return

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
##register_fingerprint.py
import time
import requests
import os
import socket

# Configuration
BACKEND_URL = "http://localhost:8000/api/hardware/heartbeat"
INTERVAL = 5  # seconds
DEVICE_ID = "LOCAL_DEV_NODE"

def get_cpu_load():
    try:
        with open("/proc/loadavg", "r") as f:
            load = f.read().split()[0]
            return float(load) * 100 / os.cpu_count()
    except Exception:
        return 0.0

def get_ram_usage():
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
            mem_total = int(lines[0].split()[1])
            mem_free = int(lines[1].split()[1])
            used = mem_total - mem_free
            return round(used / 1024 / 1024, 2), round(mem_total / 1024 / 1024, 2)
    except Exception:
        return 0.0, 4.0

def get_temperature():
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = int(f.read()) / 1000
            return temp
    except Exception:
        return 0.0

def main():
    print(f"Starting heartbeat daemon for {DEVICE_ID}...")
    print(f"Reporting to {BACKEND_URL}")
    
    while True:
        try:
            used_ram, total_ram = get_ram_usage()
            payload = {
                "device_id": DEVICE_ID,
                "cpu_load": round(get_cpu_load(), 1),
                "ram_usage_gb": used_ram,
                "ram_total_gb": total_ram,
                "temperature_c": round(get_temperature(), 1),
                "disk_io": "Stable",
                "timestamp": time.time()
            }
            
            response = requests.post(BACKEND_URL, json=payload, timeout=2)
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] Heartbeat sent successfully.")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Failed to send heartbeat: {response.status_code}")
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Error: {str(e)}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()

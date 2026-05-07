"""Hardware provider interface for LexNet to mock or interact with actual Raspberry Pi."""
import asyncio
import random
import httpx
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.config import settings

class BaseHardwareProvider(ABC):
    def __init__(self):
        self.device_id = "rpi-nyaya-01"
        self.status = "checking"
        self._subscribers: List[asyncio.Queue] = []
        self.cached_stats = {
            "cpu_load": 0.0,
            "ram_usage_gb": 0.0,
            "ram_total_gb": 4.0,
            "temperature_c": 0.0,
            "disk_io": "Idle"
        }

    @abstractmethod
    async def is_online(self) -> bool:
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        pass

    async def _broadcast(self, event_type: str, message: str, **kwargs):
        """Broadcast status updates to all connected UI clients."""
        payload = {
            "event": event_type,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **kwargs
        }
        for q in self._subscribers:
            await q.put(payload)

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    @abstractmethod
    async def request_biometric_scan(self, username: str) -> Dict[str, Any]:
        pass

class RealHardwareProvider(BaseHardwareProvider):
    def __init__(self):
        super().__init__()
        self.rpi_url = settings.RPI_BASE_URL

    async def is_online(self) -> bool:
        """Ping the RPi API server to check availability."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.rpi_url}/ping")
                if response.status_code == 200:
                    data = response.json()
                    self.cached_stats = data.get("stats", self.cached_stats)
                    return True
                return False
        except Exception:
            return False

    async def get_status(self) -> Dict[str, Any]:
        online = await self.is_online()
        return {
            "device_id": self.device_id,
            "status": "online" if online else "offline",
            "stats": self.cached_stats if online else {},
            "components": {
                "fingerprint": "ready" if online else "unavailable",
                "tpm": "ready" if online else "unavailable"
            },
            "mode": "REAL"
        }

    async def request_biometric_scan(self, username: str) -> Dict[str, Any]:
        if not await self.is_online():
            return {"status": "failure", "message": "Hardware bridge is offline"}

        await self._broadcast("AUTH_START", f"Biometric session initiated for {username}. Waiting for hardware...", step="start")
        
        try:
            # Proxied call to the actual RPi API Server
            async with httpx.AsyncClient(timeout=60.0) as client:
                await self._broadcast("AUTH_PROC", f"Waiting for {username} to tap RFID card...", step="processing")
                
                response = await client.post(f"{self.rpi_url}/authenticate", json={"username": username})
                
                if response.status_code == 200:
                    data = response.json()
                    await self._broadcast("BIOMETRIC", f"Identity verified: {data.get('name')}", step="success")
                    return {
                        "status": "success",
                        "message": "Hardware authentication successful",
                        "signature": data.get("signature"),
                        "username": username
                    }
                else:
                    detail = response.json().get("detail", "Hardware auth failed")
                    await self._broadcast("WARN", detail, step="start")
                    return {"status": "failure", "message": detail}
        except Exception as e:
            await self._broadcast("WARN", f"Connection error: {str(e)}", step="start")
            return {"status": "failure", "message": str(e)}

class MockHardwareProvider(BaseHardwareProvider):
    async def is_online(self) -> bool:
        return True

    async def get_status(self) -> Dict[str, Any]:
        # Generate some mock data so cached_stats isn't empty
        self.cached_stats = {
            "cpu_load": round(random.uniform(5, 15), 1),
            "ram_usage_gb": 0.8,
            "ram_total_gb": 4.0,
            "temperature_c": 42.0,
            "disk_io": "Idle"
        }
        return {
            "device_id": self.device_id,
            "status": "online",
            "stats": self.cached_stats,
            "components": {
                "fingerprint": "ready",
                "tpm": "ready"
            },
            "mode": "MOCK"
        }

    async def request_biometric_scan(self, username: str) -> Dict[str, Any]:
        await self._broadcast("AUTH_START", f"Biometric scan requested for {username}", step="start")
        await asyncio.sleep(1.5)
        await self._broadcast("AUTH_PROC", "Scanning Dermal Layers...", step="processing")
        await asyncio.sleep(2.0)
        
        is_success = random.random() > 0.1
        if is_success:
            confidence = round(random.uniform(0.85, 0.99), 2)
            await self._broadcast("BIOMETRIC", f"Scan successful. Confidence: {confidence}", step="success")
            return {
                "status": "success",
                "confidence": confidence,
                "message": "Biometric match successful",
                "username": username,
                "signature": f"hw_sig_{hash(random.random())}"
            }
        else:
            await self._broadcast("WARN", "Biometric match failed.", step="start")
            return {"status": "failure", "message": "Biometric match failed."}

# Factory to get the right provider based on environment
def get_hardware_provider():
    mode = os.getenv("HARDWARE_MODE", "mock").lower()
    if mode == "real":
        return RealHardwareProvider()
    return MockHardwareProvider()

hardware_provider = get_hardware_provider()

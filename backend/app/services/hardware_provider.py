"""Hardware provider interface for LexNet to mock or interact with actual Raspberry Pi."""
import asyncio
import random
from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseHardwareProvider(ABC):
    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Return the current status of the hardware."""
        pass

    @abstractmethod
    async def request_biometric_scan(self, user_id: int) -> Dict[str, Any]:
        """Trigger a biometric scan."""
        pass

    @abstractmethod
    async def subscribe(self, queue: asyncio.Queue):
        pass

    @abstractmethod
    def unsubscribe(self, queue: asyncio.Queue):
        pass

class MockHardwareProvider(BaseHardwareProvider):
    def __init__(self):
        self.device_id = "rpi-nyaya-01"
        self.status = "online"
        self.last_heartbeat = None
        self.stats = {
            "cpu_load": 0.0,
            "ram_usage_gb": 0.0,
            "ram_total_gb": 4.0,
            "temperature_c": 0.0,
            "disk_io": "Unknown"
        }
        self._subscribers: List[asyncio.Queue] = []
        
        # Start random event generator in background
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._background_event_generator())
        except RuntimeError:
            pass # No running loop during init, must start manually or ignore

    async def update_heartbeat(self, stats: Dict[str, Any]):
        from datetime import datetime, timezone
        self.last_heartbeat = datetime.now(timezone.utc)
        self.stats.update(stats)
        self.status = "online"
        await self._broadcast("HEARTBEAT", "Hardware module heartbeat received", data=self.stats)

    async def is_online(self) -> bool:
        if not self.last_heartbeat:
            return False
        from datetime import datetime, timezone
        delta = datetime.now(timezone.utc) - self.last_heartbeat
        # 15 second threshold
        is_on = delta.total_seconds() < 15
        if not is_on:
            self.status = "offline"
        return is_on
    
    async def _broadcast(self, event_type: str, message: str, step: str = None, data: dict = None):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        event = {
            "timestamp": now.strftime("[%H:%M:%S]"),
            "type": event_type,
            "message": message,
        }
        if step:
            event["type"] = "auth_event"
            event["data"] = {"step": step, "message": message}
        
        if data:
            event["data"] = data
            
        for q in self._subscribers:
            await q.put(event)
            
    async def subscribe(self, queue: asyncio.Queue):
        self._subscribers.append(queue)
        
    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self._subscribers:
            self._subscribers.remove(queue)
            
    async def _background_event_generator(self):
        while True:
            await asyncio.sleep(random.uniform(5.0, 15.0))
            if self._subscribers:
                # Only send random events if online? Or just keep it as is
                await self._broadcast("INFO", "Background system check completed")
    
    async def get_status(self) -> Dict[str, Any]:
        online = await self.is_online()
        return {
            "device_id": self.device_id,
            "status": "online" if online else "offline",
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "stats": self.stats if online else {},
            "components": {
                "fingerprint": "ready" if online else "unavailable",
                "tpm": "ready" if online else "unavailable",
                "camera": "ready" if online else "unavailable"
            }
        }
    
    async def request_biometric_scan(self, user_id: int) -> Dict[str, Any]:
        if not await self.is_online():
            return {
                "status": "failure",
                "message": "Hardware bridge is offline"
            }

        await self._broadcast("AUTH_START", f"Biometric scan requested for user {user_id}", step="start")
        # Simulate hardware delay part 1
        await asyncio.sleep(1.0)
        await self._broadcast("AUTH_PROC", "Scanning Dermal Layers...", step="processing")
        await asyncio.sleep(1.5)
        
        # Simulate an 80% success rate
        is_success = random.random() > 0.1
        
        if is_success:
            confidence = round(random.uniform(0.85, 0.99), 2)
            await self._broadcast("BIOMETRIC", f"Scan successful. Confidence: {confidence}", step="success")
            return {
                "status": "success",
                "confidence": confidence,
                "message": "Biometric match successful",
                "user_id": user_id,
                "signature": f"hw_sig_{hash(random.random())}"
            }
        else:
            confidence = round(random.uniform(0.10, 0.60), 2)
            await self._broadcast("WARN", f"Scan failed. Confidence: {confidence}", step="start") # fallback to start visually
            return {
                "status": "failure",
                "confidence": confidence,
                "message": "Biometric match failed. Try again.",
                "user_id": user_id
            }

# Singleton instance for dependency injection
hardware_provider = MockHardwareProvider()

# Singleton instance for dependency injection
hardware_provider = MockHardwareProvider()

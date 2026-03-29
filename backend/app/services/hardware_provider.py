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
        self.device_id = "mock-rpi-001"
        self.status = "online"
        self._subscribers: List[asyncio.Queue] = []
        
        # Start random event generator in background
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._background_event_generator())
        except RuntimeError:
            pass # No running loop during init, must start manually or ignore
    
    async def _broadcast(self, event_type: str, message: str, step: str = None):
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
                await self._broadcast("HEARTBEAT", "Hardware module heartbeat ok")
    
    async def get_status(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "status": self.status,
            "components": {
                "fingerprint": "ready",
                "tpm": "ready",
                "camera": "ready"
            }
        }
    
    async def request_biometric_scan(self, user_id: int) -> Dict[str, Any]:
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
                "user_id": user_id
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

"""WebSocket endpoint for real-time hardware events."""
import asyncio
import json
import random
import hashlib
import time
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.hardware_provider import hardware_provider

router = APIRouter()

# Connected WebSocket clients
clients: list[WebSocket] = []


async def generate_mock_event():
    """Generate a mock hardware event."""
    event_types = [
        {"type": "INFO", "message": "Handshake initialized with peer 192.168.1.44"},
        {"type": "WS", "message": f"Incoming websocket frame: op=TEXT len={random.randint(64, 512)} cid=x{random.randint(100, 999)}"},
        {"type": "WARN", "message": "Retry logic triggered for endpoint /auth/verify - Latency > 200ms"},
        {"type": "API", "message": f"POST /v2/bridge/sync - 201 Created - {random.randint(10, 80)}ms"},
        {"type": "INFO", "message": f"Garbage collection cycle completed - reclaimed {random.randint(20, 100)}MB"},
        {"type": "WS", "message": f"Broadcast sent to {random.randint(100, 500)} active listeners via relay-node-{random.randint(1, 12)}"},
        {"type": "API", "message": f"GET /v2/health - 200 OK - {random.randint(2, 15)}ms"},
        {"type": "INFO", "message": "Auto-scaler initiated: instance-br-29 spinning up..."},
        {"type": "BIOMETRIC", "message": f"Fingerprint scan confidence: {round(random.uniform(0.92, 0.9999), 4)}"},
        {"type": "SIGN", "message": f"Document signed: hash={hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]}"},
    ]
    event = random.choice(event_types)
    now = datetime.now(timezone.utc)
    return {
        "timestamp": now.strftime("[%H:%M:%S]"),
        "type": event["type"],
        "message": event["message"],
    }


@router.websocket("/ws/hardware")
async def websocket_hardware(websocket: WebSocket):
    """WebSocket endpoint for streaming hardware events."""
    await websocket.accept()
    clients.append(websocket)
    
    queue = asyncio.Queue()
    await hardware_provider.subscribe(queue)
    
    try:
        while True:
            # Wait for event from hardware provider
            event = await queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        clients.remove(websocket)
    except Exception:
        if websocket in clients:
            clients.remove(websocket)
    finally:
        hardware_provider.unsubscribe(queue)

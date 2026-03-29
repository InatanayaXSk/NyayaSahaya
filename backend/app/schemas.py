"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


# --- Chat ---
class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


# --- Document Generation ---
class DocumentGenerateRequest(BaseModel):
    document_type: str  # "Sale Deed", "Will", "Power of Attorney"
    data: Dict[str, str]


class DocumentGenerateResponse(BaseModel):
    success: bool
    public_id: Optional[str] = None
    filename: str
    message: str
    doc_hash: Optional[str] = None
    download_url: Optional[str] = None
    cloudinary_url: Optional[str] = None


# --- Hardware ---
class HardwareAuthEvent(BaseModel):
    device_id: str
    event_type: str
    status: str
    confidence: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class HardwareAuthResponse(BaseModel):
    device_id: str
    status: str
    confidence: float
    steps: list


# --- Crypto ---
class SigningRequest(BaseModel):
    document_id: str
    user_id: str


class SignaturePacket(BaseModel):
    doc_hash: str
    signature_id: str
    timestamp: str
    node_id: str
    ecdsa_signature: str
    algorithm: str
    status: str


# --- Health ---
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

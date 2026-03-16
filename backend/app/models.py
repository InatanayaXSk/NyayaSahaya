"""SQLAlchemy ORM models for LexNet."""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # user, admin, counsel
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    documents = relationship("Document", back_populates="owner")
    hardware_logs = relationship("HardwareLog", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    document_type = Column(String(100), nullable=False)  # Sale Deed, Will, Power of Attorney, etc.
    status = Column(String(50), default="draft")  # draft, generated, signed, verified
    content_hash = Column(String(128))  # SHA-256 hash
    ecdsa_signature = Column(Text)
    node_id = Column(String(100))
    file_path = Column(String(500))
    metadata_json = Column(Text)  # JSON string for flexible extra data
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="documents")


class HardwareLog(Base):
    __tablename__ = "hardware_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False)
    event_type = Column(String(100), nullable=False)  # auth_start, biometric_scan, sign_request, heartbeat
    status = Column(String(50), nullable=False)  # success, failure, pending, processing
    confidence = Column(Float)
    details = Column(Text)  # JSON string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="hardware_logs")

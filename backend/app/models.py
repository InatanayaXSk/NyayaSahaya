from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Table, Column, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Role(str, Enum):
    CLIENT = "client"
    LAWYER = "lawyer"

# Association table for Document Sharing (Relational ACL)
# This implements the "Many-to-Many" relationship between Documents and Lawyers
document_sharing = Table(
    "document_sharing",
    Base.metadata,
    Column("document_id", ForeignKey("ledger.id", ondelete="CASCADE"), primary_key=True),
    Column("lawyer_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SQLEnum(Role), default=Role.CLIENT)
    
    # Lawyer profile fields
    specialization: Mapped[Optional[str]] = mapped_column(String(200))
    bio: Mapped[Optional[str]] = mapped_column(Text())
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    owned_documents: Mapped[List["DocumentLedger"]] = relationship(back_populates="owner")
    shared_documents: Mapped[List["DocumentLedger"]] = relationship(
        secondary=document_sharing, back_populates="shared_with"
    )

class DocumentLedger(Base):
    __tablename__ = "ledger"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(255), index=True)
    document_type: Mapped[str] = mapped_column(String(100))
    current_hash: Mapped[str] = mapped_column(String(128))
    previous_hash: Mapped[str] = mapped_column(String(128), default="genesis")
    
    # Ownership and Access Control
    owner_username: Mapped[str] = mapped_column(String(100), ForeignKey("users.username"))
    
    # Cryptographic Metadata
    signature_data: Mapped[Optional[str]] = mapped_column(Text())
    public_key: Mapped[Optional[str]] = mapped_column(Text())
    signer_id: Mapped[Optional[str]] = mapped_column(String(100))
    extracted_text: Mapped[Optional[str]] = mapped_column(Text())
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="owned_documents")
    shared_with: Mapped[List["User"]] = relationship(
        secondary=document_sharing, back_populates="shared_documents"
    )
    analysis: Mapped[Optional["DocumentAnalysis"]] = relationship(back_populates="ledger", cascade="all, delete-orphan")

class DocumentAnalysis(Base):
    __tablename__ = "document_analysis"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("ledger.id", ondelete="CASCADE"), unique=True)
    analysis_data: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    ledger: Mapped["DocumentLedger"] = relationship(back_populates="analysis")

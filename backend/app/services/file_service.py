import os
import hashlib
from datetime import datetime
from app.config import settings

class FileService:
    @staticmethod
    def save_document(file_bytes: bytes, filename: str) -> dict:
        """Generate document metadata but do NOT write to local disk."""
        try:
            # Generate a unique hash for the file
            doc_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Use timestamp to ensure filename uniqueness
            timestamp = int(datetime.now().timestamp())
            disk_filename = f"{filename.replace('.pdf', '')}_{timestamp}.pdf"
            
            return {
                "success": True,
                "filename": disk_filename,
                "doc_hash": doc_hash,
                "url": f"/api/download/{disk_filename}",
                "public_id": disk_filename # Use filename as the unique identifier
            }
        except Exception as e:
            print(f"Metadata generation failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_file_path(filename: str) -> str:
        """Get the absolute path to a file in the local storage (Deprecated)."""
        raise NotImplementedError("Filesystem storage is deprecated. Use get_pdf_bytes from database.")

    @staticmethod
    async def get_pdf_bytes(public_id: str, db) -> bytes:
        """Read pdf_data from the DB by public_id."""
        from sqlalchemy import select
        from app.models import DocumentLedger
        stmt = select(DocumentLedger.pdf_data).where(DocumentLedger.public_id == public_id)
        result = await db.execute(stmt)
        pdf_data = result.scalar_one_or_none()
        if not pdf_data:
            raise FileNotFoundError(f"PDF data for public_id {public_id} not found in database")
        return pdf_data

    @staticmethod
    def list_files() -> list:
        """List all PDFs in the local storage directory (Deprecated)."""
        raise NotImplementedError("Filesystem storage is deprecated.")

    @staticmethod
    def delete_file(filename: str) -> bool:
        """Delete a file from the local storage (Deprecated)."""
        raise NotImplementedError("Filesystem storage is deprecated.")

file_service = FileService()


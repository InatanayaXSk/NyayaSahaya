import os
import hashlib
from datetime import datetime
from app.config import settings

class FileService:
    @staticmethod
    def save_document(file_bytes: bytes, filename: str) -> dict:
        """Save a PDF document to the local disk and return its metadata."""
        try:
            # Generate a unique hash for the file
            doc_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Use timestamp to ensure filename uniqueness on disk
            timestamp = int(datetime.now().timestamp())
            disk_filename = f"{filename.replace('.pdf', '')}_{timestamp}.pdf"
            file_path = os.path.join(settings.STORAGE_DIR, disk_filename)
            
            # Write bytes to disk
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            
            return {
                "success": True,
                "filename": disk_filename,
                "doc_hash": doc_hash,
                "url": f"{settings.STATIC_FILES_URL}/{disk_filename}",
                "public_id": disk_filename # Use filename as the unique identifier locally
            }
        except Exception as e:
            print(f"Local storage save failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_file_path(filename: str) -> str:
        """Get the absolute path to a file in the local storage."""
        return os.path.join(settings.STORAGE_DIR, filename)

    @staticmethod
    def list_files() -> list:
        """List all PDFs in the local storage directory."""
        if not os.path.exists(settings.STORAGE_DIR):
            return []
        
        files = []
        for f in os.listdir(settings.STORAGE_DIR):
            if f.endswith(".pdf"):
                files.append({
                    "public_id": f,
                    "filename": f,
                    "secure_url": f"{settings.STATIC_FILES_URL}/{f}"
                })
        return files

    @staticmethod
    def delete_file(filename: str) -> bool:
        """Delete a file from the local storage."""
        try:
            file_path = os.path.join(settings.STORAGE_DIR, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
        except Exception:
            return False

file_service = FileService()

import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime

# Initialize Cloudinary — load credentials from CLOUDINARY_URL env var
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dqrlgp532"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "615324293531574"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "qXpAse58Q7ipNuRXu7n59Sv2IqY"),
    secure=True,
)

class CloudinaryService:
    @staticmethod
    def upload_document(pdf_bytes, filename, metadata=None):
        """Upload a PDF to Cloudinary with metadata."""
        try:
            timestamp = int(datetime.now().timestamp())
            public_id = f"nyayasahaya/docs/{filename}_{timestamp}.pdf"
            
            result = cloudinary.uploader.upload(
                pdf_bytes,
                public_id=public_id,
                resource_type="raw", # Force raw to ensure consistent URL structure
                invalidate=True,
                tags=["nyayasahaya", "generated_doc"],
                context=metadata  # Context stores key-value pairs
            )
            return {
                "success": True,
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "doc_hash": result.get("signature") # Can use signature as a basic hash
            }
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def search_documents(tag="nyayasahaya"):
        """Search for documents in Cloudinary."""
        try:
            # Note: Search API requires configuration of indexed fields
            # For simplicity, we use the Admin API here
            results = cloudinary.api.resources(
                type="upload",
                prefix="nyayasahaya/docs/",
                resource_type="raw",
                context=True,
                tags=True
            )
            return results.get("resources", [])
        except Exception as e:
            print(f"Cloudinary search failed: {e}")
            return []

    @staticmethod
    def get_document_details(public_id):
        """Fetch full resource details for a specific public_id."""
        try:
            # Note: Resources API requires Admin API
            return cloudinary.api.resource(public_id, resource_type="raw", context=True, tags=True)
        except Exception as e:
            print(f"Cloudinary get details failed: {e}")
            return None

    @staticmethod
    def update_metadata(public_id, context_updates):
        """Update context (metadata) on a Cloudinary asset."""
        try:
            # Context is useful for searchable key-value pairs
            context_str = "|".join([f"{k}={v}" for k, v in context_updates.items()])
            cloudinary.uploader.add_context(context_str, [public_id], resource_type="raw")
            return True
        except Exception as e:
            print(f"Cloudinary metadata update failed: {e}")
            return False

cloudinary_service = CloudinaryService()

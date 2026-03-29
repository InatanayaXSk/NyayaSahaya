"""Check what documents exist in Cloudinary."""
from app.services.cloudinary_service import cloudinary_service

print("Searching for documents in Cloudinary...")
resources = cloudinary_service.search_documents(tag="nyayasahaya")

print(f"\nFound {len(resources)} resources:")
for r in resources:
    print(f"  - {r.get('public_id')}")
    print(f"    URL: {r.get('secure_url')}")
    print(f"    Created: {r.get('created_at')}")
    print()

"""Quick test to upload a file to Cloudinary."""
import os
import io
from app.services.cloudinary_service import cloudinary_service

# Create a simple test PDF (minimal valid PDF)
test_pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Cloudinary Test Upload!) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000359 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
434
%%EOF"""

print("Uploading test PDF to Cloudinary...")
result = cloudinary_service.upload_document(
    test_pdf_content,
    "test_upload.pdf",
    metadata={"test": "true", "purpose": "initial_test"}
)

print("\nResult:")
print(f"  Success: {result.get('success')}")
if result.get('success'):
    print(f"  URL: {result.get('url')}")
    print(f"  Public ID: {result.get('public_id')}")
    print(f"  Hash: {result.get('doc_hash')}")
else:
    print(f"  Error: {result.get('message')}")

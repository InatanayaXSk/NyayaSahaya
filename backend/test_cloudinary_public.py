"""Test Cloudinary upload with public access."""
import os
import cloudinary
import cloudinary.uploader
from datetime import datetime

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dqrlgp532"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "615324293531574"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "qXpAse58Q7ipNuRXu7n59Sv2IqY"),
    secure=True,
)

# Create a simple test PDF
test_pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Cloudinary Public Test!) Tj ET
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

timestamp = int(datetime.now().timestamp())
public_id = f"nyayasahaya/docs/public_test_{timestamp}.pdf"

print("Uploading with explicit public access...")
result = cloudinary.uploader.upload(
    test_pdf_content,
    public_id=public_id,
    resource_type="raw",
    invalidate=True,
    tags=["nyayasahaya", "public_test"],
    access_mode="public",  # Explicit public access
)

print(f"\nSuccess: {result.get('secure_url')}")
print(f"Public ID: {result.get('public_id')}")

# Test the URL directly
import urllib.request
try:
    response = urllib.request.urlopen(result.get('secure_url'))
    print(f"\nURL accessible! Size: {len(response.read())} bytes")
except Exception as e:
    print(f"\nURL still blocked: {e}")

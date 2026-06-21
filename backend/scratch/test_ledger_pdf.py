import asyncio
import os
import sys

# Add backend root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import DocumentLedger
from app.services.file_service import file_service
from app.services.pdf_stamper import stamp_pdf_with_verification
from app.services.ai_analyzer import ai_analyzer

async def test_pdf_flow():
    # 1. Create fake PDF bytes
    # A tiny 1-page valid PDF header/footer or simple text
    dummy_pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Length 44 >>\nstream\n"
        b"BT\n/F1 12 Tf\n72 712 Td\n(NyayaSahaya DB Storage Test) Tj\nET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000212 00000 n \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\n"
        b"startxref\n305\n%%EOF"
    )

    public_id = "test_ledger_flow_id"

    # Clean up any existing test document first
    async with AsyncSessionLocal() as session:
        await session.execute(
            DocumentLedger.__table__.delete().where(DocumentLedger.public_id == public_id)
        )
        await session.commit()

    print("[TEST] Step 1: Saving document metadata (but not disk file) & inserting into DB...")
    # This shouldn't write to disk since save_document is updated to not write
    save_res = file_service.save_document(dummy_pdf_bytes, "test_template")
    assert save_res["success"], "file_service.save_document failed"
    doc_hash = save_res["doc_hash"]

    async with AsyncSessionLocal() as session:
        doc = DocumentLedger(
            public_id=public_id,
            document_type="Affidavit",
            current_hash=doc_hash,
            owner_username="sudeep",
            signer_id="SYSTEM",
            pdf_data=dummy_pdf_bytes
        )
        session.add(doc)
        await session.commit()
    print("[TEST] Step 1 complete: Saved doc in DB.")

    # Check that no file was created on disk
    try:
        disk_path = file_service.get_file_path(public_id)
        print(f"[TEST] WARNING: get_file_path returned {disk_path}")
    except NotImplementedError:
        print("[TEST] Success: get_file_path raised NotImplementedError as expected.")

    print("[TEST] Step 2: Retrieving document from DB...")
    async with AsyncSessionLocal() as session:
        stmt = select(DocumentLedger).where(DocumentLedger.public_id == public_id)
        res = await session.execute(stmt)
        doc_db = res.scalar_one()
        assert doc_db.pdf_data == dummy_pdf_bytes, "Retrieved bytes do not match original bytes"
    print("[TEST] Step 2 complete: Retrieved matching PDF bytes.")

    print("[TEST] Step 3: Stamping document...")
    try:
        stamped_bytes = stamp_pdf_with_verification(doc_db.pdf_data, doc_db)
        assert stamped_bytes != doc_db.pdf_data, "Stamping did not modify bytes"
        assert len(stamped_bytes) > len(doc_db.pdf_data), "Stamped PDF bytes should be larger"
        print("[TEST] Step 3 complete: Successfully stamped PDF bytes.")
    except Exception as e:
        print(f"[TEST] Stamping failed: {e}")
        raise e

    print("[TEST] Step 4: Extracting text from DB using AI analyzer...")
    # This calls _get_local_text which fetches pdf_bytes from DB and extracts it
    async with AsyncSessionLocal() as session:
        text = await ai_analyzer._get_local_text(file_path="", public_id=public_id, db=session)
        print(f"[TEST] Extracted text: {repr(text)}")
        assert "NyayaSahaya" in text, "Extracted text did not contain keyword"
    print("[TEST] Step 4 complete: Successfully extracted text.")

    # Clean up test database entry
    async with AsyncSessionLocal() as session:
        await session.execute(
            DocumentLedger.__table__.delete().where(DocumentLedger.public_id == public_id)
        )
        await session.commit()
    print("[TEST] Cleanup complete. ALL DB PDF FLOW TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_pdf_flow())

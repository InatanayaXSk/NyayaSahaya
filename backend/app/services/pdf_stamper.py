import io
import os
from datetime import datetime
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

def draw_header_footer_stamp(status: str, tx_hash: str, doc_hash: str, width: float, height: float) -> io.BytesIO:
    """Create a 1-page transparent PDF containing the header/footer stamp."""
    stamp_io = io.BytesIO()
    c = canvas.Canvas(stamp_io, pagesize=(width, height))
    
    # Define colors and texts based on status
    if status == "sealed":
        primary_color = "#047857" # Green-700
        line_color = "#10B981" # Green-500
        text = f"🔒 NyayaSahaya Blockchain Verified | Tx: {tx_hash[:12]}..."
        footer_text = f"Verified Asset Ledger Hash: {doc_hash} | Scan QR code on receipt page to verify."
    elif status == "pending":
        primary_color = "#D97706" # Amber-600
        line_color = "#F59E0B" # Amber-500
        text = f"⏳ Sealing Pending | Awaiting Blockchain Confirmation | Tx: {tx_hash[:12]}..."
        footer_text = f"Verification in progress on Ethereum Sepolia. Tx: {tx_hash} | Ledger Hash: {doc_hash}"
    else:
        primary_color = "#B45309" # Amber-700
        line_color = "#F59E0B" # Amber-500
        text = "⚠️ DRAFT - NOT YET SEALED ON BLOCKCHAIN"
        footer_text = "This document is a local draft and has not been cryptographically verified on-chain."

    # Top Header Stamp
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(primary_color)
    c.drawString(40, height - 25, text)
    
    # Top Line
    c.setStrokeColor(line_color)
    c.setLineWidth(0.5)
    c.line(40, height - 30, width - 40, height - 30)
    
    # Bottom Footer Stamp
    c.setFont("Helvetica", 7)
    c.drawString(40, 25, footer_text)
    c.line(40, 32, width - 40, 32)
    
    c.save()
    stamp_io.seek(0)
    return stamp_io

def generate_receipt_page(doc, width: float, height: float, status: str = "sealed") -> io.BytesIO:
    """Generate a premium-style blockchain verification receipt page with QR code."""
    receipt_io = io.BytesIO()
    c = canvas.Canvas(receipt_io, pagesize=(width, height))
    
    # Page Title
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor("#1E293B") # Slate-800
    c.drawCentredString(width / 2, height - 60, "NYAYASAHAYA VAULT RECORD")
    
    c.setFont("Helvetica", 10)
    c.setFillColor("#64748B") # Slate-500
    c.drawCentredString(width / 2, height - 75, "Cryptographic Ledger Verification Receipt")
    
    # Status Badge based on status
    if status == "sealed":
        c.setStrokeColor("#10B981") # Green-500
        c.setFillColor("#E6F4EA") # Soft Green
        c.rect(width / 2 - 80, height - 115, 160, 25, fill=1, stroke=1)
        
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor("#047857") # Green-700
        c.drawCentredString(width / 2, height - 105, "🔒 SECURED & VERIFIED")
    else:
        c.setStrokeColor("#D97706") # Amber-600
        c.setFillColor("#FEF3C7") # Soft Amber
        c.rect(width / 2 - 80, height - 115, 160, 25, fill=1, stroke=1)
        
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor("#B45309") # Amber-700
        c.drawCentredString(width / 2, height - 105, "⏳ SEALING PENDING")
    
    # Main Box
    c.setStrokeColor("#E2E8F0") # Slate-200
    c.setFillColor("#F8FAFC") # Slate-50
    c.rect(40, height - 420, width - 80, 280, fill=1, stroke=1)
    
    # Table Content
    tx_hash = doc.eth_tx_hash or "N/A"
    doc_hash = doc.current_hash or "N/A"
    public_id = doc.public_id or "N/A"
    doc_type = doc.document_type or "N/A"
    timestamp_str = doc.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if doc.timestamp else "N/A"
    etherscan_url = f"https://sepolia.etherscan.io/tx/{tx_hash}"
    
    labels = [
        ("Document ID", public_id),
        ("Document Type", doc_type),
        ("File SHA-256", doc_hash),
        ("Sealing Date", timestamp_str),
        ("Blockchain Network", "Ethereum Sepolia Testnet (Chain ID 11155111)"),
        ("Transaction Hash", tx_hash),
        ("Verification URL", etherscan_url),
        ("Signature proof", doc.signature_data[:64] + "..." if doc.signature_data else "Authorized by Client & Lawyer via Biometric Dual-Auth")
    ]
    
    y = height - 160
    for label, val in labels:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor("#475569") # Slate-600
        c.drawString(60, y, label)
        
        c.setFont("Helvetica", 9)
        c.setFillColor("#1E293B") # Slate-800
        # Basic wrap for long values like hash
        if len(val) > 50:
            c.drawString(180, y, val[:50])
            c.drawString(180, y - 12, val[50:])
            y -= 25
        else:
            c.drawString(180, y, val)
            y -= 18

    # QR Code Section
    c.setStrokeColor("#E2E8F0")
    c.line(40, height - 440, width - 40, height - 440)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor("#1E293B")
    c.drawString(40, height - 470, "SCAN TO VERIFY TRANSACTION")
    
    c.setFont("Helvetica", 8)
    c.setFillColor("#64748B")
    c.drawString(40, height - 485, "Scan this QR code to view the cryptographic anchor receipt")
    c.drawString(40, height - 497, "on the public Ethereum blockchain explorer.")
    
    # Draw QR code
    qr_code = QrCodeWidget(value=etherscan_url, barWidth=100, barHeight=100)
    d = Drawing(100, 100)
    d.add(qr_code)
    renderPDF.draw(d, c, width - 140, height - 540)
    
    # Branding Footer
    c.setStrokeColor("#E2E8F0")
    c.line(40, 80, width - 40, 80)
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor("#475569")
    c.drawString(40, 60, "NyayaSahaya Ledger Verification Service")
    c.setFont("Helvetica", 7)
    c.setFillColor("#94A3B8")
    c.drawString(40, 48, "This verification receipt is cryptographically linked to the document body via its SHA-256 hash.")
    c.drawString(40, 38, "Do not separate this page from the primary document to maintain legal admissibility.")
    
    c.save()
    receipt_io.seek(0)
    return receipt_io

def stamp_pdf_with_verification(pdf_bytes: bytes, doc) -> bytes:
    """Stamp the original PDF with header/footer verification labels and append a receipt page if sealed or pending."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    
    # Determine the actual verification status
    status = "draft"
    tx_hash = doc.eth_tx_hash or ""
    doc_hash = doc.current_hash or "N/A"
    
    if doc.eth_tx_hash:
        if getattr(doc, "sealed", False):
            status = "sealed"
        else:
            # Check real-time on-chain status
            from app.services.eth_service import eth_service
            try:
                tx_status = eth_service.check_transaction_status(doc.eth_tx_hash)
                if tx_status is True:
                    status = "sealed"
                elif tx_status is False:
                    status = "draft"
                else:
                    status = "pending"
            except Exception:
                status = "pending"
                
    # Process each page
    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        
        # Draw header/footer stamp for this page size
        stamp_io = draw_header_footer_stamp(status, tx_hash, doc_hash, width, height)
        stamp_reader = PdfReader(stamp_io)
        stamp_page = stamp_reader.pages[0]
        
        # Merge stamp on top of the original content
        page.merge_page(stamp_page)
        writer.add_page(page)
        
    # Append a verification receipt page at the end if the document is sealed or pending
    if status in ("sealed", "pending"):
        # Determine size from the last page
        last_page = reader.pages[-1]
        width = float(last_page.mediabox.width)
        height = float(last_page.mediabox.height)
        
        receipt_io = generate_receipt_page(doc, width, height, status=status)
        receipt_reader = PdfReader(receipt_io)
        receipt_page = receipt_reader.pages[0]
        writer.add_page(receipt_page)
        
    output_io = io.BytesIO()
    writer.write(output_io)
    return output_io.getvalue()

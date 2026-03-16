"""Document Generation API — Ported from Streamlit doc_generator.py into headless REST."""
import os
import base64
from io import BytesIO
from fastapi import APIRouter
from fastapi.responses import Response
from ..config import settings

router = APIRouter()


def wrap_text(c, text, max_width):
    """Break text into lines that fit within max_width."""
    lines = []
    line = ""
    for word in text.split(" "):
        test_line = line + word + " "
        if c.stringWidth(test_line, "Helvetica", 12) < max_width:
            line = test_line
        else:
            if line:
                lines.append(line)
            line = word + " "
    if line:
        lines.append(line)
    return lines


def generate_pdf_from_template(input_data: dict, document_type: str) -> BytesIO | None:
    """Generate a PDF from a reference template, replacing placeholders with input_data."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except ImportError:
        return None

    reference_dir = settings.REFERENCE_DIR
    template_map = {
        "Sale Deed": "Sale Deed",
        "Will": "Will",
        "Power of Attorney": "Power of Attorney",
    }
    template_name = template_map.get(document_type)
    if not template_name:
        return None

    template_path = os.path.join(reference_dir, f"{template_name}.txt")
    if not os.path.exists(template_path):
        return None

    with open(template_path, "r") as f:
        template_text = f.read()

    # Replace placeholders
    for placeholder, value in input_data.items():
        template_text = template_text.replace(f"{{{placeholder}}}", value)

    # Generate PDF
    pdf_output = BytesIO()
    c = canvas.Canvas(pdf_output, pagesize=letter)
    width, height = letter
    margin = 40
    line_height = 14
    x_pos = margin
    y_pos = height - margin
    c.setFont("Helvetica", 12)

    lines = template_text.split("\n")
    for line in lines:
        wrapped = wrap_text(c, line, width - 2 * margin)
        for wl in wrapped:
            if y_pos <= margin:
                c.showPage()
                y_pos = height - margin
                c.setFont("Helvetica", 12)
            c.drawString(x_pos, y_pos, wl)
            y_pos -= line_height

    c.save()
    pdf_output.seek(0)
    return pdf_output


@router.post("/generate-doc")
async def generate_document(request: dict):
    """Generate a legal document PDF. Returns raw PDF bytes."""
    document_type = request.get("document_type", "")
    data = request.get("data", {})

    if not document_type:
        return {"success": False, "message": "document_type is required"}

    pdf = generate_pdf_from_template(data, document_type)
    if pdf:
        return Response(
            content=pdf.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{document_type}.pdf"'},
        )

    # If template not found or reportlab missing, return a mock/demo response
    return {
        "success": True,
        "message": f"Document '{document_type}' generated (demo mode — template or ReportLab not available)",
        "filename": f"{document_type.replace(' ', '_')}_demo.pdf",
        "data_received": len(data),
    }


@router.get("/document-types")
async def get_document_types():
    """Return available document types."""
    return {
        "types": [
            {
                "id": "rental_agreement",
                "name": "Rental Agreement",
                "icon": "home_work",
                "fields": ["lessor_name", "lessee_name", "property_address", "monthly_rent", "security_deposit", "notice_period"],
            },
            {
                "id": "sale_deed",
                "name": "Sale Deed",
                "icon": "description",
                "fields": ["seller_name", "purchaser_name", "property_details", "total_amount"],
            },
            {
                "id": "will",
                "name": "Will / Testament",
                "icon": "contract_edit",
                "fields": ["testator_name", "executor_name", "beneficiary_name", "assets"],
            },
            {
                "id": "power_of_attorney",
                "name": "Power of Attorney",
                "icon": "assignment_ind",
                "fields": ["executant_name", "attorney_name", "property_details"],
            },
        ]
    }

import os
import re
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.config import settings

def generate_document_from_template(document_type: str, data: dict) -> BytesIO | None:
    """Generate a final PDF based on reference template and dynamic data."""
    pdf_output = BytesIO()
    
    # Define PDF document layout
    c = canvas.Canvas(pdf_output, pagesize=letter)
    width, height = letter
    margin = 50
    line_height = 15
    y_pos = height - margin
    
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, y_pos, document_type.upper())
    y_pos -= 30
    c.setFont("Helvetica", 11)

    # Resolve template path
    # Frontend might send "Rental Agreement" but ID is "rental"
    # Mapping name to file
    mapping = {
        "Rental Agreement": "Rental Agreement",
        "Sale Deed": "Sale Deed",
        "Will / Testament": "Will Deed",
        "Power of Attorney": "Power of Attorney"
    }
    
    file_name = mapping.get(document_type, document_type)
    template_txt_path = os.path.join(settings.REFERENCE_DIR, f"{file_name}.txt")
    
    if not os.path.exists(template_txt_path):
        print(f"Template not found: {template_txt_path}")
        return None

    try:
        with open(template_txt_path, 'r', encoding='utf-8') as file:
            text = file.read()
    except Exception as e:
        print(f"Error reading template: {e}")
        return None

    # Dynamic Placeholder Replacement
    for placeholder, value in data.items():
        if value:
            # Simple string replacement for stability
            text = text.replace(placeholder, str(value))
                
    # Scrub remaining placeholders with legally appropriate blanks
    # Detects (Any Placeholder) or _______
    import re
    text = re.sub(r'\([^)]*\)', '________________', text)
    text = re.sub(r'_{3,}', '________________', text)
    
    # Drawing logic
    lines = text.split('\n')
    for line in lines:
        if not line.strip():
            y_pos -= line_height
            continue
            
        # Basic text wrapping
        words = line.split(' ')
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            if c.stringWidth(test_line, "Helvetica", 11) < (width - 2 * margin):
                current_line.append(word)
            else:
                if y_pos <= margin:
                    c.showPage()
                    y_pos = height - margin
                    c.setFont("Helvetica", 11)
                
                c.drawString(margin, y_pos, ' '.join(current_line))
                y_pos -= line_height
                current_line = [word]
        
        if current_line:
            if y_pos <= margin:
                c.showPage()
                y_pos = height - margin
                c.setFont("Helvetica", 11)
            c.drawString(margin, y_pos, ' '.join(current_line))
            y_pos -= line_height

    c.save()
    pdf_output.seek(0)
    
    return pdf_output

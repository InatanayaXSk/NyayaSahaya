import os
import re
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.config import settings

def generate_document_from_template(document_type: str, data: dict, custom_text: str = None) -> BytesIO | None:
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

    if custom_text:
        text = custom_text
    else:
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
        # Skip signature placeholders so we can handle them during drawing
        if "signature" in placeholder.lower():
            continue
        if value:
            # Simple string replacement for stability
            text = text.replace(placeholder, str(value))
                
    # Scrub remaining non-signature placeholders with legally appropriate blanks
    # Detects (Any Placeholder) or _______ on the same line
    import re
    all_placeholders = re.findall(r'\([^)\n]+\)', text)
    for p in all_placeholders:
        if "signature" not in p.lower():
            text = text.replace(p, "________________")
            
    text = re.sub(r'_{3,}', '________________', text)
    
    # Drawing logic
    lines = text.split('\n')
    for line in lines:
        if not line.strip():
            y_pos -= line_height
            continue
            
        # Check if this line contains any signature placeholder
        found_sig_placeholder = None
        found_sig_val = None
        for placeholder, value in data.items():
            if "signature" in placeholder.lower() and placeholder in line:
                if value and value.startswith("data:image/"):
                    found_sig_placeholder = placeholder
                    found_sig_val = value
                else:
                    # If signature not provided, replace with blank line
                    line = line.replace(placeholder, "________________")
                break
                
        if found_sig_placeholder:
            # Draw line with signature image
            parts = line.split(found_sig_placeholder, 1)
            prefix = parts[0]
            suffix = parts[1] if len(parts) > 1 else ""
            
            # Check page overflow
            if y_pos <= margin + 35:
                c.showPage()
                y_pos = height - margin
                c.setFont("Helvetica", 11)
                
            c.drawString(margin, y_pos, prefix)
            x_offset = c.stringWidth(prefix, "Helvetica", 11)
            
            # Draw signature image
            try:
                import base64
                from reportlab.lib.utils import ImageReader
                
                header, base64_data = found_sig_val.split(",", 1)
                img_data = base64.b64decode(base64_data)
                img_io = BytesIO(img_data)
                img_reader = ImageReader(img_io)
                
                # Draw the signature image
                c.drawImage(img_reader, margin + x_offset + 5, y_pos - 10, width=80, height=30, mask='auto')
            except Exception as e:
                print(f"Error drawing signature: {e}")
                c.drawString(margin + x_offset + 5, y_pos, "________________")
                
            # Draw suffix
            if suffix.strip():
                c.drawString(margin + x_offset + 90, y_pos, suffix)
                
            y_pos -= 35 # Give space for signature height
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

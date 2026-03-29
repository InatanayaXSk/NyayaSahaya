import fitz  # PyMuPDF
import os

TEMPLATE_DIR = r"e:\NyayaSahaya\backend\template"
files = [f for f in os.listdir(TEMPLATE_DIR) if f.endswith(".pdf")]

for file in files:
    path = os.path.join(TEMPLATE_DIR, file)
    print(f"\n--- Reading {file} ---")
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    print(text[:1000] + ("..." if len(text) > 1000 else ""))
    # Save the text to a temporary file to see the full content
    with open(os.path.join(TEMPLATE_DIR, file.replace(".pdf", ".txt")), "w", encoding="utf-8") as f:
        f.write(text)

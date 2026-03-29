import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
try:
    client = genai.Client()
    for m in client.models.list():
        if "embed" in m.name or "flash" in m.name:
            print(m.name)
except Exception as e:
    print("Error:", e)

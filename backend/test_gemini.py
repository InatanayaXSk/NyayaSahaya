import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
try:
    client = genai.Client()
    response = client.models.embed_content(
        model='text-embedding-004',
        contents="Hello world"
    )
    print("Embedding Success! Length:", len(response.embeddings[0].values))
    
    chat_response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents="Hi"
    )
    print("Chat Success:", chat_response.text)
except Exception as e:
    print("Error:", e)

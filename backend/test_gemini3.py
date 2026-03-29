import os
import faiss
import numpy as np
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()
query = "What is the penalty for breaching NDA?"

try:
    print("Embedding query...")
    response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=query
    )
    
    # Check what type `response.embeddings[0].values` is
    val = response.embeddings[0].values
    print("Values length:", len(val))
    
    query_vector = np.array([val], dtype='float32')
    print("Vector shape:", query_vector.shape)
    
    index = faiss.read_index("faiss_index/legal_index.faiss")
    D, I = index.search(query_vector, 3)
    print("Indices:", I)
    
    # Text Generation
    prompt = "Reply with 'Test Passed'."
    chat_response = client.models.generate_content(
        model='gemini-3-flash-preview',
        contents=prompt
    )
    print("Chat Response:", chat_response.text)
    
except Exception as e:
    import traceback
    traceback.print_exc()

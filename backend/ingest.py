import os
import json
import faiss
import numpy as np
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

def embed_texts(texts, client):
    vectors = []
    print(f"Embedding {len(texts)} chunks...")
    for text in texts:
        try:
            result = client.models.embed_content(
                model='gemini-embedding-001',
                contents=text
            )
            vectors.append(result.embeddings[0].values)
            time.sleep(4)  # To avoid 429 Free Tier Rate limit (15 req/min)
        except Exception as e:
            print(f"Error embedding text: {e}")
            # append zero vector as fallback with correct gemini-embedding-001 dimension
            vectors.append([0.0] * 3072)
            time.sleep(4)
            
    return np.array(vectors, dtype='float32')

def ingest():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in environment. Mocking the API for now.")
        # Create a mock client if there's no API key to allow the demo to run
        class MockResult:
            class MockEmbedding:
                values = list(np.random.rand(3072))
            embeddings = [MockEmbedding()]
        
        class MockModels:
            def embed_content(self, model, contents):
                return MockResult()
        
        class MockClient:
            models = MockModels()
            
        client = MockClient()
    else:
        client = genai.Client()

    data_path = os.path.join("data", "data.txt")
    if not os.path.exists(data_path):
        print(f"File {data_path} not found.")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Simple chunking by paragraph (double newline)
    chunks = [c.strip() for c in content.split('\n\n') if len(c.strip()) > 10]
    
    if not chunks:
        print("No content found to embed.")
        return

    vectors = embed_texts(chunks, client)
    
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)

    os.makedirs("faiss_index", exist_ok=True)
    faiss.write_index(index, "faiss_index/legal_index.faiss")
    
    with open("faiss_index/chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully ingested {len(chunks)} chunks into FAISS index with dimension {dimension}.")

if __name__ == "__main__":
    ingest()

import os
import json
import faiss
import numpy as np
import time
import requests
from dotenv import load_dotenv

load_dotenv()

from sentence_transformers import SentenceTransformer

# Load the local embedding model
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
print(f"Loading local embedding model: {EMBED_MODEL_NAME}...")
embedder = SentenceTransformer(EMBED_MODEL_NAME)

def embed_texts(texts):
    print(f"Embedding {len(texts)} chunks using local {EMBED_MODEL_NAME}...")
    try:
        # SentenceTransformers can batch encode efficiently
        embeddings = embedder.encode(texts, show_progress_bar=True)
        return np.array(embeddings, dtype='float32')
    except Exception as e:
        print(f"Error embedding texts: {e}")
        # fallback to 384 dims for all-MiniLM-L6-v2
        return np.zeros((len(texts), 384), dtype='float32')

def chunk_text(text, max_len=2000):
    chunks = []
    paragraphs = text.split('\n')
    current_chunk = ""
    for p in paragraphs:
        if len(current_chunk) + len(p) < max_len:
            current_chunk += p + '\n'
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            if len(p) > max_len:
                for i in range(0, len(p), max_len):
                    chunks.append(p[i:i+max_len])
                current_chunk = ""
            else:
                current_chunk = p + '\n'
    if current_chunk:
         chunks.append(current_chunk.strip())
    return chunks

def ingest():
    data_dir = "data"
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} not found.")
        return

    all_chunks = []
    
    # Iterate over all .txt files in the data directory
    files = [f for f in os.listdir(data_dir) if f.endswith(".txt")]
    print(f"Found {len(files)} text files: {files}")
    
    for filename in files:
        data_path = os.path.join(data_dir, filename)
        print(f"Processing {filename}...")
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple chunking by paragraph (double newline)
            initial_chunks = [c.strip() for c in content.split('\n\n') if len(c.strip()) > 10]
            
            for ic in initial_chunks:
                all_chunks.extend(chunk_text(ic, max_len=2000))
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not all_chunks:
        print("No content found to embed.")
        return

    vectors = embed_texts(all_chunks)
    
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)

    os.makedirs("faiss_index", exist_ok=True)
    faiss.write_index(index, "faiss_index/legal_index.faiss")
    
    with open("faiss_index/chunks.json", "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully ingested {len(all_chunks)} sub-chunks into FAISS index with dimension {dimension}.")

if __name__ == "__main__":
    ingest()

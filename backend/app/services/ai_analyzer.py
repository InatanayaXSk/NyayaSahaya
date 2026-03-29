"""AI Service for Document Analysis, Summarization, and Legal RAG."""
import os
import json
import faiss
import numpy as np
from google import genai
from app.config import settings

class AIAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client() if self.api_key else None
        self.index = None
        self.chunks = []
        self._load_faiss_index()

    def _load_faiss_index(self):
        try:
            # Paths relative to where uvicorn is running, usually backend folder
            index_path = "faiss_index/legal_index.faiss"
            chunks_path = "faiss_index/chunks.json"
            if os.path.exists(index_path) and os.path.exists(chunks_path):
                self.index = faiss.read_index(index_path)
                with open(chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                print("[LexNet] FAISS index loaded successfully.")
        except Exception as e:
            print(f"[LexNet] Failed to load FAISS index: {e}")

    def retrieval_qa(self, query: str) -> str:
        """RAG Q&A using Gemini and FAISS."""
        if not self.client or not self.index:
            return "Demo Mode: GEMINI_API_KEY or FAISS index not configured. RAG is disabled. This is a mock response."
            
        try:
            # Embed query
            response = self.client.models.embed_content(
                model='gemini-embedding-001',
                contents=query
            )
            query_vector = np.array([response.embeddings[0].values], dtype='float32')
            
            # Search FAISS
            k = 3
            D, I = self.index.search(query_vector, k)
            
            # Form context
            context_pieces = [self.chunks[i] for i in I[0] if i < len(self.chunks) and i != -1]
            context = "\n\n".join(context_pieces)
            
            prompt = f"""
You are LexNet AI, a specialized legal assistant for Indian law. 

CONTEXT INFO:
{context}

QUESTION:
{query}

Provide a structured, accurate response based on the context. If the answer is not in the context, use your general knowledge of Indian Law but state that it may not be in the direct repository.
"""
            chat_response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return chat_response.text
            
        except Exception as e:
            return f"Error during RAG analysis: {e}"

    def analyze_document(self, document_path: str) -> dict:
        """Upload to Gemini Files API and analyze risks/clauses."""
        if not self.client:
            return {"error": "Demo Mode: GEMINI_API_KEY not configured"}
            
        try:
            # Use File API
            sample_file = self.client.files.upload(file=document_path)
            
            prompt = "Analyze this legal document. Extract key clauses, obligations, and potential legal risks. Format as JSON with keys: 'summary', 'clauses' (list of strings), 'risks' (list of strings)."
            
            response = self.client.models.generate_content(
                model='gemini-2.5-flash', # use stable GA model
                contents=[sample_file, prompt]
            )
            
            text = response.text
            # Cleanup if it wraps in markdown
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            
            return json.loads(text)
        except Exception as e:
            return {"error": f"Failed to analyze document: {e}"}

    def explain_jargon(self, text: str) -> str:
        """Simplifies complex legal jargon."""
        if not self.client:
            return "Demo Mode: Simplification simulated without API key."
        
        try:
            prompt = f"Explain the following legal text in plain, simple English suitable for a layperson:\n\n{text}"
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error during simplification: {e}"

# Singleton instance
ai_analyzer = AIAnalyzer()

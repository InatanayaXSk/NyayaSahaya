"""AI Service for Document Analysis, Summarization, and Legal RAG."""
import os
import json
import time
import faiss
import requests
import tempfile
import numpy as np
from google import genai
from app.config import settings

class AIAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        # Valid 2.0-flash model ID
        self.model_id = "gemini-2.5-flash" 
        self.index = None
        self.chunks = []
        self.file_cache = {} # Mapping public_id -> Gemini File object
        self._load_faiss_index()

    def _load_faiss_index(self):
        try:
            index_path = "faiss_index/legal_index.faiss"
            chunks_path = "faiss_index/chunks.json"
            if os.path.exists(index_path) and os.path.exists(chunks_path):
                self.index = faiss.read_index(index_path)
                with open(chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                print("[LexNet] FAISS index loaded successfully.")
        except Exception as e:
            print(f"[LexNet] Failed to load FAISS index: {e}")

    def _call_gemini(self, contents, retries=2):
        """Wrapper for Gemini content generation with exponential backoff on 429."""
        if not self.client:
            return "ERROR_CONFIG: Gemini API client not initialized. Check your GEMINI_API_KEY."
            
        for attempt in range(retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=contents
                )
                return response.text
            except Exception as e:
                err_str = str(e)
                print(f"[LexNet] Gemini API error: {err_str}")
                
                # Check for rate limits / quota
                if any(x in err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "QUOTA"]):
                    if attempt < retries:
                        wait_time = (attempt + 1) * 5
                        print(f"[LexNet] Quota Hit. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    return "ERROR_THROTTLED: Neural Engine is currently at capacity. Please wait 30 seconds."
                
                # Check for auth errors
                if "401" in err_str or "API_KEY_INVALID" in err_str:
                    return "ERROR_AUTH: Invalid Gemini API Key. Please check your .env file."
                
                return f"ERROR_AI: {err_str}"
        
        return "ERROR_TIMEOUT: AI connection timed out after retries."

    def _get_gemini_file(self, public_id: str, url: str):
        """Download from Cloudinary and upload to Gemini File API if not cached."""
        if public_id in self.file_cache:
            return self.file_cache[public_id]

        if not self.client:
            return None

        try:
            print(f"[LexNet] Downloading from Cloudinary: {public_id}")
            response = requests.get(url)
            if response.status_code != 200:
                print(f"[LexNet] Cloudinary download failed (HTTP {response.status_code}): {url}")
                return f"ERROR_DOWNLOAD: Cloudinary asset inaccessible (HTTP {response.status_code})."

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            print(f"[LexNet] Uploading to Gemini File Context...")
            gemini_file = self.client.files.upload(file=tmp_path)
            
            # Simple health check for upload
            if not gemini_file or not hasattr(gemini_file, 'name'):
                 return "ERROR_UPLOAD: Gemini File API rejected the document."

            os.remove(tmp_path)
            self.file_cache[public_id] = gemini_file
            return gemini_file
        except Exception as e:
            print(f"[LexNet] Neural Sync failed: {e}")
            return f"ERROR_SYNC: {str(e)}"

    def retrieval_qa(self, query: str) -> str:
        """RAG Q&A using Gemini and FAISS (General Knowledge)."""
        if not self.client or not self.index:
            return "Demo Mode: RAG Index not configured."
            
        try:
            embed_resp = self.client.models.embed_content(
                model='gemini-embedding-001',
                contents=query
            )
            query_vector = np.array([embed_resp.embeddings[0].values], dtype='float32')
            
            # Search FAISS
            k = 3
            D, I = self.index.search(query_vector, k)
            
            context_pieces = [self.chunks[i] for i in I[0] if i < len(self.chunks) and i != -1]
            context = "\n\n".join(context_pieces)
            
            prompt = f"Context: {context}\nQuestion: {query}"
            return self._call_gemini(prompt)
        except Exception as e:
            return f"Error: {e}"

    def analyze_cloudinary_doc(self, public_id: str, url: str) -> dict:
        """Perform deep analysis with structured JSON extraction."""
        sync_result = self._get_gemini_file(public_id, url)
        if isinstance(sync_result, str) and "ERROR_" in sync_result:
            return {"error": sync_result}
            
        gemini_file = sync_result

        prompt = """
        Analyze this legal document. Provide a professional overview.
        Return ONLY valid JSON:
        {
            "document_name": "Friendly name",
            "summary": "2-3 paragraphs",
            "key_terms": [{"label": "...", "value": "...", "type": "financial|notice|term|other"}],
            "summary_items": [{"title": "...", "text": "...", "risk_level": "low|medium|high"}],
            "clauses": [{"section": "...", "title": "...", "excerpt": "...", "risk_assessment": "...", "suggestion": "..."}],
            "compliance_score": 0-100,
            "legal_conflicts": ["..."]
        }
        """
        raw_text = self._call_gemini([gemini_file, prompt])
        
        if "ERROR_" in raw_text:
            return {"error": raw_text}

        try:
            text = raw_text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception as e:
            return {"error": f"ERROR_PARSE: Result was not valid JSON. {str(e)}", "raw": raw_text[:300]}

    def chat_with_doc(self, public_id: str, url: str, question: str, history: list = None) -> str:
        """Contextual chat within a document."""
        sync_result = self._get_gemini_file(public_id, url)
        if isinstance(sync_result, str) and "ERROR_" in sync_result:
            return sync_result

        gemini_file = sync_result

        # Process history roles for Gemini (expects 'user' or 'model')
        formatted_history = []
        if history:
            for h in history:
                # Map 'ai' or 'assistant' to 'model'
                role = "model" if h.get("role") in ["ai", "assistant", "model"] else "user"
                formatted_history.append({
                    "role": role,
                    "parts": h.get("parts", [{"text": h.get("text", "")}])
                })

        # Build contents: [File, ...History, current_query]
        contents = [gemini_file]
        for msg in formatted_history:
            contents.append(msg)
        contents.append(f"Answer briefly based on the document: {question}")
        
        return self._call_gemini(contents)

    def explain_jargon(self, text: str) -> str:
        """Simplifies legal jargon."""
        prompt = f"Explain in plain English for a non-lawyer: {text}"
        return self._call_gemini(prompt)

# Singleton instance
ai_analyzer = AIAnalyzer()

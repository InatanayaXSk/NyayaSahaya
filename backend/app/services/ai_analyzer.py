"""AI Service for Document Analysis, Summarization, and Legal RAG via Local Ollama."""
import os
import json
import faiss
import tempfile
import httpx
import numpy as np
import PyPDF2
from docling.document_converter import DocumentConverter
from sqlalchemy import select, update
from app.models import DocumentLedger, DocumentAnalysis

class AIAnalyzer:
    def __init__(self):
        self.generation_model = "gemma-4-E4B" # Doesn't strictly matter for llama.cpp but good for logs
        self.embedding_model = "all-MiniLM-L6-v2"
        self.llama_base_url = "http://localhost:8080"
        self.index = None
        self.chunks = []
        self.file_cache = {} # Static in-memory cache public_id -> text
        self.converter = None # Lazy-loaded Singleton Docling Converter
        self.embedder = None # Lazy-loaded SentenceTransformer
        self.client = httpx.AsyncClient(base_url=self.llama_base_url, timeout=120.0)
        self.ANALYSIS_SCHEMA = {
            "document_name": "Legal Asset",
            "summary": "AI summary currently unavailable.",
            "key_terms": [],
            "summary_items": [],
            "clauses": [],
            "compliance_score": 0,
            "legal_conflicts": []
        }
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

    async def _call_llama_server(self, prompt: str, json_format: bool = False) -> str:
        url = "/v1/chat/completions"
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        if json_format:
            payload["response_format"] = {"type": "json_object"}
            
        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[LexNet] API Error: {e}")
            return f"ERROR_AI: {str(e)}"
            
    async def _call_llama_server_stream(self, prompt: str):
        url = "/v1/chat/completions"
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "stream": True
        }
        try:
            async with self.client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if delta.get("content"):
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield f"\nERROR: {str(e)}"

    def _init_embedder(self):
        if self.embedder is None:
            print(f"[LexNet] Initializing local embedding model ({self.embedding_model})...")
            from sentence_transformers import SentenceTransformer
            self.embedder = SentenceTransformer(self.embedding_model)
        return self.embedder

    def _init_converter(self):
        """Lazily initialize the heavy Docling AI model (2GB RAM)."""
        if self.converter is None:
            print("[LexNet] Initializing heavy Docling AI model (2GB RAM)...")
            self.converter = DocumentConverter()
        return self.converter

    def _get_pypdf2_text(self, file_path: str) -> str:
        """Fast, lightweight text extraction from PDF using standard rules (no AI)."""
        try:
            text = ""
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return text.strip()
        except Exception as e:
            print(f"[LexNet] PyPDF2 extraction failed: {e}")
            return ""

    async def _get_local_text(self, file_path: str, public_id: str, db=None) -> str:
        """Hierarchical text extraction: DB Cache -> PyPDF2 (Fast) -> Docling (AI)."""
        if public_id in self.file_cache:
            return self.file_cache[public_id]

        if not os.path.exists(file_path):
            return f"ERROR_FILE_NOT_FOUND: {file_path}"

        # 1. Check PostgreSQL Cache
        if db:
            print(f"[LexNet] Checking DB cache for {public_id}...")
            from sqlalchemy import select
            stmt = select(DocumentLedger.extracted_text).where(DocumentLedger.public_id == public_id)
            res = await db.execute(stmt)
            cached_text = res.scalar_one_or_none()
            if cached_text:
                print(f"[LexNet] DB cache HIT for {public_id}")
                self.file_cache[public_id] = cached_text
                return cached_text
            print(f"[LexNet] DB cache MISS for {public_id}")

        # 2. Try PyPDF2 (Lighter/Fast)
        print(f"[LexNet] Attempting fast PyPDF2 extraction for {public_id}...")
        fast_text = self._get_pypdf2_text(file_path)
        if len(fast_text) > 100: # Enough for metadata/analysis
            print(f"[LexNet] PyPDF2 found {len(fast_text)} chars. Using fast path.")
            # Cache it back to DB if session provided
            if db:
                from sqlalchemy import update
                await db.execute(update(DocumentLedger).where(DocumentLedger.public_id == public_id).values(extracted_text=fast_text))
                await db.commit()
            self.file_cache[public_id] = fast_text
            return fast_text

        # 3. Last Resort: Docling (AI/Heavy - 2GB RAM)
        try:
            print(f"[LexNet] FALLBACK: Running heavy Docling AI extraction for {public_id}...")
            converter = self._init_converter()
            result = converter.convert(file_path)
            text = result.document.export_to_markdown()
            
            text = text.strip()[:15000] # Limit context
            print(f"[LexNet] Docling extracted {len(text)} characters.")
            
            if len(text) < 50:
                self.file_cache[public_id] = "ERROR_NO_CONTENT: Image-only scan detected. Please upload a readable PDF."
                return self.file_cache[public_id]
            
            # Save to Cache & DB
            self.file_cache[public_id] = text
            if db:
                from sqlalchemy import update
                await db.execute(update(DocumentLedger).where(DocumentLedger.public_id == public_id).values(extracted_text=text))
                await db.commit()
            return text
        except Exception as e:
            print(f"[LexNet] Deep AI parsing failed: {e}")
            return f"ERROR_PARSING: {str(e)}"

    async def retrieval_qa_stream(self, query: str):
        """RAG Q&A using Ollama and FAISS (General Knowledge) with Streaming."""
        if not self.index:
            yield "Demo Mode: RAG Index not configured."
            return
            
        try:
            embedder = self._init_embedder()
            embedding = embedder.encode(query)
            query_vector = np.array([embedding], dtype='float32')
            
            k = 3
            D, I = self.index.search(query_vector, k)
            
            context_pieces = [self.chunks[i] for i in I[0] if i < len(self.chunks) and i != -1]
            context = "\n\n".join(context_pieces)
            
            prompt = f"""You are a knowledgeable legal assistant specializing in Indian law. 
Context from our database: 
{context}

User Question: {query}

Instructions: Answer the user's question comprehensively. Use the provided context where relevant. If the context does not contain the answer (e.g., for IPC laws while context is Civil Procedure), use your general knowledge of Indian law to provide a helpful response. Do not explicitly say 'Based on the provided text' if you do so."""
            async for chunk in self._call_llama_server_stream(prompt):
                yield chunk
        except Exception as e:
            yield f"Error: {e}"

    async def analyze_document(self, file_path: str, public_id: str = "temp", db=None) -> dict:
        """Perform deep analysis on a local file, with persistence and smart re-analysis."""
        # 1. Check DB for already processed analysis
        ledger_doc = None
        if db:
            from sqlalchemy.orm import selectinload
            stmt = select(DocumentLedger).options(selectinload(DocumentLedger.analysis)).where(DocumentLedger.public_id == public_id)
            res = await db.execute(stmt)
            ledger_doc = res.scalar_one_or_none()
            
            if ledger_doc and ledger_doc.analysis:
                cached_data = ledger_doc.analysis.analysis_data
                # SMART RE-ANALYSIS: Only HIT if we have a summary AND clauses.
                # If we have a summary but 0 clauses, the AI likely missed the main task.
                if len(cached_data.get("clauses", [])) > 0 and len(cached_data.get("summary", "")) > 100:
                    print(f"[LexNet] DB cache HIT for Analysis: {public_id}")
                    return cached_data
                print(f"[LexNet] Cache exists but is INCOMPLETE (0 clauses or short summary). Re-analyzing {public_id}...")

        # 2. Extract text (uses text cache/PyPDF2 fallback)
        text_context = await self._get_local_text(file_path, public_id, db=db)
        if "ERROR_" in text_context:
            return {"error": text_context}

        prompt = f"""
        Analyze the following legal document and provide a professional overview.
        Document Context:
        {text_context}
        
        Return ONLY valid JSON with this exact structure:
        {{
            "document_name": "Friendly name",
            "summary": "2-3 paragraphs",
            "key_terms": [{{"label": "...", "value": "...", "type": "financial|notice|term|other"}}],
            "summary_items": [{{"title": "...", "text": "...", "risk_level": "low|medium|high"}}],
            "clauses": [{{"section": "...", "title": "...", "excerpt": "...", "risk_assessment": "...", "suggestion": "..."}}],
            "compliance_score": 85,
            "legal_conflicts": ["..."]
        }}
        """
        raw_text = await self._call_llama_server(prompt, json_format=True)
        
        if "ERROR_" in raw_text:
            return {"error": raw_text}

        try:
            # 3. Robust JSON Extraction (Find first '{' and last '}')
            import re
            json_match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
            if json_match:
                raw_text = json_match.group(1)
            
            ai_data = json.loads(raw_text)
            
            # 4. Schema Enforcement: Merge with defaults to prevent frontend errors
            analysis_dict = {**self.ANALYSIS_SCHEMA, **ai_data}
            
            # 5. Persist to DB (UPSERT logic)
            if db and ledger_doc:
                print(f"[LexNet] Saving/Updating Analysis in DB for {public_id}")
                if ledger_doc.analysis:
                    ledger_doc.analysis.analysis_data = analysis_dict
                else:
                    new_analysis = DocumentAnalysis(
                        document_id=ledger_doc.id,
                        analysis_data=analysis_dict
                    )
                    db.add(new_analysis)
                await db.commit()
                
            return analysis_dict
        except Exception as e:
            # Even on failure, return a valid SCHEMA result with the error embedded
            error_msg = f"ERROR_PARSE: {str(e)}"
            print(f"[LexNet] JSON Parsing Failed: {error_msg}")
            return {**self.ANALYSIS_SCHEMA, "document_name": "SCAN_FAILURE", "summary": error_msg}

    async def chat_with_doc_stream(self, file_path: str, public_id: str, question: str, history: list = None, db=None):
        """Contextual chat within a local document using streaming."""
        text_context = await self._get_local_text(file_path, public_id, db=db)
        if "ERROR_" in text_context:
            yield text_context
            return

        formatted_history = ""
        if history:
            for h in history:
                role = "AI" if h.get("role") in ["ai", "assistant", "model", "bot"] else "User"
                text = h.get("text", "")
                if not text and "parts" in h:
                    text = h["parts"][0].get("text", "")
                formatted_history += f"{role}: {text}\n"

        prompt = f"""
        You are a legal assistant. Answer the user's question based on the document text.
        Document Text:
        {text_context}
        
        Chat History:
        {formatted_history}
        
        User Question: {question}
        Answer:"""
        
        async for chunk in self._call_llama_server_stream(prompt):
            yield chunk

    async def explain_jargon_stream(self, text: str):
        """Simplifies legal jargon."""
        prompt = f"Explain the following legal text in plain English for a non-lawyer. Be concise:\n{text}"
        async for chunk in self._call_llama_server_stream(prompt):
            yield chunk

# Singleton instance
ai_analyzer = AIAnalyzer()

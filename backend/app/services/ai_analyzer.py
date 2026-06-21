"""AI Service for Document Analysis, Summarization, and Legal RAG via Local Ollama."""
import os
import json
import re
import math
import tempfile
import httpx
import PyPDF2
import fitz
from sqlalchemy import select, update
from app.config import settings
from app.models import DocumentLedger, DocumentAnalysis

class SimpleRetriever:
    def __init__(self, chunks: list[str]):
        self.chunks = chunks
        self.doc_count = len(chunks)
        self.docs = []
        self.df = {}
        for chunk in chunks:
            tokens = self._tokenize(chunk)
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            self.docs.append((chunk, tf, len(tokens)))
            for t in tf:
                self.df[t] = self.df.get(t, 0) + 1
        
        self.idf = {}
        for t, count in self.df.items():
            # BM25-style IDF formula
            self.idf[t] = math.log((self.doc_count - count + 0.5) / (count + 0.5) + 1.0)
            
        self.avg_doc_len = sum(d[2] for d in self.docs) / max(1, self.doc_count)
        self.k1 = 1.5
        self.b = 0.75

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r'[a-z0-9]+', text.lower())

    def search(self, query: str, k: int = 3) -> list[str]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return self.chunks[:k]
            
        scores = []
        for chunk, tf, doc_len in self.docs:
            score = 0.0
            for t in query_tokens:
                if t in tf:
                    idf_val = self.idf.get(t, 0)
                    tf_val = tf[t]
                    numerator = tf_val * (self.k1 + 1)
                    denominator = tf_val + self.k1 * (1 - self.b + self.b * (doc_len / self.avg_doc_len))
                    score += idf_val * (numerator / denominator)
            scores.append((score, chunk))
            
        scores.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in scores[:k]]

class AIAnalyzer:
    def __init__(self):
        self.generation_model = settings.OPENROUTER_MODEL
        self.openrouter_api_key = settings.OPENROUTER_API_KEY
        self.retriever = None
        self.file_cache = {} # Static in-memory cache public_id -> text
        
        headers = {
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "LexNet AI",
        }
        if self.openrouter_api_key and self.openrouter_api_key.strip():
            headers["Authorization"] = f"Bearer {self.openrouter_api_key.strip()}"
        else:
            print("[LexNet] WARNING: OPENROUTER_API_KEY is not set. OpenRouter completions will fail.")
            
        self.client = httpx.AsyncClient(base_url="https://openrouter.ai/api/v1/", headers=headers, timeout=120.0)
        self.ANALYSIS_SCHEMA = {
            "document_name": "Legal Asset",
            "summary": "AI summary currently unavailable.",
            "key_terms": [],
            "summary_items": [],
            "clauses": [],
            "compliance_score": 0,
            "legal_conflicts": []
        }
        self._init_retriever()

    def _init_retriever(self):
        try:
            chunks_path = "faiss_index/chunks.json"
            if os.path.exists(chunks_path):
                with open(chunks_path, "r", encoding="utf-8") as f:
                    chunks = json.load(f)
                self.retriever = SimpleRetriever(chunks)
                print("[LexNet] BM25 retriever initialized successfully.")
            else:
                print("[LexNet] chunks.json not found, retriever not initialized.")
        except Exception as e:
            print(f"[LexNet] Failed to initialize retriever: {e}")


    async def _save_analysis_data(self, db, ledger_doc, update_dict: dict) -> None:
        """Safely save or update DocumentAnalysis in a way that avoids IntegrityError and race conditions."""
        if not db or not ledger_doc:
            return

        # Perform a fresh query to get the existing analysis
        stmt = select(DocumentAnalysis).where(DocumentAnalysis.document_id == ledger_doc.id)
        res = await db.execute(stmt)
        existing_analysis = res.scalar_one_or_none()

        if existing_analysis:
            # Merge existing data with new update_dict
            current_data = dict(existing_analysis.analysis_data or {})
            merged_data = {**self.ANALYSIS_SCHEMA, **current_data, **update_dict}
            existing_analysis.analysis_data = merged_data
        else:
            merged_data = {**self.ANALYSIS_SCHEMA, **update_dict}
            new_analysis = DocumentAnalysis(
                document_id=ledger_doc.id,
                analysis_data=merged_data
            )
            db.add(new_analysis)

        try:
            await db.commit()
        except Exception as e:
            # If a unique violation or other commit error happens, rollback to keep session healthy
            await db.rollback()
            print(f"[LexNet] DB commit failed during analysis save: {e}. Retrying update...")
            # Retry by fetching again and updating
            stmt = select(DocumentAnalysis).where(DocumentAnalysis.document_id == ledger_doc.id)
            res = await db.execute(stmt)
            existing_analysis = res.scalar_one_or_none()
            if existing_analysis:
                current_data = dict(existing_analysis.analysis_data or {})
                merged_data = {**self.ANALYSIS_SCHEMA, **current_data, **update_dict}
                existing_analysis.analysis_data = merged_data
                try:
                    await db.commit()
                except Exception as retry_e:
                    await db.rollback()
                    print(f"[LexNet] Retry of analysis save failed: {retry_e}")
                    raise retry_e
            else:
                print(f"[LexNet] Retry failed: analysis record still not found after rollback.")
                raise e

    async def _call_llama_server(self, prompt: str, json_format: bool = False) -> str:
        url = "chat/completions"
        payload = {
            "model": self.generation_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        if json_format:
            payload["response_format"] = {"type": "json_object"}
            
        debug_path = "ai_debug.log"
        with open(debug_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n--- SYNC CALL START: {self.generation_model} ---\n")
            f.write(f"PROMPT: {prompt[:500]}...\n")
            f.flush()

        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            
            with open(debug_path, "a", encoding="utf-8") as f:
                f.write(f"RESPONSE: {content[:500]}...\n")
                f.write("--- SYNC CALL DONE ---\n")
                f.flush()
                
            return content
        except Exception as e:
            with open(debug_path, "a", encoding="utf-8") as f:
                f.write(f"SYNC CALL ERROR: {str(e)}\n")
                f.flush()
            print(f"[LexNet] API Error: {e}")
            return f"ERROR_AI: {str(e)}"
            
    async def _call_llama_server_stream(self, prompt: str):
        url = "chat/completions"
        payload = {
            "model": self.generation_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True
        }
        
        # DEBUG: Log initiation
        debug_path = "ai_debug.log"
        with open(debug_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n--- STREAM START: {self.generation_model} ---\n")
            f.write(f"PROMPT: {prompt[:500]}...\n")
            f.flush()

        in_thought = False # Local state for this generator call

        try:
            async with self.client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        with open(debug_path, "a", encoding="utf-8") as f:
                            f.write(f"RAW: {line}\n")
                            f.flush()
                            
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                with open(debug_path, "a", encoding="utf-8") as f:
                                    f.write("--- STREAM DONE ---\n")
                                    f.flush()
                                break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    
                                    # Handle Reasoning Tokens (Thinking)
                                    reasoning = delta.get("reasoning_content")
                                    if reasoning:
                                        if not in_thought:
                                            in_thought = True
                                            yield "<thought>\n"
                                        yield reasoning
                                        continue
                                    
                                    # Handle Content Tokens (Answer)
                                    content = delta.get("content")
                                    if content:
                                        # If we were in thought, close it
                                        if in_thought:
                                            in_thought = False
                                            yield "\n</thought>\n\n"
                                        yield content
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            with open(debug_path, "a", encoding="utf-8") as f:
                f.write(f"STREAM ERROR: {str(e)}\n")
                f.flush()
            yield f"\nERROR: {str(e)}"

    def _get_pymupdf_text(self, file_path: str) -> str:
        """Fast and robust text extraction using PyMuPDF (fitz)."""
        try:
            text = ""
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() or ""
            return text.strip()
        except Exception as e:
            print(f"[LexNet] PyMuPDF extraction failed: {e}")
            return ""

    def _get_pymupdf_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """Fast and robust text extraction using PyMuPDF (fitz) from bytes."""
        try:
            text = ""
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text() or ""
            return text.strip()
        except Exception as e:
            print(f"[LexNet] PyMuPDF bytes extraction failed: {e}")
            return ""

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

    def _get_pypdf2_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """Fast, lightweight text extraction from PDF using standard rules (no AI) from bytes."""
        import io
        try:
            text = ""
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                text += page.extract_text() or ""
            return text.strip()
        except Exception as e:
            print(f"[LexNet] PyPDF2 bytes extraction failed: {e}")
            return ""

    async def _get_local_text(self, file_path: str, public_id: str, db=None, pdf_bytes: bytes = None) -> str:
        """Hierarchical text extraction: DB Cache -> PyMuPDF -> PyPDF2."""
        if public_id in self.file_cache:
            return self.file_cache[public_id]

        # 1. Check PostgreSQL Cache
        if db:
            print(f"[LexNet] Checking DB cache for {public_id}...")
            from sqlalchemy import select
            stmt = select(DocumentLedger.extracted_text).where(DocumentLedger.public_id == public_id)
            res = await db.execute(stmt)
            cached_text = res.scalar_one_or_none()
            if cached_text and not cached_text.startswith("ERROR_NO_CONTENT"):
                print(f"[LexNet] DB cache HIT for {public_id}")
                self.file_cache[public_id] = cached_text
                return cached_text
            print(f"[LexNet] DB cache MISS or error state for {public_id}")

        # If pdf_bytes not provided but db is available, try to fetch pdf_bytes from db
        if not pdf_bytes and db:
            from sqlalchemy import select
            stmt = select(DocumentLedger.pdf_data).where(DocumentLedger.public_id == public_id)
            res = await db.execute(stmt)
            pdf_bytes = res.scalar_one_or_none()

        if pdf_bytes:
            # 2. Try PyMuPDF (Primary/Fast & Robust) from bytes
            print(f"[LexNet] Attempting PyMuPDF extraction from bytes for {public_id}...")
            text = self._get_pymupdf_text_from_bytes(pdf_bytes)

            # 3. Fallback to PyPDF2 if PyMuPDF returned no text
            if len(text.strip()) == 0:
                print(f"[LexNet] PyMuPDF returned no text. Falling back to PyPDF2 from bytes for {public_id}...")
                text = self._get_pypdf2_text_from_bytes(pdf_bytes)
        else:
            # Fallback to file path if bytes not found
            if not os.path.exists(file_path):
                return f"ERROR_FILE_NOT_FOUND: {file_path}"

            # 2. Try PyMuPDF (Primary/Fast & Robust) from file path
            print(f"[LexNet] Attempting PyMuPDF extraction from file for {public_id}...")
            text = self._get_pymupdf_text(file_path)

            # 3. Fallback to PyPDF2 if PyMuPDF returned no text
            if len(text.strip()) == 0:
                print(f"[LexNet] PyMuPDF returned no text. Falling back to PyPDF2 from file for {public_id}...")
                text = self._get_pypdf2_text(file_path)

        text = text.strip()[:15000] # Limit context

        if len(text) == 0:
            self.file_cache[public_id] = "ERROR_NO_CONTENT: Image-only scan detected. Please upload a readable PDF."
            return self.file_cache[public_id]

        # Save to Cache & DB
        self.file_cache[public_id] = text
        if db:
            from sqlalchemy import update
            await db.execute(update(DocumentLedger).where(DocumentLedger.public_id == public_id).values(extracted_text=text))
            await db.commit()
        return text

    async def retrieval_qa_stream(self, query: str, web_search: bool = False):
        """RAG Q&A using Ollama and FAISS (General Knowledge) with Streaming."""
        if web_search:
            prompt = f"""You are a knowledgeable legal assistant specializing in Indian law. 
            Use Google Search to find landmark legal cases, precedents, or judgments in India relevant to the user's question. 
            Answer the question comprehensively and cite similar cases or court decisions.
            
            User Question: {query}
            Answer:"""
            async for chunk in self._gemini_search_stream(prompt):
                yield chunk
            return

        if not self.retriever:
            yield "Demo Mode: RAG Index not configured."
            return
            
        try:
            context_pieces = self.retriever.search(query, k=3)
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


    async def analyze_document(self, file_path: str, public_id: str = "temp", db=None, pdf_bytes: bytes = None) -> dict:
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
        text_context = await self._get_local_text(file_path, public_id, db=db, pdf_bytes=pdf_bytes)
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
            
            # 4. Persist to DB safely (UPSERT logic via helper)
            if db and ledger_doc:
                print(f"[LexNet] Saving/Updating Analysis in DB for {public_id}")
                await self._save_analysis_data(db, ledger_doc, ai_data)
                
                # Fetch the latest saved state to return to client
                stmt = select(DocumentAnalysis).where(DocumentAnalysis.document_id == ledger_doc.id)
                res = await db.execute(stmt)
                existing_analysis = res.scalar_one_or_none()
                if existing_analysis:
                    return existing_analysis.analysis_data

            return {**self.ANALYSIS_SCHEMA, **ai_data}
        except Exception as e:
            # Even on failure, return a valid SCHEMA result with the error embedded
            error_msg = f"ERROR_PARSE: {str(e)}"
            print(f"[LexNet] JSON Parsing Failed: {error_msg}")
            return {**self.ANALYSIS_SCHEMA, "document_name": "SCAN_FAILURE", "summary": error_msg}

    async def chat_with_doc_stream(self, file_path: str, public_id: str, question: str, history: list = None, db=None, web_search: bool = False):
        """Contextual chat within a local document using streaming."""
        text_context = await self._get_local_text(file_path, public_id, db=db)
        if "ERROR_" in text_context:
            yield text_context
            return

        if web_search:
            formatted_history = ""
            if history:
                for h in history:
                    role = "AI" if h.get("role") in ["ai", "assistant", "model", "bot"] else "User"
                    text = h.get("text", "")
                    if not text and "parts" in h:
                        text = h["parts"][0].get("text", "")
                    formatted_history += f"{role}: {text}\n"

            prompt = f"""
            You are a legal assistant specializing in Indian law. Answer the user's question based on the document text provided below and Google Search results.
            We need to find similar cases, precedents, or landmark judgments relevant to this document and the user's question.
            
            Document Text:
            {text_context[:3000]}
            
            Chat History:
            {formatted_history}
            
            User Question: {question}
            Answer:"""
            async for chunk in self._gemini_search_stream(prompt):
                yield chunk
            return

        similar_cases_context = ""
        if db:
            try:
                from sqlalchemy.orm import selectinload
                stmt = select(DocumentLedger).options(selectinload(DocumentLedger.analysis)).where(DocumentLedger.public_id == public_id)
                res = await db.execute(stmt)
                doc_ledger = res.scalar_one_or_none()
                if doc_ledger and doc_ledger.analysis:
                    analysis_data = doc_ledger.analysis.analysis_data or {}
                    similar_cases = analysis_data.get("similar_cases", [])
                    if similar_cases:
                        similar_cases_context = "\n\nSimilar Cases & Web Search Context (Feedback Loop):\n"
                        for i, case in enumerate(similar_cases, 1):
                            similar_cases_context += f"Case {i}: {case.get('title')}\nLink: {case.get('link')}\nSummary: {case.get('summary')}\n\n"
            except Exception as e:
                print(f"[LexNet] Error extracting similar cases for prompt feedback loop: {e}")

        formatted_history = ""
        if history:
            for h in history:
                role = "AI" if h.get("role") in ["ai", "assistant", "model", "bot"] else "User"
                text = h.get("text", "")
                if not text and "parts" in h:
                    text = h["parts"][0].get("text", "")
                formatted_history += f"{role}: {text}\n"

        prompt = f"""
        You are a legal assistant. Answer the user's question based on the document text and the web search feedback context provided.
        Document Text:
        {text_context}
        {similar_cases_context}
        
        Chat History:
        {formatted_history}
        
        User Question: {question}
        Answer:"""
        
        async for chunk in self._call_llama_server_stream(prompt):
            yield chunk

    async def _gemini_search_stream(self, prompt: str):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            yield "Error: GEMINI_API_KEY is not set."
            return

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?key={api_key}&alt=sse"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "tools": [
                {
                    "google_search": {}
                }
            ]
        }

        # Debug logging
        debug_path = "ai_debug.log"
        with open(debug_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n--- GEMINI STREAM START ---\n")
            f.write(f"PROMPT: {prompt[:500]}...\n")
            f.flush()

        grounding_chunks = []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            try:
                                chunk_data = json.loads(line[6:])
                                if "candidates" in chunk_data and len(chunk_data["candidates"]) > 0:
                                    candidate = chunk_data["candidates"][0]
                                    
                                    # Extract generated text
                                    if "content" in candidate and "parts" in candidate["content"]:
                                        for part in candidate["content"]["parts"]:
                                            if "text" in part:
                                                yield part["text"]
                                                
                                    # Extract grounding metadata
                                    if "groundingMetadata" in candidate:
                                        metadata = candidate["groundingMetadata"]
                                        if "groundingChunks" in metadata:
                                            for chunk in metadata["groundingChunks"]:
                                                if "web" in chunk:
                                                    uri = chunk["web"].get("uri")
                                                    title = chunk["web"].get("title")
                                                    if uri and uri not in [c[0] for c in grounding_chunks]:
                                                        grounding_chunks.append((uri, title or "Web Source"))
                            except Exception as parse_err:
                                print(f"[LexNet] SSE parse error: {parse_err}")
                                continue
        except Exception as e:
            with open(debug_path, "a", encoding="utf-8") as f:
                f.write(f"GEMINI STREAM ERROR: {str(e)}\n")
                f.flush()
            yield f"\nERROR: {str(e)}"
            return

        if grounding_chunks:
            yield "\n\n---\n#### 🌐 Google Search Precedents & Sources:\n"
            for uri, title in grounding_chunks[:5]:
                yield f"- [{title}]({uri})\n"
                
        with open(debug_path, "a", encoding="utf-8") as f:
            f.write("--- GEMINI STREAM DONE ---\n")
            f.flush()

    async def get_similar_cases(self, file_path: str, public_id: str, document_type: str, force: bool = False, db=None) -> list:
        """Fetch cached similar cases or generate them using Google Search via Gemini 2.5 Flash Lite."""
        import re
        # 1. Try to fetch from DB first
        ledger_doc = None
        if db:
            from sqlalchemy.orm import selectinload
            stmt = select(DocumentLedger).options(selectinload(DocumentLedger.analysis)).where(DocumentLedger.public_id == public_id)
            res = await db.execute(stmt)
            ledger_doc = res.scalar_one_or_none()
            
            if ledger_doc and ledger_doc.analysis and not force:
                cached_data = ledger_doc.analysis.analysis_data or {}
                if "similar_cases" in cached_data and len(cached_data["similar_cases"]) > 0:
                    print(f"[LexNet] similar_cases cache HIT for {public_id}")
                    return cached_data["similar_cases"]
        
        # 2. Extract text context
        text_context = await self._get_local_text(file_path, public_id, db=db)
        if "ERROR_" in text_context:
            return []

        # Use Gemini 2.5 Flash Lite with Google Search tool to fetch similar cases
        # Use Gemini 2.5 Flash Lite with Google Search tool to fetch similar cases
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
 
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={api_key}"
        prompt = f"""
        Search Google for landmark legal cases, precedents, or landlord-tenant disputes in India (such as subletting without consent, eviction, or notice periods) relevant to this {document_type} content:
        ---
        {text_context[:3000]}
        ---
        
        Identify 3 relevant cases.
        Return your response ONLY as a valid JSON object with this exact structure:
        {{
            "similar_cases": [
                {{
                    "title": "Precise name of the case (e.g. Mohori Bibee v. Dharmodas Ghose)",
                    "link": "The exact direct URL of the case or article from the search results",
                    "summary": "A 2-3 sentence summary of the case facts, legal issue, and what was decided."
                }}
            ]
        }}
        Do not include any markdown styling like ```json. Just raw JSON.
        """
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "tools": [
                {
                    "google_search": {}
                }
            ]
        }
 
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        print(f"[LexNet] Gemini returned no candidates. Full response: {data}")
                        raise KeyError("No candidates returned in Gemini response.")
                    
                    candidate = candidates[0]
                    content = candidate.get("content", {})
                    parts = content.get("parts", [])
                    if not parts:
                        print(f"[LexNet] Gemini candidate missing parts. Candidate: {candidate}")
                        # Check if there is a finish reason like SAFETY
                        finish_reason = candidate.get("finishReason")
                        if finish_reason:
                            raise RuntimeError(f"Gemini generation blocked. Finish reason: {finish_reason}")
                        raise KeyError("parts")
                    
                    raw_text = parts[0].get("text", "")
                    if not raw_text:
                        print(f"[LexNet] Gemini candidate part has no text. Part: {parts[0]}")
                        raise KeyError("text")
                    
                    # Robust JSON extraction
                    json_match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
                    if json_match:
                        raw_text = json_match.group(1)
                    
                    parsed = json.loads(raw_text)
                    similar_cases = parsed.get("similar_cases", [])
                    
                    # 7. Persist similar_cases back to DB
                    if db and ledger_doc and similar_cases:
                        print(f"[LexNet] Saving similar cases to DB for {public_id}")
                        await self._save_analysis_data(db, ledger_doc, {"similar_cases": similar_cases})
                        
                    return similar_cases
                else:
                    raise RuntimeError(f"Gemini API error (Status {response.status_code}): {response.text}")
        except Exception as e:
            print(f"[LexNet] Gemini similar cases exception: {e}. Attempting OpenRouter/FAISS fallback...")
            try:
                # 1. Retrieve RAG context if retriever is available
                context = ""
                if self.retriever:
                    try:
                        context_pieces = self.retriever.search(text_context[:1000], k=3)
                        context = "\n\n".join(context_pieces)
                    except Exception as ret_exc:
                        print(f"[LexNet] Fallback retriever search failed: {ret_exc}")


                # 2. Formulate fallback prompt
                fallback_prompt = f"""
                You are a legal assistant specializing in Indian law. 
                Based on your knowledge of Indian law and the following context/document details, suggest 3 relevant landmark legal cases, precedents, or landlord-tenant disputes in India.

                Document Type: {document_type}
                Document Content:
                ---
                {text_context[:2000]}
                ---
                """
                if context:
                    fallback_prompt += f"\nRelevant legal knowledge context:\n{context}\n"
                
                fallback_prompt += """
                Identify 3 relevant legal cases/precedents.
                Return your response ONLY as a valid JSON object with this exact structure:
                {
                    "similar_cases": [
                        {
                            "title": "Precise name of the case (e.g. Mohori Bibee v. Dharmodas Ghose)",
                            "link": "https://indiankanoon.org/doc/... or similar link",
                            "summary": "A 2-3 sentence summary of the case facts, legal issue, and what was decided."
                        }
                    ]
                }
                Do not include any markdown styling like ```json. Just raw JSON.
                """
                
                raw_text = await self._call_llama_server(fallback_prompt, json_format=True)
                
                # Robust JSON extraction
                json_match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
                if json_match:
                    raw_text = json_match.group(1)
                
                parsed = json.loads(raw_text)
                similar_cases = parsed.get("similar_cases", [])
                
                # 3. Persist fallback similar_cases back to DB safely
                if db and ledger_doc and similar_cases:
                    print(f"[LexNet] Saving fallback similar cases to DB for {public_id}")
                    await self._save_analysis_data(db, ledger_doc, {"similar_cases": similar_cases})
                    
                return similar_cases
            except Exception as fallback_exc:
                print(f"[LexNet] Fallback similar cases generation failed: {fallback_exc}")
                raise e


    async def explain_jargon_stream(self, text: str):
        """Simplifies legal jargon."""
        prompt = f"Explain the following legal text in plain English for a non-lawyer. Be concise:\n{text}"
        async for chunk in self._call_llama_server_stream(prompt):
            yield chunk

# Singleton instance
ai_analyzer = AIAnalyzer()

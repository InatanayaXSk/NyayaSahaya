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
        url = "/v1/chat/completions"
        payload = {
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
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("[LexNet] GEMINI_API_KEY not found in env, falling back to empty cases.")
            return []

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
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    
                    # Robust JSON extraction
                    json_match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
                    if json_match:
                        raw_text = json_match.group(1)
                    
                    parsed = json.loads(raw_text)
                    similar_cases = parsed.get("similar_cases", [])
                    
                    # 7. Persist similar_cases back to DB
                    if db and ledger_doc and similar_cases:
                        print(f"[LexNet] Saving similar cases to DB for {public_id}")
                        if ledger_doc.analysis:
                            analysis_dict = dict(ledger_doc.analysis.analysis_data or {})
                            analysis_dict["similar_cases"] = similar_cases
                            ledger_doc.analysis.analysis_data = analysis_dict
                        else:
                            analysis_dict = {**self.ANALYSIS_SCHEMA, "similar_cases": similar_cases}
                            new_analysis = DocumentAnalysis(
                                document_id=ledger_doc.id,
                                analysis_data=analysis_dict
                            )
                            db.add(new_analysis)
                        await db.commit()
                        
                    return similar_cases
                else:
                    print(f"[LexNet] Gemini similar cases API call failed: {response.text}")
        except Exception as e:
            print(f"[LexNet] Gemini similar cases exception: {e}")

        return []

    async def explain_jargon_stream(self, text: str):
        """Simplifies legal jargon."""
        prompt = f"Explain the following legal text in plain English for a non-lawyer. Be concise:\n{text}"
        async for chunk in self._call_llama_server_stream(prompt):
            yield chunk

# Singleton instance
ai_analyzer = AIAnalyzer()

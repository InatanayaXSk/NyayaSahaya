"""Chat API utilizing Local Ollama RAG via Streaming."""
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.route_users import get_current_user
from app.models import User, DocumentLedger
from app.database import get_db
from app.services.ai_analyzer import ai_analyzer

router = APIRouter()

def is_legal_query(text: str) -> bool:
    legal_keywords = {
        "general": ["law", "legal", "court", "rights", "case", "lawyer", "advocate", "clause", "agreement", "contract"],
        "criminal": ["ipc", "crpc", "crime", "arrest", "bail", "police", "criminal", "fir", "vail"],
        "civil": ["property", "marriage", "divorce", "inheritance", "tenant", "rent", "lease"],
        "procedural": ["petition", "filing", "evidence", "witness", "complaint", "affidavit"],
        "action": ["summarize", "analyze", "explain", "review", "check"]
    }
    text_lower = text.lower()
    return any(kw in text_lower for kws in legal_keywords.values() for kw in kws) or "document" in text_lower

def handle_general_responses(question: str, skip_legal_check: bool = False):
    patterns = {
        "greetings": {
            "patterns": [r"\b(hi|hello|hey|good\s+(?:morning|evening|afternoon))\b"],
            "response": "Hello! I'm LexNet AI, your legal assistant. How can I help you today?",
        },
        "farewells": {
            "patterns": [r"\b(bye|goodbye|farewell|thank\s+you)\b"],
            "response": "Goodbye! Feel free to return for any legal assistance.",
        },
        "identity": {
            "patterns": [r"\b(who\s+are\s+you|what\s+are\s+you)\b"],
            "response": "I'm LexNet AI, a specialized legal assistant for Indian law powered by llama.cpp and the LexNet platform.",
        },
        "capabilities": {
            "patterns": [r"\b(what\s+can\s+you\s+do|how\s+can\s+you\s+help)\b"],
            "response": "I specialize in Indian law and can help with legal advice, document analysis, and case law. Ask me anything!",
        },
    }
    q_lower = question.lower()
    for _cat, data in patterns.items():
        for pat in data["patterns"]:
            if re.search(pat, q_lower):
                return data["response"]
    
    if not skip_legal_check and not is_legal_query(question):
        return "I specialize in Indian legal matters. Could you please ask me a law-related question?"
    return None

@router.post("/chat")
async def chat(request: dict, current_user: User = Depends(get_current_user)):
    question = request.get("question", "").strip()
    if not question:
        async def err_stream(): yield "Error: Question is required"
        return StreamingResponse(err_stream(), media_type="text/plain")

    # Check for general/non-legal responses
    general = handle_general_responses(question)
    if general:
        async def static_stream(text): yield text
        return StreamingResponse(static_stream(general), media_type="text/plain")

    # Answer using the streaming service
    generator = ai_analyzer.retrieval_qa_stream(question)
    return StreamingResponse(generator, media_type="text/plain")

@router.post("/chat/document")
async def chat_document(request: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Chat with the context of a specific Cloudinary document (Streaming) with SQL-based RBAC."""
    question = request.get("question", "").strip()
    public_id = request.get("public_id")
    url = request.get("url")
    history = request.get("history", [])

    if not question or not public_id or not url:
         async def err_stream(): yield "Error: question, public_id, and url are required"
         return StreamingResponse(err_stream(), media_type="text/plain")

    # Check for general/non-legal responses first
    general = handle_general_responses(question, skip_legal_check=True)
    if general:
        async def static_stream(text): yield text
        return StreamingResponse(static_stream(general), media_type="text/plain")

    # SQL-based RBAC
    stmt = select(DocumentLedger).where(
        (DocumentLedger.public_id == public_id) & 
        ((DocumentLedger.owner_username == current_user.username) | 
         (DocumentLedger.shared_with.any(User.username == current_user.username)))
    )
    result = await db.execute(stmt)
    ledger_entry = result.scalar_one_or_none()

    if not ledger_entry:
         async def err_stream(): yield "Error: You are not authorized to chat with this document or it doesn't exist"
         return StreamingResponse(err_stream(), media_type="text/plain")

    from app.services.file_service import file_service
    file_path = file_service.get_file_path(public_id)
    generator = ai_analyzer.chat_with_doc_stream(file_path, public_id, question, history, db=db)
    return StreamingResponse(generator, media_type="text/plain")

@router.post("/analyze-doc")
async def analyze_document(request: dict, db: AsyncSession = Depends(get_db)):
    """Endpoint to analyze a generated or uploaded document."""
    path = request.get("file_path")
    public_id = request.get("public_id") # Should be provided for better caching
    if not path:
        return {"error": "file_path is required"}
        
    analysis_result = await ai_analyzer.analyze_document(path, public_id=public_id, db=db)
    return analysis_result

@router.post("/explain")
async def explain_jargon(request: dict):
    """Summarizes/Explains a legal jargon string (Streaming)."""
    text = request.get("text")
    if not text:
        async def err_stream(): yield "Error: text is required"
        return StreamingResponse(err_stream(), media_type="text/plain")
        
    generator = ai_analyzer.explain_jargon_stream(text)
    return StreamingResponse(generator, media_type="text/plain")

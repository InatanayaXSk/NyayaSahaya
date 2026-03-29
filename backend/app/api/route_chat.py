"""Chat API utilizing Gemini RAG."""
import re
from fastapi import APIRouter
from app.services.ai_analyzer import ai_analyzer

router = APIRouter()

def is_legal_query(text: str) -> bool:
    legal_keywords = {
        "general": ["law", "legal", "court", "rights", "case", "lawyer", "advocate"],
        "criminal": ["ipc", "crpc", "crime", "arrest", "bail", "police", "criminal"],
        "civil": ["contract", "property", "marriage", "divorce", "inheritance"],
        "procedural": ["petition", "filing", "evidence", "witness", "complaint"],
    }
    text_lower = text.lower()
    return any(kw in text_lower for kws in legal_keywords.values() for kw in kws)

def handle_general_responses(question: str):
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
            "response": "I'm LexNet AI, a specialized legal assistant for Indian law powered by Gemini RAG and the LexNet platform.",
        },
        "capabilities": {
            "patterns": [r"\b(what\s+can\s+you\s+do|how\s+can\s+you\s+help)\b"],
            "response": "I specialize in Indian law and can help with legal advice, procedures, rights, and case law. Ask me anything!",
        },
    }
    q_lower = question.lower()
    for _cat, data in patterns.items():
        for pat in data["patterns"]:
            if re.search(pat, q_lower):
                return data["response"]
    if not is_legal_query(question):
        return "I specialize in Indian legal matters. Could you please ask me a law-related question?"
    return None

@router.post("/chat")
async def chat(request: dict):
    question = request.get("question", "").strip()
    if not question:
        return {"error": "Question is required"}

    # Check for general/non-legal responses
    general = handle_general_responses(question)
    if general:
        return {"answer": general}

    # Answer using the Gemini RAG service
    answer = ai_analyzer.retrieval_qa(question)
    
    return {"answer": answer}

@router.post("/analyze-doc")
async def analyze_document(request: dict):
    """Endpoint to analyze a generated or uploaded document."""
    path = request.get("file_path")
    if not path:
        return {"error": "file_path is required"}
        
    analysis_result = ai_analyzer.analyze_document(path)
    return analysis_result

@router.post("/explain")
async def explain_jargon(request: dict):
    """Summarizes/Explains a legal jargon string."""
    text = request.get("text")
    if not text:
        return {"error": "text is required"}
        
    explanation = ai_analyzer.explain_jargon(text)
    return {"explanation": explanation}

"""Chat API — Ported from NyayaSahaya-bot FAISS + LangChain chatbot."""
import re
import os
from fastapi import APIRouter

router = APIRouter()

# --- Attempt to load the FAISS-based QA chain ---
qa_chain = None
try:
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain.prompts import PromptTemplate
    from langchain.chains import ConversationalRetrievalChain
    from langchain_together import Together
    from langchain.memory import ConversationBufferWindowMemory
    from ..config import settings

    if settings.TOGETHER_API_KEY and os.path.exists(settings.FAISS_DB_PATH):
        embeddings = HuggingFaceEmbeddings(model_name="law-ai/InLegalBERT")
        db = FAISS.load_local(settings.FAISS_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        db_retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 3})

        legal_prompt_template = """
You are LexNet AI, a specialized legal assistant for Indian law. Maintain a professional yet approachable tone.

CONTEXT: {context}
CHAT HISTORY: {chat_history}
QUESTION: {question}

If the query is not legal in nature, respond naturally without the formal structure.

For legal queries, provide a structured response:
1. Applicable Law and Section
2. Legal Consequences
3. Steps to Take
4. Additional Support
5. Key Reminder

Keep responses clear, factual, and focused on Indian law.
ANSWER:
"""
        legal_prompt = PromptTemplate(
            template=legal_prompt_template,
            input_variables=["context", "question", "chat_history"],
        )
        memory = ConversationBufferWindowMemory(k=3, memory_key="chat_history", return_messages=True)
        llm = Together(
            model="mistralai/Mixtral-8x22B-Instruct-v0.1",
            temperature=0.5,
            max_tokens=1024,
            together_api_key=settings.TOGETHER_API_KEY,
        )
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=db_retriever,
            memory=memory,
            combine_docs_chain_kwargs={"prompt": legal_prompt},
        )
        print("[LexNet] FAISS QA chain loaded successfully.")
    else:
        print("[LexNet] FAISS/Together not configured — using mock chatbot.")
except Exception as e:
    print(f"[LexNet] Could not load QA chain: {e} — using mock chatbot.")


# --- Helper functions (ported from original bot) ---
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
            "response": "I'm LexNet AI, a specialized legal assistant for Indian law powered by RAG and the LexNet platform.",
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

    # Use FAISS chain if available, otherwise mock
    if qa_chain:
        try:
            result = qa_chain.invoke({"question": question})
            answer = result.get("answer", "").strip()
            if answer:
                return {"answer": answer}
        except Exception:
            pass

    # Fallback mock response
    return {
        "answer": (
            f"**LexNet AI Analysis** (Demo Mode)\n\n"
            f"Regarding your query about *\"{question[:80]}...\"*:\n\n"
            f"1. **Applicable Law**: This falls under provisions of Indian law. "
            f"A comprehensive RAG-based analysis would be provided when the full FAISS index is connected.\n\n"
            f"2. **Recommendation**: Please connect the FAISS vector database and Together API key "
            f"for production-quality legal analysis.\n\n"
            f"*Note: This is a demonstration response. Configure `TOGETHER_API_KEY` and the FAISS index for full functionality.*"
        )
    }

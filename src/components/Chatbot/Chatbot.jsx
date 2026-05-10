import React, { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../../utils/api";

import ReactMarkdown from 'react-markdown';
import { useAuth } from "../../context/AuthContext";
import { useClient } from "../../context/ClientContext";

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);
  const { token } = useAuth();
  const { activeDocument } = useClient();
  const [useContext, setUseContext] = useState(true);

  const [similarCases, setSimilarCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [showCases, setShowCases] = useState(false);

  const fetchSimilarCases = async (force = false) => {
    if (!activeDocument) return;
    setLoadingCases(true);
    try {
      const url = `${BASE_URL}/api/documents/similar-cases?public_id=${encodeURIComponent(activeDocument.public_id)}${force ? '&force=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Precedents scan failed");
      const data = await response.json();
      setSimilarCases(data.similar_cases || []);
    } catch (err) {
      console.error("Failed to fetch similar cases:", err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    if (activeDocument && useContext) {
      fetchSimilarCases();
    } else {
      setSimilarCases([]);
    }
  }, [activeDocument, useContext, token]);



  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isThinking]);

  const sendMessage = async () => {
    if (input.trim()) {
      const currentInput = input;
      setMessages(prev => [...prev, { sender: "user", text: currentInput }]);
      setInput("");
      setIsThinking(true);
      setError(null);
      
      setMessages(prev => [...prev, { sender: "bot", text: "" }]);

      try {
        const isDocChat = activeDocument && useContext;
        const endpoint = isDocChat ? '/api/chat/document' : '/api/chat';
        
        const payload = { 
          question: currentInput,
          history: messages.slice(-6).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text
          }))
        };

        if (isDocChat) {
          payload.public_id = activeDocument.public_id;
          payload.url = activeDocument.secure_url || activeDocument.url;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            if (isThinking) setIsThinking(false);
            setIsTyping(true);
            const chunkValue = decoder.decode(value, { stream: true });
            
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsgIndex = updated.length - 1;
              const lastMsg = { ...updated[lastMsgIndex] };
              lastMsg.text += chunkValue;
              updated[lastMsgIndex] = lastMsg;
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = { ...updated[updated.length - 1] };
          if (lastMsg.text === "") {
             lastMsg.text = "An error occurred. Please try again later.";
          }
          updated[updated.length - 1] = lastMsg;
          return updated;
        });
        setError(err.message);
      } finally {
        setIsThinking(false);
        setIsTyping(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/60 backdrop-blur-xl border-l border-border relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
            </div>
            <div>
            <h3 className="font-black text-[11px] text-text-base uppercase tracking-widest leading-tight">LexAI Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeDocument && useContext ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                  {activeDocument && useContext ? `Context: ${activeDocument.public_id.split('/').pop()}` : 'General Intelligence'}
                </span>
            </div>
            </div>
        </div>
        {activeDocument && (
          <button 
            onClick={() => setUseContext(!useContext)}
            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${
              useContext 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
                : 'bg-surface border-border text-text-muted hover:bg-primary/10'
            }`}
          >
            {useContext ? 'Context ON' : 'Context OFF'}
          </button>
        )}
      </div>
      
      {/* Similar Cases Precedents Drawer */}
      {activeDocument && useContext && (
        <div className="border-b border-border bg-surface/30 backdrop-blur-md transition-all">
          <div 
            onClick={() => setShowCases(!showCases)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface/50 transition-all select-none"
          >
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-sm ${loadingCases ? 'animate-spin text-primary' : 'text-rose-500'}`}>
                {loadingCases ? 'sync' : 'travel_explore'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">
                {loadingCases ? 'Scanning Precedents from Web...' : `Web Precedents (${similarCases.length})`}
              </span>
              {!loadingCases && similarCases.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {similarCases.length > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchSimilarCases(true);
                  }}
                  disabled={loadingCases}
                  className="p-1 rounded hover:bg-primary/10 text-text-muted hover:text-primary transition-all flex items-center"
                  title="Force re-scan precedents"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                </button>
              )}
              <span className="material-symbols-outlined text-text-muted text-sm transform transition-transform duration-300">
                {showCases ? 'expand_less' : 'expand_more'}
              </span>
            </div>
          </div>

          {showCases && (
            <div className="p-4 pt-1 border-t border-border/40 bg-background/40 max-h-[220px] overflow-y-auto custom-scrollbar space-y-3 animate-in slide-in-from-top-1 duration-200">
              {loadingCases && similarCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-6 h-6 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-2"></div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Analyzing context & scanning web...</p>
                </div>
              ) : similarCases.length === 0 ? (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-text-muted text-2xl mb-1.5">find_in_page</span>
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">No precedents found on the web.</p>
                </div>
              ) : (
                similarCases.map((caseItem, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-surface/50 border border-border/60 hover:border-rose-500/30 hover:bg-surface/80 hover:shadow-lg hover:shadow-rose-500/5 transition-all group relative overflow-hidden text-left"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="text-[11px] font-black text-text-base leading-snug group-hover:text-primary transition-colors pr-4">
                        {caseItem.title}
                      </h4>
                      {caseItem.link && (
                        <a 
                          href={caseItem.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-surface border border-border hover:border-primary/40 hover:bg-primary/10 text-text-muted hover:text-primary transition-all flex items-center shrink-0"
                          title="View Case Judgment"
                        >
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                      {caseItem.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] pointer-events-none"></div>

        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-50 select-none">
                <span className="material-symbols-outlined text-4xl mb-3 text-primary">forum</span>
                <p className="text-[10px] uppercase font-black tracking-widest text-text-muted leading-relaxed">Start a discussion with<br/>LexNet AI</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          return (
            <div key={index} className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {!isUser && msg.text && (
                 <span className="text-[8px] font-black uppercase tracking-widest text-primary ml-1">LexAI</span>
              )}
              {isUser && (
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mr-1">You</span>
              )}
              {msg.text && (
                <div className={`max-w-[85%] p-3.5 text-xs font-medium leading-relaxed relative ${
                    isUser 
                      ? 'bg-primary text-slate-900 rounded-2xl rounded-tr-sm shadow-lg shadow-primary/20'
                      : 'bg-surface/80 backdrop-blur-md border border-border text-text-base rounded-2xl rounded-tl-sm shadow-xl'
                }`}>
                  <div className={`prose prose-invert prose-xs max-w-none ${!isUser ? 'markdown-bot-msg' : ''}`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Render Thought Process if present */}
                        {msg.text.includes('<thought>') && (
                          <div className="bg-background/50 border-l-2 border-primary/30 p-3 rounded-r-xl mb-4">
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                                <span className="material-symbols-outlined text-[14px]">psychology</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">Neural Reasoning</span>
                            </div>
                            <div className="text-[11px] text-text-muted italic leading-relaxed opacity-80">
                                {msg.text.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/)?.[1] || ""}
                            </div>
                          </div>
                        )}
                        
                        {/* Render Final Answer */}
                        <ReactMarkdown 
                          components={{
                            p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="pl-1">{children}</li>,
                            strong: ({children}) => <strong className="text-primary font-black">{children}</strong>,
                            code: ({children}) => <code className="bg-black/30 px-1.5 py-0.5 rounded text-primary font-mono text-[10px]">{children}</code>
                          }}
                        >
                          {msg.text.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim()}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isThinking && (
           <div className="flex items-center gap-2 px-4 py-3 bg-surface/80 backdrop-blur-md border border-border rounded-2xl rounded-tl-sm w-fit animate-in fade-in slide-in-from-bottom-2">
              <span className="material-symbols-outlined text-sm text-primary animate-spin">sync</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted animate-pulse">Scanning DB...</span>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full bg-surface border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-xs text-text-base rounded-xl py-3 pl-4 pr-12 placeholder-text-muted/50 transition-all outline-none"
            placeholder="Query the LexNet database..."
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking || isTyping}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
              !input.trim() || isThinking || isTyping 
                ? 'text-slate-700' 
                : 'text-primary hover:bg-primary/20'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">send_spark</span>
          </button>
        </div>
        {error && <div className="mt-2 text-[9px] uppercase tracking-widest text-rose-500 font-black px-1 text-center">{error}</div>}
      </div>
    </div>
  );
}

export default Chatbot;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import { BASE_URL as API_BASE } from '../utils/api';


const suggestedQuestions = ['Analyze rent increase clauses', 'Summarize termination terms', 'Liability limits explanation'];

export default function LegalSummaryPage() {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Welcome to the Neural Legal Hub. Select a document from the vault on the left to initiate a deep-context summary and interactive review.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    const [input, setInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            fetchDocuments();
        }
    }, [token]);

    const fetchDocuments = async () => {
        if (!token) return;
        try {
            const resp = await fetch(`${API_BASE}/api/documents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await resp.json();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        }
    };

    const handleSelectDoc = async (doc) => {
        setSelectedDoc(doc);
        setLoading(true);
        setAnalysis(null);
        setError(null);
        try {
            const resp = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ public_id: doc.public_id, url: doc.secure_url || doc.url })
            });
            const data = await resp.json();
            if (data.error) {
                setError(data.error);
                const errMsg = data.error.includes("THROTTLED") 
                    ? "Neural Engine cooling down. Please wait 30 seconds." 
                    : `Neural Sync Failed: ${data.error}`;
                setMessages(prev => [
                    ...prev,
                    { role: 'ai', text: `⚠️ ${errMsg}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
            } else {
                setAnalysis(data);
                setMessages(prev => [
                    ...prev,
                    { role: 'ai', text: `Deep Analysis for "${doc.public_id.split('/').pop()}" is complete. I've extracted the summary and critical terms. You can now ask specific questions about this document.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
            }
        } catch (err) {
            console.error("Analysis failed:", err);
            setError(`CONEX_FAIL: ${err.message || 'Check connection'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedDoc || isChatting) return;

        const userMsg = { role: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsChatting(true);

        try {
            const resp = await fetch(`${API_BASE}/api/chat/document`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: input,
                    public_id: selectedDoc.public_id,
                    url: selectedDoc.secure_url || selectedDoc.url,
                    history: messages.slice(-4).map(m => ({ role: m.role, parts: [{ text: m.text }] }))
                })
            });
            const data = await resp.json();
            let aiText = data.answer || "Error processing request.";
            if (aiText.includes("ERROR_THROTTLED")) {
                aiText = "🕒 Neural Engine is cooling down due to high traffic. Please retry in 30 seconds.";
            } else if (aiText.includes("ERROR_AI")) {
                aiText = `⚠️ AI Service Error: ${aiText.replace('ERROR_AI:', '').trim()}`;
            }
            
            const aiMsg = { role: 'ai', text: aiText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error("Chat failed:", err);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="bg-background text-text-base min-h-[calc(100vh-56px)] flex">
            {/* Left Sidebar: Document Vault */}
            <div className="w-80 border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col shrink-0">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Document Vault</h2>
                    <span className="material-symbols-outlined text-primary text-sm">inventory_2</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {documents.map((doc, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSelectDoc(doc)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                                selectedDoc?.public_id === doc.public_id 
                                    ? 'bg-primary border-primary shadow-lg shadow-primary/20' 
                                    : 'bg-surface border-border hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className={`material-symbols-outlined text-xl ${selectedDoc?.public_id === doc.public_id ? 'text-slate-900' : 'text-primary'}`}>description</span>
                                <div className="min-w-0">
                                    <p className={`text-xs font-black truncate uppercase tracking-wider ${selectedDoc?.public_id === doc.public_id ? 'text-slate-900' : 'text-text-base'}`}>
                                        {doc.public_id.split('/').pop()}
                                    </p>
                                    <p className={`text-[9px] uppercase tracking-widest mt-0.5 ${selectedDoc?.public_id === doc.public_id ? 'text-slate-900/60' : 'text-text-muted'}`}>
                                        ID: {doc.public_id.slice(0, 8)}...
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Analysis & Chat */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -mt-40 -mr-40"></div>
                
                {selectedDoc ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-border bg-surface/30 backdrop-blur-md flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    <span className="material-symbols-outlined text-primary">analytics</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black uppercase tracking-tight">{selectedDoc.public_id.split('/').pop()}</h1>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Neural Sync Active • Context Optimized</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all">
                                    <span className="material-symbols-outlined text-sm">download</span> Export Report
                                </button>
                            </div>
                        </div>

                        {/* Analysis Grid */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-5xl mx-auto space-y-8">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
                                            <span className="material-symbols-outlined text-6xl text-primary animate-spin">sync</span>
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Neural Summary...</p>
                                    </div>
                                ) : analysis ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Summary Card */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 relative group hover:border-primary/20 transition-all">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">format_quote</span> Executive Summary
                                            </h3>
                                            <p className="text-sm text-text-base leading-relaxed mb-6 font-medium">
                                                {analysis.summary || "Summary data processing error."}
                                            </p>
                                            <div className="h-px bg-border w-full mb-6"></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-background/50 rounded-2xl border border-border">
                                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Tone Analysis</p>
                                                    <p className="text-xs font-bold text-text-base uppercase tracking-wider">Formal/Legal</p>
                                                </div>
                                                <div className="p-4 bg-background/50 rounded-2xl border border-border">
                                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Complexity</p>
                                                    <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">High (Level 8)</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Critical Terms */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 relative group hover:border-primary/20 transition-all">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">priority_high</span> Critical Clauses
                                            </h3>
                                            <div className="space-y-4">
                                                {analysis.summary_items?.slice(0, 3).map((item, i) => (
                                                    <div key={i} className="p-4 bg-background/50 border border-border rounded-2xl hover:bg-primary/5 transition-all">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-text-base">{item.title}</p>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.risk_level === 'high' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                                {item.risk_level} Risk
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-text-muted leading-relaxed">{item.text}</p>
                                                    </div>
                                                )) || <p className="text-xs text-text-muted italic">No critical terms identified.</p>}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                        <span className="material-symbols-outlined text-5xl mb-4">document_scanner</span>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Analysis Trigger</p>
                                    </div>
                                )}

                                {/* Chat Interface inside main area */}
                                <div className="bg-surface border border-border rounded-3xl flex flex-col h-[500px] shadow-2xl relative">
                                    <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between rounded-t-3xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                                <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Neural Interaction</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background/30">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                <div className={`max-w-[80%] p-4 rounded-2xl ${
                                                    m.role === 'user' 
                                                        ? 'bg-primary text-slate-900 font-bold shadow-lg shadow-primary/10' 
                                                        : 'bg-surface border border-border text-text-base'
                                                }`}>
                                                    <p className="text-xs leading-relaxed">{m.text}</p>
                                                    <span className={`text-[8px] uppercase tracking-widest mt-2 block opacity-50 ${m.role === 'user' ? 'text-slate-900' : 'text-text-muted'}`}>
                                                        {m.time}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {isChatting && (
                                            <div className="flex justify-start">
                                                <div className="bg-surface border border-border p-4 rounded-2xl">
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Neural Core Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Chat Controls */}
                                    <div className="p-6 border-t border-border bg-surface/50 rounded-b-3xl">
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {suggestedQuestions.map((q, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInput(q)}
                                                    disabled={!selectedDoc || isChatting}
                                                    className="px-3 py-1.5 rounded-lg bg-background/50 border border-border text-[9px] font-black text-text-muted uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all active:scale-95 disabled:opacity-30"
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                className="w-full bg-background border border-border rounded-2xl px-5 py-4 pr-12 text-xs font-medium text-text-base placeholder-text-muted focus:ring-1 focus:ring-primary/30 focus:border-primary/30 resize-none transition-all outline-none"
                                                placeholder={selectedDoc ? "Query the document context..." : "Select a document to chat..."}
                                                rows="2"
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                                disabled={!selectedDoc || isChatting}
                                            ></textarea>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!selectedDoc || isChatting || !input.trim()}
                                                className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${
                                                    !selectedDoc || isChatting || !input.trim() 
                                                        ? 'text-text-muted opacity-30' 
                                                        : 'text-primary hover:scale-110 active:scale-90'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined font-black">send_spark</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-surface border border-border flex items-center justify-center mb-8 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="material-symbols-outlined text-4xl text-text-muted group-hover:text-primary transition-colors">folder_open</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">No Document Selected</h2>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em] max-w-sm leading-relaxed italic">
                            Select a document from the neural vault to initiate deep-context analysis and interactive review.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = "http://localhost:8000";

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
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-[#0f0f1a] text-slate-200 overflow-hidden">
            {/* Sidebar: The "Document Vault" */}
            <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#0a0a14] flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                    </div>
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Document Vault</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {documents.map((doc, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectDoc(doc)}
                            className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                selectedDoc?.public_id === doc.public_id
                                    ? 'bg-primary/10 border-primary/50 text-white shadow-[0_0_20px_rgba(187,189,246,0.1)]'
                                    : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-800/30'
                            }`}
                        >
                            <div className="flex flex-col gap-1 relative z-10">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedDoc?.public_id === doc.public_id ? 'text-primary' : 'text-slate-600'}`}>Cloud Asset</span>
                                <span className="text-xs font-bold truncate">{doc.public_id.split('/').pop()}</span>
                            </div>
                            {selectedDoc?.public_id === doc.public_id && (
                                <div className="absolute right-0 top-0 h-full w-1 bg-primary"></div>
                            )}
                        </button>
                    ))}
                    {documents.length === 0 && (
                        <div className="text-center py-12 px-6">
                            <span className="material-symbols-outlined text-slate-700 text-4xl mb-4">folder_off</span>
                            <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest leading-relaxed">No vaulted assets found.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-[#0d0d18]">
                    <button className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload New Doc
                    </button>
                </div>
            </aside>

            {/* Main Content: Summary Hub */}
            <main className="flex-1 flex flex-col overflow-y-auto bg-slate-900/40 relative">
                {/* Visual Glass Header */}
                <div className="sticky top-0 z-20 px-8 py-5 border-b border-slate-800/50 glass-nav-dark flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 border text-[9px] font-black uppercase tracking-widest rounded-full transition-colors ${error ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            {error ? 'Neural Engine Throttled' : 'Neural Engine Active'}
                        </span>
                        <h1 className="text-lg font-black text-white tracking-tight">
                            {selectedDoc ? selectedDoc.public_id.split('/').pop() : 'Direct Summary Hub'}
                        </h1>
                    </div>
                    {selectedDoc && !loading && !error && (
                        <a 
                            href={selectedDoc.secure_url || selectedDoc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-xs font-black text-primary uppercase tracking-widest hover:bg-primary/10 hover:border-primary/40 transition-all shadow-xl"
                        >
                            <span className="material-symbols-outlined text-sm">cloud_download</span>
                            Download PDF
                        </a>
                    )}
                </div>

                <div className="p-8 max-w-5xl mx-auto w-full">
                    {loading ? (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-3xl animate-pulse">brain</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Synthesizing...</h3>
                            <p className="text-slate-500 text-[11px] mt-2 font-bold uppercase tracking-[0.3em]">Neural Pipeline engaged</p>
                        </div>
                    ) : error ? (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-24 h-24 rounded-full border-4 border-rose-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-rose-500 text-6xl">
                                    {error.includes("THROTTLED") ? "timer_3" : error.includes("AUTH") || error.includes("CONFIG") ? "key_off" : "cloud_off"}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                                    {error.includes("THROTTLED") ? "Engine Cooling Down" : "Neural Sync Failed"}
                                </h2>
                                <p className="text-slate-400 max-w-sm font-black text-[10px] uppercase tracking-widest leading-relaxed mx-auto">
                                    {error.includes("THROTTLED") ? "Neural Engine at capacity. Please wait 30 seconds for the quota to reset." : 
                                     error.includes("AUTH") ? "Invalid API Configuration. Check backend .env settings." :
                                     error.includes("DOWNLOAD") ? "Could not access the document from the cloud vault." :
                                     `System Report: ${error}`}
                                </p>
                                <button 
                                    onClick={() => handleSelectDoc(selectedDoc)}
                                    className="mt-6 px-8 py-2.5 rounded-xl bg-primary text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 transition-all"
                                >
                                    Retry Neural Sequence
                                </button>
                            </div>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Score & Key Terms */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="col-span-1 md:col-span-1 p-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center">
                                    <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-700" />
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={226} strokeDashoffset={226 - (226 * analysis.compliance_score / 100)} className="text-primary transition-all duration-1000" />
                                        </svg>
                                        <span className="absolute text-xl font-black text-white">{analysis.compliance_score}%</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance</p>
                                </div>
                                <div className="col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {(analysis.key_terms || []).slice(0, 3).map((term, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-[#161726] border border-slate-800 group hover:border-primary/40 transition-all">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-primary">{term.label}</p>
                                            <p className="text-lg font-black text-white truncate">{term.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary View */}
                            <div className="bg-[#161726]/80 rounded-3xl border border-slate-800/80 p-8 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
                                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] font-display">LexAI Executive Briefing</h3>
                                </div>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-slate-300 leading-relaxed font-medium text-base whitespace-pre-wrap selection:bg-primary selection:text-slate-900">
                                        {analysis.summary}
                                    </p>
                                </div>
                            </div>

                            {/* Clause Breakdown */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] px-4">Critical Clause Map</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(analysis.summary_items || []).map((item, i) => (
                                        <div key={i} className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 hover:bg-slate-800/60 transition-all flex gap-4 items-start border-l-4 group" style={{ borderLeftColor: item.risk_level === 'high' ? '#ef4444' : item.risk_level === 'medium' ? '#f59e0b' : '#10b981' }}>
                                            <span className={`material-symbols-outlined text-lg ${item.risk_level === 'high' ? 'text-rose-500' : item.risk_level === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {item.risk_level === 'high' ? 'report' : item.risk_level === 'medium' ? 'info' : 'verified_user'}
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 group-hover:text-primary transition-all">{item.title}</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-12 space-y-8 animate-in fade-in duration-1000">
                            <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center relative">
                                <span className="material-symbols-outlined text-slate-800 text-6xl">cloud_sync</span>
                                <div className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">lock</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Vault Idle</h2>
                                <p className="text-slate-500 max-w-md font-bold text-xs uppercase tracking-widest leading-relaxed">
                                    Select an asset from the <span className="text-primary italic">Document Vault</span> on the left to initiate the neural scanning sequence.
                                </p>
                            </div>
                            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                        </div>
                    )}
                </div>
            </main>

            {/* Right Panel: Interactive Neural Chat */}
            <aside className="w-full lg:w-96 border-l border-slate-800 bg-[#0a0a14] flex flex-col shrink-0">
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(187,189,246,0.3)]">
                            <span className="material-symbols-outlined text-slate-900 font-black">psychology</span>
                        </div>
                        <div>
                            <h3 className="font-black text-xs text-white uppercase tracking-widest">LexPro AI</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9px] font-black text-slate-500 uppercase">Context Aware</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-900/10">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-4 text-xs font-medium leading-relaxed shadow-2xl relative ${
                                msg.role === 'ai' 
                                    ? 'bg-[#161726] text-slate-200 rounded-2xl rounded-tl-none border border-slate-800'
                                    : 'bg-primary text-slate-900 font-black rounded-2xl rounded-tr-none'
                            }`}>
                                {msg.text}
                            </div>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{msg.time}</span>
                        </div>
                    ))}
                    {isChatting && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-[#161726] rounded-2xl border border-slate-800 w-fit">
                            <div className="flex gap-1">
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Thinking...</span>
                        </div>
                    )}
                </div>

                {/* Chat Controls */}
                <div className="p-6 border-t border-slate-800 bg-[#0d0d18]">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(q)}
                                disabled={!selectedDoc || isChatting}
                                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all active:scale-95 disabled:opacity-30"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <textarea
                            className="w-full bg-[#161726] border-slate-800 rounded-2xl px-5 py-4 pr-12 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 resize-none transition-all"
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
                                    ? 'text-slate-700' 
                                    : 'text-primary hover:scale-110 active:scale-90'
                            }`}
                        >
                            <span className="material-symbols-outlined font-black">send_spark</span>
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

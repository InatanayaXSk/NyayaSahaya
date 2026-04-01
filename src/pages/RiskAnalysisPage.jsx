import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8000";

export default function RiskAnalysisPage() {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeClause, setActiveClause] = useState(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/documents`);
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
        setActiveClause(null);
        try {
            const resp = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_id: doc.public_id, url: doc.secure_url || doc.url })
            });
            const data = await resp.json();
            
            if (data.error) {
                setError(data.error);
            } else {
                setAnalysis(data);
                if (data.clauses && data.clauses.length > 0) {
                    setActiveClause(data.clauses[0]);
                }
            }
        } catch (err) {
            console.error("Analysis failed:", err);
            setError("CONEX_FAIL: Failed to reach Neural Cluster. Please retry.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-[#0f0f1a] text-slate-200 overflow-hidden">
            {/* Sidebar: The "Risk Vault" (Standardized Width) */}
            <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#0a0a14] flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                        <span className="material-symbols-outlined text-rose-500 text-xl">security</span>
                    </div>
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Risk Vault</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {documents.map((doc, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectDoc(doc)}
                            className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                selectedDoc?.public_id === doc.public_id
                                    ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                    : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-800/30'
                            }`}
                        >
                            <div className="flex flex-col gap-1 relative z-10">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedDoc?.public_id === doc.public_id ? 'text-rose-500' : 'text-slate-600'}`}>Secure Asset</span>
                                <span className="text-xs font-bold truncate">{doc.public_id.split('/').pop()}</span>
                            </div>
                            {selectedDoc?.public_id === doc.public_id && (
                                <div className="absolute right-0 top-0 h-full w-1 bg-rose-500"></div>
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
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/40 relative">
                {/* Header Sub-bar */}
                <div className="px-8 py-4 border-b border-slate-800/50 glass-nav-dark flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                        <span className="text-slate-500">Compliance Vault</span>
                        <span className="material-symbols-outlined text-sm text-slate-700">chevron_right</span>
                        <span className="text-white">{selectedDoc ? selectedDoc.public_id.split('/').pop() : 'Direct Neural Scan'}</span>
                    </div>
                    {selectedDoc && !loading && !error && (
                        <a 
                            href={selectedDoc.secure_url || selectedDoc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 hover:border-rose-500/40 transition-all shadow-xl"
                        >
                            <span className="material-symbols-outlined text-sm">cloud_download</span>
                            Download Asset
                        </a>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                            <span className="material-symbols-outlined text-sm">report</span> Engine Throttled
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]"></div>
                        <h3 className="text-xl font-black text-white animate-pulse tracking-widest uppercase italic">Neural Scanning...</h3>
                        <p className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-[0.4em]">Gemini 4.0 Pro Context Engine</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-24 h-24 rounded-full border-4 border-rose-500/20 flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-rose-500 text-6xl">
                                {error.includes("THROTTLED") ? "hourglass_empty" : error.includes("AUTH") || error.includes("CONFIG") ? "key_off" : "cloud_off"}
                            </span>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                                {error.includes("THROTTLED") ? "Engine Cooling Down" : "Neural Sync Failed"}
                            </h2>
                            <p className="text-slate-500 max-w-sm font-black text-xs uppercase tracking-[0.2em] leading-relaxed mx-auto">
                                {error.includes("THROTTLED") ? "Neural Cluster is at capacity. Please wait 30 seconds for the next scan cycle." : 
                                 error.includes("AUTH") ? "Invalid API Configuration. Check backend .env settings." :
                                 error.includes("DOWNLOAD") ? "Could not access the document from the vault." :
                                 `System Report: ${error}`}
                            </p>
                            <button 
                                onClick={() => handleSelectDoc(selectedDoc)}
                                className="mt-8 px-6 py-2 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all active:scale-95"
                            >
                                Retry Scanning Sequence
                            </button>
                        </div>
                    </div>
                ) : analysis ? (
                    <div className="flex-1 grid grid-cols-12 overflow-hidden">
                        {/* Left: Clause Sidebar */}
                        <aside className="col-span-3 border-r border-slate-800 bg-[#0a0a14]/50 flex flex-col overflow-y-auto">
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0a0a14] z-10">
                                <h3 className="font-black text-slate-500 text-[9px] uppercase tracking-widest">Detected Clauses ({analysis.clauses?.length || 0})</h3>
                            </div>
                            <div className="p-2 space-y-2">
                                {(analysis.clauses || []).map((c, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveClause(c)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                                            activeClause === c ? 'bg-slate-800/80 border-slate-600 shadow-xl' : 'bg-transparent border-transparent hover:bg-slate-800/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                                                c.risk_assessment?.includes('High') ? 'text-rose-500 bg-rose-500/10' : 
                                                c.risk_assessment?.includes('Medium') ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'
                                            }`}>{c.risk_assessment}</span>
                                        </div>
                                        <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate">{c.title}</h4>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* Center: Detailed Clause Viewer */}
                        <section className="col-span-6 bg-slate-900/50 p-8 overflow-y-auto custom-scrollbar">
                           {activeClause ? (
                                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-2 border-b border-slate-800 pb-6">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-sm">gavel</span>
                                            {activeClause.section}
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter">{activeClause.title}</h2>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-[#161726]/80 border border-slate-800 relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent"></div>
                                        <p className="text-slate-300 text-lg font-medium leading-relaxed italic">"{activeClause.excerpt}"</p>
                                    </div>

                                    <div className="space-y-4 px-2">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">AI Strategic Explainers</h4>
                                        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-slate-300 text-sm leading-relaxed font-medium">
                                            {activeClause.risk_assessment} - {activeClause.suggestion ? "AI Mitigation Recommendation included." : "Standard review suggested."}
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-slate-800/40 border-2 border-dashed border-slate-700 relative mt-12 overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <span className="material-symbols-outlined text-8xl text-white">auto_awesome</span>
                                        </div>
                                        <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4">Recommended Amendment</h5>
                                        <p className="text-sm text-white font-black italic leading-relaxed mb-6">"{activeClause.suggestion || "Use standard industry defaults for this clause type."}"</p>
                                        <button className="w-full py-3.5 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20_rgba(239,68,68,0.3)] hover:scale-[1.02] transition-all active:scale-95">Apply AI Mitigation</button>
                                    </div>
                                </div>
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center opacity-30">
                                   <span className="material-symbols-outlined text-8xl text-slate-500 mb-4">verified</span>
                                   <p className="font-black uppercase tracking-widest text-[11px]">Neural Audit Idle</p>
                               </div>
                           )}
                        </section>

                        {/* Right: Global Risks */}
                        <aside className="col-span-3 border-l border-slate-800 bg-[#0a0a14]/50 flex flex-col overflow-y-auto p-8 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Risk Quotient</h3>
                                <div className="relative pt-1">
                                    <div className="flex mb-4 items-center justify-between">
                                        <span className="text-[2rem] font-black text-white italic tracking-tighter">{analysis.compliance_score}%</span>
                                        <span className="text-[10px] font-black bg-rose-500/20 text-rose-500 px-3 py-1 rounded-full uppercase tracking-tighter">Critical review</span>
                                    </div>
                                    <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-slate-800 shadow-inner">
                                        <div style={{ width: `${analysis.compliance_score}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-rose-600 transition-all duration-1000"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Statutory Compliance</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(analysis.legal_conflicts || []).map((conflict, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest shadow-xl">{conflict}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Insights Pipeline</h3>
                                {[
                                    { icon: 'bolt', text: 'Section 4.2 deviates from market precedence by 82%.' },
                                    { icon: 'history', text: 'Similar clauses in FY25 led to 14% litigation overhead.' },
                                ].map((h, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 flex gap-3">
                                        <span className="material-symbols-outlined text-amber-500 text-lg">{h.icon}</span>
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{h.text}</p>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-1000">
                         <div className="w-40 h-40 rounded-3xl border-4 border-dashed border-slate-800 flex items-center justify-center rotate-3 hover:rotate-0 transition-all duration-700">
                            <span className="material-symbols-outlined text-slate-800 text-8xl">fingerprint</span>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase">Scanner Idle</h2>
                            <p className="text-slate-500 max-w-sm font-black text-xs uppercase tracking-[0.2em] leading-relaxed mx-auto">
                                Select a document from the <span className="text-rose-500">Risk Vault</span> to initiate the neural auditing sequence.
                            </p>
                        </div>
                    </div>
                )}

                {/* Status Bar */}
                <footer className="h-10 border-t border-slate-800 bg-[#0a0a14] px-8 flex items-center justify-between text-[8px] font-black text-slate-600 tracking-[0.4em] uppercase">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 text-rose-500">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> SCANNER ONLINE
                        </span>
                        <span>ENGINE: PRO-V1.0</span>
                    </div>
                    <span>© NYAYASAHAYA NEURAL NETWORK 2026</span>
                </footer>
            </main>
        </div>
    );
}

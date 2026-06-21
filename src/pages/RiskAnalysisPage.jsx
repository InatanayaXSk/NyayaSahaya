import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';

import { BASE_URL as API_BASE } from '../utils/api';


export default function RiskAnalysisPage() {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeClause, setActiveClause] = useState(null);

    const { token, user } = useAuth();
    const { activeClient, setActiveDocument } = useClient();

    useEffect(() => {
        if (token) {
            fetchDocuments();
        }
    }, [token, activeClient, user]);

    const fetchDocuments = async () => {
        if (!token) return;
        try {
            const clientQuery = (user?.role === 'lawyer' && activeClient) ? `?client=${encodeURIComponent(activeClient.username)}` : '';
            const resp = await fetch(`${API_BASE}/api/documents${clientQuery}`, {
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
        setActiveDocument(doc); // Propagate to Chatbot context
        setLoading(true);
        setAnalysis(null);
        setError(null);
        setActiveClause(null);
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

    const handleDownload = async (e, doc) => {
        e.preventDefault();
        try {
            const resp = await fetch(`${API_BASE}/api/download/${doc.public_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!resp.ok) throw new Error("Download failed");
            
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.public_id;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
            alert("Secure Asset retrieval failed.");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-background text-text-base overflow-hidden">
            {/* Sidebar: The "Risk Vault" (Standardized Width) */}
            <aside className="w-full lg:w-80 border-r border-border bg-surface flex flex-col shrink-0">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <span className="material-symbols-outlined text-rose-500 text-xl">security</span>
                    </div>
                    <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-muted">Risk Vault</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {documents.map((doc, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectDoc(doc)}
                            className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                selectedDoc?.public_id === doc.public_id
                                     ? 'bg-rose-500/5 border-rose-500/30 text-text-base'
                                    : 'bg-transparent border-border text-text-muted hover:border-primary/50 hover:bg-background/50'
                            }`}
                        >
                            <div className="flex flex-col gap-1 relative z-10">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedDoc?.public_id === doc.public_id ? 'text-rose-500' : 'text-text-muted'}`}>Secure Asset</span>
                                <span className="text-xs font-bold truncate">{doc.public_id.split('/').pop()}</span>
                            </div>
                            {selectedDoc?.public_id === doc.public_id && (
                                <div className="absolute right-0 top-0 h-full w-1 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                            )}
                        </button>
                    ))}
                    {documents.length === 0 && (
                        <div className="text-center py-12 px-6">
                            <span className="material-symbols-outlined text-text-muted text-4xl mb-4">folder_off</span>
                            <p className="text-[10px] uppercase font-black text-text-muted tracking-widest leading-relaxed">No vaulted assets found.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background/40 relative">
                {/* Header Sub-bar */}
                <div className="px-8 py-4 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-text-muted">Compliance Vault</span>
                        <span className="material-symbols-outlined text-sm text-text-muted">chevron_right</span>
                        <span className="text-text-base">{selectedDoc ? selectedDoc.public_id.split('/').pop() : 'Direct Neural Scan'}</span>
                    </div>
                    {selectedDoc && !loading && !error && (
                        <button 
                            onClick={(e) => handleDownload(e, selectedDoc)} 
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/5 hover:border-rose-500/30 transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">cloud_download</span>
                            Download Asset
                        </button>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/20">
                            <span className="material-symbols-outlined text-sm">report</span> Engine Throttled
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(244,63,94,0.3)]"></div>
                        <h3 className="text-xl font-black text-text-base animate-pulse tracking-widest uppercase italic">Neural Scanning...</h3>
                        <p className="text-text-muted text-[10px] mt-2 font-black uppercase tracking-[0.4em]">Integrated Compliance Hub</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-24 h-24 rounded-full border border-rose-500/20 flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-rose-500 text-6xl">
                                {error.includes("THROTTLED") ? "hourglass_empty" : error.includes("AUTH") || error.includes("CONFIG") ? "key_off" : "cloud_off"}
                            </span>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-text-base tracking-tighter uppercase italic">
                                {error.includes("THROTTLED") ? "Engine Cooling Down" : "Neural Sync Failed"}
                            </h2>
                            <p className="text-text-muted max-w-sm font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed mx-auto">
                                {error.includes("THROTTLED") ? "Neural Cluster is at capacity. Please wait 30 seconds for the next scan cycle." : 
                                 error.includes("AUTH") ? "Invalid API Configuration. Check backend .env settings." :
                                 error.includes("DOWNLOAD") ? "Could not access the document from the vault." :
                                 `System Report: ${error}`}
                            </p>
                            <button 
                                onClick={() => handleSelectDoc(selectedDoc)}
                                className="mt-8 px-8 py-3 rounded-xl bg-rose-500 text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                            >
                                Retry Scanning Sequence
                            </button>
                        </div>
                    </div>
                ) : analysis ? (
                    <div className="flex-1 grid grid-cols-12 overflow-hidden">
                        {/* Left: Clause Sidebar */}
                        <aside className="col-span-3 border-r border-border bg-surface/30 flex flex-col overflow-y-auto">
                            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
                                <h3 className="font-black text-text-muted text-[9px] uppercase tracking-widest">Detected Clauses ({analysis.clauses?.length || 0})</h3>
                            </div>
                            <div className="p-2 space-y-2">
                                {(analysis.clauses || []).map((c, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveClause(c)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                                            activeClause === c ? 'bg-background border-border shadow-md' : 'bg-transparent border-transparent hover:bg-background/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                                                c.risk_assessment?.toLowerCase().includes('high') ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 
                                                c.risk_assessment?.toLowerCase().includes('medium') ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' : 
                                                'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                                            }`}>{c.risk_assessment}</span>
                                        </div>
                                        <h4 className={`text-[11px] font-black uppercase tracking-tight truncate ${activeClause === c ? 'text-primary' : 'text-text-base'}`}>{c.title}</h4>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* Center: Detailed Clause Viewer */}
                        <section className="col-span-6 bg-background/50 p-8 overflow-y-auto custom-scrollbar">
                           {activeClause ? (
                                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-2 border-b border-border pb-6">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-sm">gavel</span>
                                            {activeClause.section}
                                        </div>
                                        <h2 className="text-3xl font-black text-text-base tracking-tighter">{activeClause.title}</h2>
                                    </div>
 
                                    <div className="p-8 rounded-3xl bg-surface border border-border relative group overflow-hidden shadow-sm">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent opacity-50"></div>
                                        <p className="text-text-base text-lg font-medium leading-relaxed italic">"{activeClause.excerpt}"</p>
                                    </div>
 
                                    <div className="space-y-4 px-2">
                                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Neural Explainer</h4>
                                        <div className="p-6 rounded-2xl bg-background border border-border text-text-muted text-sm leading-relaxed font-medium">
                                            {activeClause.risk_assessment} - {activeClause.suggestion ? "AI Mitigation Recommendation included." : "Standard review suggested."}
                                        </div>
                                    </div>
 
                                    <div className="p-8 rounded-3xl bg-surface border-2 border-dashed border-border relative mt-12 overflow-hidden shadow-sm">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <span className="material-symbols-outlined text-8xl text-text-base">auto_awesome</span>
                                        </div>
                                        <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4">Recommended Amendment</h5>
                                        <p className="text-sm text-text-base font-black italic leading-relaxed">"{activeClause.suggestion || "Use standard industry defaults for this clause type."}"</p>
                                    </div>
                                </div>
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center opacity-20">
                                   <span className="material-symbols-outlined text-8xl text-text-muted mb-4">verified</span>
                                   <p className="font-black uppercase tracking-widest text-[11px]">Neural Audit Idle</p>
                               </div>
                           )}
                        </section>

                        {/* Right: Global Risks */}
                        <aside className="col-span-3 border-l border-border bg-surface/40 flex flex-col overflow-y-auto p-8 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-6">Risk Quotient</h3>
                                <div className="relative pt-1">
                                    <div className="flex mb-4 items-center justify-between">
                                        <span className="text-[2rem] font-black text-text-base italic tracking-tighter">{analysis.compliance_score}%</span>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${
                                            analysis.compliance_score < 40 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            analysis.compliance_score < 75 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {analysis.compliance_score < 40 ? 'Critical Review' :
                                             analysis.compliance_score < 75 ? 'Standard Review' : 'High Compliance'}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-background shadow-inner border border-border">
                                        <div 
                                            style={{ width: `${analysis.compliance_score}%` }} 
                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${
                                                analysis.compliance_score < 40 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                                analysis.compliance_score < 75 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                                                'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>
 
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Statutory Compliance</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(analysis.legal_conflicts || []).map((conflict, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest shadow-sm">{conflict}</span>
                                    ))}
                                </div>
                            </div>
 
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Neural Summary</h3>
                                <div className="p-5 rounded-2xl bg-background border border-border text-text-muted text-xs leading-relaxed font-medium">
                                    {analysis.summary || "No summary available for this documentation."}
                                </div>
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-1000">
                         <div className="w-40 h-40 rounded-3xl border-4 border-dashed border-border flex items-center justify-center rotate-3 hover:rotate-0 transition-all duration-700">
                            <span className="material-symbols-outlined text-text-muted text-8xl">fingerprint</span>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black text-text-base tracking-tighter italic uppercase">Scanner Idle</h2>
                            <p className="text-text-muted max-w-sm font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed mx-auto">
                                Select a document from the <span className="text-rose-500">Risk Vault</span> to initiate the neural auditing sequence.
                            </p>
                        </div>
                    </div>
                )}

                {/* Status Bar */}
                <footer className="h-10 border-t border-border bg-surface px-8 flex items-center justify-between text-[8px] font-black text-text-muted tracking-[0.4em] uppercase">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 text-rose-500">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> SCANNER ONLINE
                        </span>
                        <span>ENGINE: NEURAL_CORE_V2.0</span>
                    </div>
                    <span>© NYAYASAHAYA NEURAL NETWORK 2026</span>
                </footer>
            </main>
        </div>
    );
}

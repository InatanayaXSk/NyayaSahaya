import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import { mapUserName } from '../utils/userMapping';

import { API_BASE } from '../utils/api';


const metrics = [
    { label: 'Total Vault Documents', icon: 'folder_open', key: 'total_docs', color: 'primary' },
    { label: 'Blockchain Sealed', icon: 'verified_user', key: 'sealed_docs', color: 'primary/60' },
    { label: 'Pending Sealing', icon: 'lock_open', key: 'pending_docs', color: 'primary/30' },
    { label: 'System Health', icon: 'monitor_heart', key: 'health', color: 'border' },
];

const defaultStats = {
    total_docs: 0,
    sealed_docs: 0,
    pending_docs: 0,
    health: '100%',
    recent_activity: [],
};

function StatusBadge({ status }) {
    const styles = {
        'Draft': 'bg-background border border-border text-text-muted',
        'In Review': 'bg-background border border-border text-text-muted',
        'Verified': 'bg-primary/10 text-primary border border-primary/20',
        'Flagged': 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
        'Processed': 'bg-primary/10 text-primary border border-primary/20',
    };
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${styles[status] || 'bg-background text-text-muted'}`}>
            {status}
        </span>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState(defaultStats);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const { token, user } = useAuth();
    const { activeClient } = useClient();

    useEffect(() => {
        if (!token) return;
        setLoading(true);

        const clientQuery = (user?.role === 'lawyer' && activeClient) ? `?client=${encodeURIComponent(activeClient.username)}` : '';

        const fetchStats = fetch(`${API_BASE}/documents/stats${clientQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        const fetchDocs = fetch(`${API_BASE}/documents${clientQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        Promise.all([fetchStats, fetchDocs])
            .then(([statsData, docsData]) => {
                setStats(prev => ({ ...prev, ...statsData }));
                if (docsData.documents) {
                    setDocuments(docsData.documents);
                }
            })
            .catch(err => console.error("Dashboard Fetch Error:", err))
            .finally(() => setLoading(false));
    }, [token, activeClient, user]);

    return (
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8 space-y-8 bg-background text-text-base">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-primary font-serif-display text-4xl font-black uppercase tracking-tight">Operations <span className="text-text-base">Dashboard</span></h1>
                    <p className="text-text-muted mt-2 text-sm max-w-xl">Comprehensive overview of document lifecycle, cryptographic sealing status, and real-time ledger health monitoring.</p>
                </div>
                {user?.role === 'lawyer' && (
                    <button 
                        onClick={() => navigate('/document-generator')}
                        className="flex items-center justify-center rounded-xl bg-primary text-slate-900 h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                        <span>New Document</span>
                    </button>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map(m => (
                    <div key={m.key} className="flex flex-col gap-3 rounded-3xl bg-surface p-6 border border-border shadow-sm border-t-4 border-t-primary">
                        <div className="flex justify-between items-start">
                            <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">{m.label}</p>
                            <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 24 }}>{m.icon}</span>
                        </div>
                        {loading ? (
                            <div className="h-9 w-24 bg-background animate-pulse rounded"></div>
                        ) : (
                            <p className="text-primary font-serif-display text-3xl font-black">
                                {stats[m.key] === undefined || stats[m.key] === null ? 'Error' : 
                                 typeof stats[m.key] === 'number' ? stats[m.key].toLocaleString() : stats[m.key]}
                            </p>
                        )}
                        <p className="text-xs text-slate-400 font-medium italic">
                            Live system status
                        </p>
                    </div>
                ))}
            </div>

            {/* Dashboard Secondary Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Secondary Metrics / Lifecycle Tracker */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-surface rounded-[2.5rem] border border-border p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Document Integrity Lifecycle</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mt-1 italic">Real-time cryptographic verification tracking</p>
                            </div>
                            <div className="px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">System Nominal</span>
                            </div>
                        </div>
                        
                        <div className="space-y-10">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                                    <span>Blockchain Sealing Completion</span>
                                    <span className="text-primary">88%</span>
                                </div>
                                <div className="h-2 w-full bg-background rounded-full overflow-hidden p-0.5 border border-border">
                                    <div className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" style={{ width: '88%' }}></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                                    <span>Neural Analysis Coverage</span>
                                    <span className="text-primary/60">94%</span>
                                </div>
                                <div className="h-2 w-full bg-background rounded-full overflow-hidden p-0.5 border border-border">
                                    <div className="h-full bg-primary/60 rounded-full shadow-[0_0_15px_rgba(var(--color-primary),0.3)]" style={{ width: '94%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions / Status Pulse */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Neural Health</h3>
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.8)] animate-pulse"></div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Blockchain Sync</span>
                                <span className="text-xs font-mono font-bold text-primary">100%</span>
                            </div>
                            <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[100%] shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"></div>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/bridge-monitor')}
                            className="w-full mt-8 py-4 bg-background border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Open Bridge Monitor
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Managed Vault Assets */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Managed Vault Assets</h2>
                        <button onClick={() => navigate('/verify')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View Ledger</button>
                    </div>
                    
                    <div className="bg-surface rounded-3xl border border-border/30 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted animate-pulse">Syncing with Node...</p>
                            </div>
                        ) : documents.length > 0 ? (
                            <div className="divide-y divide-border/20">
                                {documents.slice(0, 6).map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-6 hover:bg-background/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-all">
                                                <span className="material-symbols-outlined text-primary text-2xl">description</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight mb-1 group-hover:text-primary transition-colors">{doc.public_id.split('/').pop()}</h4>
                                                <p className="text-[10px] font-mono text-text-muted">SEAL_ID: {doc.public_id.slice(0, 12)}...</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="hidden md:block text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Status</p>
                                                <StatusBadge status={doc.sealed ? 'Verified' : 'Processed'} />
                                            </div>
                                            <button 
                                                onClick={() => navigate(`/documents/${encodeURIComponent(doc.public_id)}`)}
                                                className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">open_in_new</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                    <span className="material-symbols-outlined text-text-muted text-3xl">inventory_2</span>
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-text-muted">No documents found in encrypted storage.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Network Health & Activity */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface rounded-3xl border border-border p-8 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-base mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary">hub</span> Network Status
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Node Latency</span>
                                <span className="text-xs font-mono font-bold text-primary">12ms</span>
                            </div>
                            <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[94%] shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Blockchain Sync</span>
                                <span className="text-xs font-mono font-bold text-primary">100%</span>
                            </div>
                            <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[100%] shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"></div>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/bridge-monitor')}
                            className="w-full mt-8 py-3 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all"
                        >
                            Open Bridge Monitor
                        </button>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4 relative z-10">Neural Analysis</h3>
                        <p className="text-[11px] text-text-muted leading-relaxed mb-6 relative z-10">
                            The LexAI engine has processed 4 critical risk flags in your latest contract drafts. Summary reports are available in the Risk Hub.
                        </p>
                        <button 
                            onClick={() => navigate('/risk-analysis')}
                            className="px-5 py-2 bg-primary text-background rounded-lg text-[10px] font-black uppercase tracking-widest relative z-10"
                        >
                            Review Risks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

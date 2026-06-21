import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import { mapUserName } from '../utils/userMapping';
import HardwareAuthModal from '../components/hardware/HardwareAuthModal';

import { API_BASE, getDownloadUrl } from '../utils/api';



export default function DocumentViewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { setActiveDocument } = useClient();

    const [doc, setDoc] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hardware Modal State
    const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
    const [isSealing, setIsSealing] = useState(false);

    // Sharing State
    const [shareUsername, setShareUsername] = useState("");
    const [shareMessage, setShareMessage] = useState("");

    // Blockchain Status Polling
    const [chainStatus, setChainStatus] = useState(null);
    const [isHardwareOnline, setIsHardwareOnline] = useState(true);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`${API_BASE}/documents/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Document not found or access denied");
            const data = await res.json();
            setDoc(data);
            setActiveDocument(data); // Set active document for the chatbot
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPdf = async () => {
        try {
            const res = await fetch(`${API_BASE}/download/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            }
        } catch (err) {
            console.error("Failed to fetch PDF", err);
        }
    };

    const fetchChainStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/hardware/documents/${id}/chain-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChainStatus(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHardwareStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/hardware/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsHardwareOnline(data.status === 'online');
            } else {
                setIsHardwareOnline(false);
            }
        } catch (err) {
            setIsHardwareOnline(false);
        }
    };

    useEffect(() => {
        if (token && id) {
            fetchDocument();
            fetchPdf();
            fetchChainStatus();
            fetchHardwareStatus();
            
            const interval = setInterval(fetchHardwareStatus, 30000);
            return () => {
                clearInterval(interval);
                setActiveDocument(null);
            };
        }
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setActiveDocument(null);
        };
    }, [token, id]);

    const handleShare = async (e) => {
        e.preventDefault();
        setShareMessage("");
        try {
            const res = await fetch(`${API_BASE}/documents/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ public_id: id, lawyer_username: shareUsername })
            });
            const data = await res.json();
            if (res.ok) {
                setShareMessage(`✅ Shared with ${shareUsername}`);
                setShareUsername("");
            } else {
                setShareMessage(`❌ Error: ${data.detail || 'Failed to share'}`);
            }
        } catch (err) {
            setShareMessage(`❌ Error: Connection failed`);
        }
    };

    const pollChainStatus = async (maxAttempts = 15) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`${API_BASE}/hardware/documents/${id}/chain-status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.sealed || attempts >= maxAttempts) {
                        setChainStatus(data);
                        fetchDocument();
                        setIsSealing(false);
                        clearInterval(interval);
                    }
                }
            } catch (err) {
                console.error("Polling failed:", err);
                if (attempts >= maxAttempts) {
                    setIsSealing(false);
                    clearInterval(interval);
                }
            }
        }, 3000);
    };

    const handleSealingStart = async () => {
        setIsHardwareModalOpen(true);
        setIsSealing(true);
        try {
            const res = await fetch(`${API_BASE}/hardware/documents/${id}/verify-on-chain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                pollChainStatus();
            } else {
                const data = await res.json();
                const errorMessage = data.detail || "Sealing failed";
                alert(`Sealing Error: ${errorMessage}`);
                setIsSealing(false);
                setIsHardwareModalOpen(false);
            }
        } catch (err) {
            console.error("Sealing failed", err);
            setIsSealing(false);
            setIsHardwareModalOpen(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading document...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
    if (!doc) return null;

    const isSealed = doc.sealed || (chainStatus && chainStatus.sealed);
    const isPending = isSealing || (chainStatus && chainStatus.tx_status === 'pending');

    return (
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 h-[calc(100vh-64px)] flex flex-col bg-background text-text-base">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface border border-border hover:border-primary/50 transition-all text-text-base"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black uppercase tracking-tight">Document <span className="text-primary">Hub</span></h1>
                            {isSealed ? (
                                <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 flex items-center gap-2 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]">
                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                    Blockchain Sealed
                                </span>
                            ) : (
                                <span className="bg-surface text-text-muted px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-border">
                                    Draft Sequence
                                </span>
                            )}
                        </div>
                        <p className="text-text-muted font-mono text-[10px] mt-1 tracking-widest uppercase">Vault_ID: {doc.public_id}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                {/* Left Column: PDF Viewer */}
                <div className="flex-1 bg-surface rounded-[2rem] border border-border overflow-hidden flex flex-col min-h-[500px] shadow-sm">
                    <div className="bg-surface border-b border-border py-3 px-6 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                            {doc.public_id}.pdf
                        </span>
                        <a 
                            href={getDownloadUrl(doc.public_id)} 
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">download</span> Download Asset
                        </a>
                    </div>
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full flex-1 bg-white"
                            title="Document Preview"
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-background text-text-muted gap-4">
                            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Cryptographic Preview...</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Controls */}
                <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-8">

                    {/* Integrity & Sealing Panel */}
                    <div className="bg-surface rounded-[2rem] border border-border shadow-sm p-8 flex flex-col shrink-0">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <span className="material-symbols-outlined text-primary">security</span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-base">Neural Integrity</h2>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Status: {isSealed ? 'Anchored' : 'Ephemeral'}</p>
                            </div>
                        </div>

                        <div className="bg-background p-5 rounded-2xl border border-border mb-8 group">
                            <p className="text-[9px] uppercase font-black text-text-muted mb-2 tracking-[0.2em] group-hover:text-primary transition-colors">SHA-256 Fingerprint</p>
                            <p className="font-mono text-[10px] break-all text-text-base leading-relaxed">{doc.content_hash}</p>
                        </div>

                        {isPending ? (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center animate-pulse flex-1 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-4xl mb-4 animate-spin">data_usage</span>
                                <p className="font-black uppercase tracking-widest text-primary text-xs">Broadcasting Sequence...</p>
                                <p className="text-[10px] text-text-muted mt-2 uppercase tracking-tighter">Awaiting node consensus</p>
                            </div>
                        ) : isSealed ? (
                            <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-6 relative overflow-hidden flex-1 flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <span className="material-symbols-outlined text-8xl text-primary">verified_user</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-primary uppercase tracking-[0.15em] mb-3 relative z-10 flex items-center gap-3 text-sm">
                                        <span className="material-symbols-outlined">security_update_good</span>
                                        Legally Anchored
                                    </h3>
                                    <p className="text-[11px] text-text-muted mb-6 relative z-10 leading-relaxed font-medium uppercase tracking-tight italic">This asset has been cryptographically signed and permanently recorded on the blockchain ledger.</p>
                                </div>

                                <div className="space-y-4 relative z-10 mt-auto">
                                    {chainStatus?.tx_hash && (
                                        <div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-primary/10">
                                            <p className="text-[9px] uppercase font-black text-primary mb-2 tracking-[0.1em]">Ledger Receipt</p>
                                            <p className="font-mono text-[9px] break-all text-text-base">{chainStatus.tx_hash}</p>
                                        </div>
                                    )}

                                    {chainStatus?.etherscan_url && (
                                        <a
                                            href={chainStatus.etherscan_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-105"
                                        >
                                            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                            Verify on Ledger
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-background/50 border border-border border-dashed rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center">
                                {chainStatus?.tx_status === 'failed' && (
                                    <div className="w-full mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest text-center flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        <span>Last Sealing Cycle Failed (Tx Reverted / Out of Gas)</span>
                                        {chainStatus.tx_hash && (
                                            <a 
                                                href={`https://sepolia.etherscan.io/tx/${chainStatus.tx_hash}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="underline hover:text-rose-400 font-mono text-[8px] break-all block mt-1"
                                            >
                                                Inspect failed hash: {chainStatus.tx_hash.slice(0, 10)}...{chainStatus.tx_hash.slice(-10)}
                                            </a>
                                        )}
                                    </div>
                                )}
                                <span className={`material-symbols-outlined ${isHardwareOnline ? 'text-text-muted' : 'text-rose-500 animate-pulse'} text-4xl mb-4`}>
                                    {isHardwareOnline ? 'lock_open' : 'cloud_off'}
                                </span>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-text-base mb-2">
                                    {isHardwareOnline ? 'Sequence Unsealed' : 'Neural Bridge Offline'}
                                </p>
                                <p className="text-[10px] text-text-muted mb-6 uppercase tracking-widest leading-relaxed font-bold max-w-[280px]">
                                    {isHardwareOnline 
                                        ? 'Execute biometric sealing to anchor this asset to the immutable ledger.'
                                        : 'Biometric authorization is restricted. The Raspberry Pi node is currently disconnected.'}
                                </p>

                                <button
                                    onClick={() => isHardwareOnline && handleSealingStart()}
                                    disabled={!isHardwareOnline}
                                    className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg transition-all flex items-center justify-center gap-3 mt-auto ${isHardwareOnline 
                                        ? 'bg-primary text-slate-900 shadow-primary/20 hover:scale-105 active:scale-95' 
                                        : 'bg-surface text-text-muted border border-border cursor-not-allowed opacity-50'}`}
                                >
                                    <span className="material-symbols-outlined">fingerprint</span>
                                    {isHardwareOnline ? 'Start Sealing Cycle' : 'Bridge Offline'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Data Insulation / Access Control Panel */}
                    <div className="bg-surface rounded-[2rem] border border-border shadow-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                <span className="material-symbols-outlined text-rose-500">shield_person</span>
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-base">Asset Insulation</h2>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Access Control Hub</p>
                            </div>
                        </div>

                        <p className="text-[11px] text-text-muted mb-6 leading-relaxed font-medium uppercase tracking-tight italic">
                            Document controlled by: <strong className="text-text-base">{doc.owner_full_name || mapUserName(doc.owner_username)}</strong>.
                        </p>

                        <form onSubmit={handleShare} className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder={user?.role === 'lawyer' ? "Client Username" : "Lawyer Username"}
                                value={shareUsername}
                                onChange={e => setShareUsername(e.target.value)}
                                className="bg-background border border-border rounded-xl px-5 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-text-base text-background hover:bg-primary hover:text-slate-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Grant Access
                            </button>
                        </form>
                        {shareMessage && (
                            <p className={`mt-4 text-[10px] font-black uppercase tracking-widest text-center ${shareMessage.includes('❌') ? 'text-rose-500' : 'text-primary'}`}>
                                {shareMessage}
                            </p>
                        )}
                    </div>

                    {/* Event Timeline */}
                    <div className="bg-surface rounded-[2rem] border border-border shadow-sm p-8 flex-1 min-h-[300px]">
                        <h2 className="text-xs font-black text-text-base uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-sm text-primary">history</span> Audit Trail
                        </h2>
                        <div className="space-y-8">
                            {doc.events?.map((evt, i) => (
                                <div key={i} className="relative pl-8 border-l-2 border-border pb-2 last:border-transparent">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-background bg-border group-hover:bg-primary transition-colors"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-base">{evt.action}</p>
                                    <p className="text-[10px] text-text-muted mt-1 font-medium uppercase tracking-tighter">{evt.details}</p>
                                    <p className="text-[9px] font-mono text-primary mt-2">{new Date(evt.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                            {isSealed && (
                                <div className="relative pl-8 border-l-2 border-transparent">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-background bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Ledger Synchronization Success</p>
                                    <p className="text-[10px] text-text-muted mt-1 font-medium uppercase tracking-tighter">Anchored on Ethereum Node</p>
                                    <a
                                        href={chainStatus?.etherscan_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] text-primary font-black uppercase tracking-widest mt-3 block hover:underline"
                                    >
                                        Inspect Block
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <HardwareAuthModal
                isOpen={isHardwareModalOpen}
                onClose={() => setIsHardwareModalOpen(false)}
                documentId={doc.public_id}
            />
        </div>
    );
}

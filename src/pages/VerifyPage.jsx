import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/api';

import tickMark from '../assets/tickMark.svg';
import unverifiedMark from '../assets/unverified.svg';

export default function VerifyPage() {
    const { token } = useAuth();
    const [file, setFile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
            setError('');
        }
    };

    const handleVerify = async () => {
        if (!file) return;

        setIsVerifying(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/verify-upload`, {

                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Verification failed');

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError('Could not verify document. Please try again.');
            console.error(err);
        } finally {
            setIsVerifying(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-10 min-h-[calc(100vh-120px)] flex flex-col justify-center bg-background text-text-base">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full mb-6">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Ledger Synchronization Active</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tighter uppercase">
                    Integrity <span className="text-primary">Vault</span>
                </h1>
                <p className="text-sm font-bold text-text-muted max-w-xl mx-auto uppercase tracking-widest leading-relaxed">
                    Authenticate any legal instrument against the distributed NyayaSahaya ledger. Real-time SHA-256 fingerprint validation & blockchain consensus check.
                </p>
            </div>

            {!result ? (
                <div 
                    className={`relative group bg-surface border-4 border-dashed ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'} rounded-[2.5rem] p-12 transition-all duration-500 flex flex-col items-center justify-center cursor-pointer`}
                    onClick={() => !isVerifying && fileInputRef.current.click()}
                >
                    <input 
                        type="file" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".pdf"
                    />

                    <div className={`w-24 h-24 rounded-3xl ${file ? 'bg-primary text-slate-900 animate-bounce' : 'bg-background text-text-muted group-hover:bg-primary/10 group-hover:text-primary'} flex items-center justify-center mb-6 transition-colors duration-300 shadow-xl`}>
                        <span className="material-symbols-outlined text-5xl">
                            {file ? 'description' : 'upload_file'}
                        </span>
                    </div>

                    <h3 className="text-xl font-bold mb-2">
                        {file ? file.name : 'Drop document here or click to browse'}
                    </h3>
                    <p className="text-text-muted text-sm mb-8">
                        Only PDF documents are supported for high-fidelity verification
                    </p>

                    {file && (
                        <div className="flex gap-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); reset(); }}
                                className="px-6 py-3 rounded-2xl bg-surface border border-border text-text-muted hover:text-rose-500 font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleVerify(); }}
                                disabled={isVerifying}
                                className="px-10 py-3 rounded-2xl bg-primary text-slate-900 font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isVerifying ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-text-base border-t-transparent rounded-full animate-spin"></div>
                                        Analyzing Ledger...
                                    </>
                                ) : (
                                    <>
                                        Verify Now
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-surface rounded-[3rem] shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div className={`p-12 text-center ${result.verified ? 'bg-primary/10' : 'bg-rose-500/10'}`}>
                        <div className="mb-8 flex justify-center">
                            <div className={`p-6 rounded-full ${result.verified ? 'bg-primary/20 shadow-[0_0_30px_rgba(var(--color-primary),0.3)]' : 'bg-rose-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]'} transition-all`}>
                                <img 
                                    src={result.verified ? tickMark : unverifiedMark} 
                                    alt={result.verified ? "Verified" : "Unverified"} 
                                    className="w-24 h-24"
                                />
                            </div>
                        </div>
                        <h2 className={`text-4xl font-black mb-3 uppercase tracking-tight ${result.verified ? 'text-primary' : 'text-rose-500'}`}>
                            {result.verified ? 'Integrity Confirmed' : result.status === 'found' ? 'Not Blockchain Sealed' : 'Not Found'}
                        </h2>
                        <p className="text-text-muted font-bold text-[11px] uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
                            {result.verified 
                                ? 'Digital fingerprint matches the immutable record stored on the Ethereum Mainnet.' 
                                : result.message || 'The provided document does not match any sealed ledger entry.'}
                        </p>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-background/50 border border-border">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted block mb-3">SHA-256 Fingerprint</label>
                                <code className="text-[11px] font-mono text-text-base break-all opacity-80">{result.hash}</code>
                            </div>
                            {result.status === 'found' && (
                                <div className="p-6 rounded-3xl bg-background/50 border border-border">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted block mb-3">Registered Owner</label>
                                    <p className="font-black text-text-base uppercase tracking-wider">{result.owner}</p>
                                </div>
                            )}
                        </div>

                        {result.verified && (
                            <div className="p-8 rounded-[2.5rem] bg-primary text-slate-900 shadow-2xl shadow-primary/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-3xl">verified</span>
                                            <span className="font-black uppercase tracking-[0.2em] text-sm">Blockchain Proof</span>
                                        </div>
                                        <span className="text-[9px] font-black bg-slate-900/10 px-3 py-1.5 rounded-full uppercase tracking-tighter border border-text-base/10">ETH_MAINNET_V1</span>
                                    </div>
                                    <p className="text-[10px] font-mono font-bold break-all mb-8 opacity-80">TX: {result.tx_hash}</p>
                                    <a 
                                        href={result.etherscan_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                                    >
                                        View on Etherscan
                                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    </a>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={reset}
                            className="w-full py-4 rounded-2xl border border-border text-text-muted font-black text-[11px] uppercase tracking-[0.2em] hover:bg-surface hover:text-primary transition-all mt-4"
                        >
                            Verify Another Document
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-8 p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-center font-black text-[11px] uppercase tracking-widest animate-pulse">
                    <span className="material-symbols-outlined align-middle mr-2">warning</span>
                    {error}
                </div>
            )}
        </div>
    );
}

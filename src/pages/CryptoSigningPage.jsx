import React from 'react';

export default function CryptoSigningPage() {
    return (
        <div className="pt-8 pb-12 px-6 crypto-grid min-h-[calc(100vh-56px)]">
            <div className="max-w-4xl mx-auto">
                {/* Hero Status */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                            <div className="relative bg-white p-6 rounded-full border-4 border-primary shadow-2xl">
                                <span className="material-symbols-outlined text-6xl text-primary">verified_user</span>
                            </div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Signature Packet Validated</h2>
                    <p className="text-slate-500 font-medium">Transaction confirmed and sealed by distributed consensus</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Signature Manifest */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-primary/20 shadow-sm overflow-hidden">
                            <div className="bg-primary/10 px-6 py-4 border-b border-primary/20 flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">terminal</span> Signature Manifest
                                </h3>
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Authentic</span>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SHA-256 Hash</label>
                                        <div className="bg-background-light p-3 rounded-lg flex items-center justify-between border border-primary/10">
                                            <code className="text-xs break-all text-slate-700">0x7f83b2a1e99c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e</code>
                                            <button className="ml-2 text-primary hover:text-primary/70"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ECDSA Signature ID</label>
                                            <div className="bg-background-light p-3 rounded-lg border border-primary/10">
                                                <p className="text-sm font-mono text-slate-700">sig_ed25519_9bb21</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">RTC Timestamp</label>
                                            <div className="bg-background-light p-3 rounded-lg border border-primary/10">
                                                <p className="text-sm font-mono text-slate-700">2023-10-27T14:21:05Z</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Origin Node ID</label>
                                        <div className="bg-background-light p-3 rounded-lg border border-primary/10 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                            <p className="text-sm font-mono text-slate-700">LN-NODE-ALPHA-04-V3</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Latency', value: '14ms', color: 'text-primary' },
                                { label: 'Algorithm', value: 'ECC-P256', color: 'text-slate-700' },
                                { label: 'Blocks', value: '#42,901', color: 'text-slate-700' },
                                { label: 'Nodes', value: '128+', color: 'text-slate-700' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{stat.label}</p>
                                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-primary/20 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-primary">lock</span>
                                    <h4 className="font-bold text-lg">Seal Complete</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed mb-6">The cryptographic proof for this transaction has been permanently recorded. Any alteration to the original data will invalidate this proof.</p>
                                <div className="space-y-3">
                                    <button className="w-full bg-primary text-background-dark font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                        <span className="material-symbols-outlined text-sm">download</span> Download Proof
                                    </button>
                                    <button className="w-full bg-white/10 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10">
                                        <span className="material-symbols-outlined text-sm">share</span> Export JSON
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Network Integrity */}
                        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm">
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Network Integrity</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Hash Match</span>
                                        <span className="text-green-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> 100%</span>
                                    </div>
                                    <div className="w-full bg-primary/10 h-1.5 rounded-full overflow-hidden mt-1">
                                        <div className="bg-primary h-full w-full rounded-full"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Node Verification</span>
                                        <span className="text-primary font-bold">12/12 Quorum</span>
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="h-1.5 flex-1 bg-primary rounded-full"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

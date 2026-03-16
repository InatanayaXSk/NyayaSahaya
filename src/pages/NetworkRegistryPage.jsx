import React from 'react';

const recentLogs = [
    { hash: '0x71c...e4a2', node: 'AWS-East-402', time: '2023-10-27 14:22:10', status: 'Confirmed' },
    { hash: '0x22b...f910', node: 'GCP-Europe-11', time: '2023-10-27 14:21:45', status: 'Confirmed' },
    { hash: '0x99a...d3c1', node: 'DigitalOcean-SGP', time: '2023-10-27 14:20:12', status: 'Pending' },
    { hash: '0x44d...88e3', node: 'Edge-Node-NY', time: '2023-10-27 14:19:05', status: 'Confirmed' },
];

export default function NetworkRegistryPage() {
    return (
        <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
            {/* Hero */}
            <div className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4">Infrastructure Status: Active</span>
                        <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">Network Registry &amp; Verification</h2>
                        <p className="text-slate-600 text-lg">High-fidelity cryptographic integrity monitoring and TLS certificate validation for decentralized infrastructure nodes.</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-primary/20 shadow-sm flex flex-col items-center">
                        <div className="bg-slate-100 p-2 rounded-lg mb-2">
                            <span className="material-symbols-outlined text-5xl text-slate-400">qr_code_2</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Share Registry</span>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                    { label: 'Verified Hashes', value: '1,248,902', icon: 'database', trend: '+12.4% vs last epoch', trendColor: 'text-emerald-500' },
                    { label: 'Active Nodes', value: '4,829', icon: 'hub', trend: 'All systems operational', trendColor: 'text-emerald-500' },
                    { label: 'Network Uptime', value: '99.998%', icon: 'speed', trend: 'Updated 2s ago', trendColor: 'text-primary' },
                ].map((m, i) => (
                    <div key={i} className="p-6 rounded-xl bg-white border border-primary/20 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
                            <span className="material-symbols-outlined text-primary">{m.icon}</span>
                        </div>
                        <p className="text-3xl font-black">{m.value}</p>
                        <div className={`mt-2 flex items-center gap-1 ${m.trendColor} text-xs font-bold`}>
                            <span className="material-symbols-outlined text-xs">{m.trendColor.includes('emerald') ? 'trending_up' : 'update'}</span>
                            {m.trend}
                        </div>
                    </div>
                ))}
            </div>

            {/* TLS + Integrity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="p-8 rounded-xl bg-white border border-primary/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="material-symbols-outlined text-primary">lock</span>
                        <h3 className="text-xl font-bold uppercase tracking-tight">TLS Upload Status</h3>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2 uppercase tracking-wide">
                                <span>Handshake Integrity</span>
                                <span className="text-primary">100% Secure</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background-light p-4 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Cert Expiry</p>
                                <p className="font-mono text-sm">2025-12-31</p>
                            </div>
                            <div className="bg-background-light p-4 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Encryption</p>
                                <p className="font-mono text-sm">AES-256-GCM</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                            <div>
                                <p className="text-sm font-bold text-emerald-600">Handshake Complete</p>
                                <p className="text-xs text-emerald-600/80">The connection is end-to-end encrypted and verified against registry anchors.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 rounded-xl bg-white border border-primary/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="material-symbols-outlined text-primary">security</span>
                        <h3 className="text-xl font-bold uppercase tracking-tight">Integrity Verification</h3>
                    </div>
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer mb-6">
                        <span className="material-symbols-outlined text-4xl text-primary mb-3">upload_file</span>
                        <p className="font-bold text-center">Drop hash log or registry file here</p>
                        <p className="text-sm text-slate-500 mt-1">Accepts .json, .hex, .sig</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                <div>
                                    <p className="text-xs font-bold uppercase text-emerald-600">Live Result</p>
                                    <p className="text-sm font-black text-emerald-600">INTEGRITY VERIFIED</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-600">#AXF-8821</div>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/30 opacity-50">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                <div>
                                    <p className="text-xs font-bold uppercase text-red-600">Live Result</p>
                                    <p className="text-sm font-black text-red-600">TAMPER DETECTED</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-mono text-red-600">#ERR-4042</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registry Logs */}
            <div className="p-8 rounded-xl bg-white border border-primary/20 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">list_alt</span>
                        <h3 className="text-xl font-bold uppercase tracking-tight">Recent Registry Confirmations</h3>
                    </div>
                    <button className="text-sm font-bold text-primary hover:underline">View Global Log</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-primary/10">
                                <th className="pb-4 text-xs font-black uppercase text-slate-500 tracking-widest">Hash Signature</th>
                                <th className="pb-4 text-xs font-black uppercase text-slate-500 tracking-widest">Node Origin</th>
                                <th className="pb-4 text-xs font-black uppercase text-slate-500 tracking-widest">Timestamp</th>
                                <th className="pb-4 text-xs font-black uppercase text-slate-500 tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                            {recentLogs.map((log, i) => (
                                <tr key={i}>
                                    <td className="py-4 font-mono text-xs">{log.hash}</td>
                                    <td className="py-4 text-sm font-semibold">{log.node}</td>
                                    <td className="py-4 text-sm text-slate-500">{log.time}</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${log.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-primary/20 text-primary'
                                            }`}>{log.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

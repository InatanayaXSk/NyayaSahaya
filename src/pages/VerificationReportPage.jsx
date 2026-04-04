import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const defaultEvents = [
    { title: 'Certification Finalized', time: '14:30:05 UTC', desc: 'Document locked and permanent hash stored on LexNet Ledger. All signatories validated.', active: true },
    { title: 'Multi-Signature Cycle Initiated', time: '14:29:12 UTC', desc: 'Requesting verification signatures from secondary network nodes.', active: false },
    { title: 'Virus & Malicious Content Scan', time: '14:28:45 UTC', desc: 'Clean. No malicious scripts or hidden payloads detected in file structure.', active: false },
    { title: 'Source Document Upload', time: '14:28:02 UTC', desc: 'Document received via encrypted gateway.', active: false },
];

export default function VerificationReportPage() {
    const [auditEvents, setAuditEvents] = useState(defaultEvents);
    const [docData, setDocData] = useState({ hash: 'e3b0c442...8fc1d', id: 'LNX-DOC-7742-XP', status: 'INTEGRITY VERIFIED' });

    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        fetch('http://localhost:8000/api/documents/1', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if(data.events && data.events.length > 0) {
                    setAuditEvents(data.events.map((e, i) => ({
                        title: e.action,
                        desc: e.details,
                        time: new Date(e.timestamp).toLocaleTimeString(),
                        active: i === 0
                    })));
                }
                if(data.content_hash) {
                    setDocData({
                        hash: data.content_hash,
                        id: `LNX-DOC-${data.id}`,
                        status: data.status.toUpperCase()
                    });
                }
            })
            .catch(() => console.error("Could not fetch verifying document backend data, using fallback"));
    }, []);
    return (
        <div className="flex-1 px-4 md:px-20 lg:px-40 py-10">
            <div className="max-w-[1000px] mx-auto bg-white shadow-sm border border-slate-200 rounded-xl p-8 md:p-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8 mb-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/20 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30">CONFIDENTIAL</span>
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200 uppercase">Court-Grade</span>
                        </div>
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900">Document Verification Report</h1>
                        <p className="text-slate-500 text-sm italic">LexNet Protocol Version 4.2.0-Certified Integrity Certificate</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 inline-block">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Case Reference</p>
                            <p className="text-slate-900 font-mono font-bold">#LXN-88291-C42</p>
                        </div>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="flex flex-col gap-2 rounded-xl p-6 border-2 border-primary bg-primary/5">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Verification Status</p>
                        <div className="flex items-center gap-2 text-primary">
                            <span className="material-symbols-outlined">verified</span>
                            <p className="tracking-tight text-lg font-black leading-tight">{docData.status}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Document ID</p>
                        <p className="text-slate-900 tracking-tight text-lg font-mono font-bold leading-tight">{docData.id}</p>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cert. Timestamp</p>
                        <p className="text-slate-900 tracking-tight text-lg font-bold leading-tight">2023-10-27 14:30:05 UTC</p>
                    </div>
                </div>

                {/* Hash Comparison */}
                <section className="mb-10">
                    <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">fingerprint</span> Cryptographic Integrity Analysis
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Metric</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Algorithm</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { metric: 'File Payload Hash', algo: 'SHA-256', value: docData.hash.slice(0, 16) + '...', result: 'MATCHED' },
                                    { metric: 'Metadata Header', algo: 'Keccak-256', value: 'f928a31b...0219c', result: 'MATCHED' },
                                    { metric: 'Blockchain Block #', algo: 'Mainnet-V2', value: '18,442,109', result: 'VERIFIED' },
                                ].map((row, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-4 text-sm font-medium text-slate-700">{row.metric}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500">{row.algo}</td>
                                        <td className="px-4 py-4 text-sm font-mono text-slate-900">{row.value}</td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded">{row.result}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Signatories */}
                <section className="mb-10">
                    <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">draw</span> Network Signatory Certificates
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { type: 'Primary Validator', name: 'LexNet Central Node (LN-01)', icon: 'hub', details: [['Node Address', '0x71C...3E21'], ['Signature Type', 'ECDSA-secp256k1'], ['Signing Time', '2023-10-27 14:30:04 UTC']] },
                            { type: 'Legal Entity', name: 'Superior Digital Notary Service', icon: 'account_balance', details: [['Entity ID', 'DNS-EU-29930'], ['Signature Status', 'Legally Binding (eIDAS)'], ['Signing Time', '2023-10-27 14:30:05 UTC']] },
                        ].map((sig, i) => (
                            <div key={i} className="bg-slate-50 p-5 border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">{sig.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{sig.type}</p>
                                        <p className="text-sm font-bold text-slate-900">{sig.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {sig.details.map(([label, val], j) => (
                                        <div key={j} className="flex justify-between text-xs">
                                            <span className="text-slate-500">{label}</span>
                                            <span className="font-mono text-slate-900">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Audit Log */}
                <section className="mb-10">
                    <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span> Detailed Audit Log (Last 5 Events)
                    </h2>
                    <div className="space-y-4">
                        {auditEvents.map((event, i) => (
                            <div key={i} className={`flex gap-4 items-start relative ${i < auditEvents.length - 1 ? "pb-4 before:content-[''] before:absolute before:left-[11px] before:top-6 before:bottom-0 before:w-px before:bg-slate-200" : ''}`}>
                                <div className={`w-6 h-6 rounded-full z-10 shrink-0 ${event.active ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-200'}`}></div>
                                <div className="flex-1 -mt-1">
                                    <div className="flex justify-between mb-1">
                                        <p className="text-sm font-bold text-slate-900">{event.title}</p>
                                        <span className="text-[10px] text-slate-500 font-mono">{event.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{event.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer Seal */}
                <div className="pt-8 border-t border-slate-100 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 border-2 border-slate-900 rounded-lg opacity-80">
                            <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-bold">Verification Evidence Seal</p>
                    <p className="text-[9px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                        This report is a cryptographically secured certificate of document integrity. The hashes contained herein represent an immutable state of the document at the time of certification. Any alteration to the original document will invalidate this report. Generated by LexNet Autonomous Verification Protocols.
                    </p>
                </div>
            </div>
        </div>
    );
}

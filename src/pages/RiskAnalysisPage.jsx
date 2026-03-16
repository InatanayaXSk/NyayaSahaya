import React from 'react';

const clauses = [
    { id: 1, section: 'Section 4.2', title: 'Indemnification Scope', risk: 'High Risk', riskColor: 'risk-high', excerpt: '"...unlimited liability for indirect damages including loss of profits..."', active: true },
    { id: 2, section: 'Section 8.1', title: 'Data Processing', risk: 'Medium Risk', riskColor: 'risk-med', excerpt: '"Entity shall process personal data in accordance with internal policies..."' },
    { id: 3, section: 'Section 1.4', title: 'Term and Termination', risk: 'Safe', riskColor: 'risk-safe', excerpt: '"Agreement remains valid for 36 months unless terminated with 90-day notice..."' },
    { id: 4, section: 'Section 12.3', title: 'Arbitration Seat', risk: 'High Risk', riskColor: 'risk-high', excerpt: '"Any dispute shall be governed by laws outside of jurisdiction..."' },
];

export default function RiskAnalysisPage() {
    return (
        <div className="flex flex-col min-h-[calc(100vh-56px)]">
            {/* Sub-header */}
            <div className="px-6 py-4 border-b border-primary/10 bg-white">
                <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Contracts</span>
                        <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
                        <span className="text-slate-400">Real Estate</span>
                        <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
                        <span className="font-medium text-slate-900">Master_Lease_v04_2024.pdf</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-primary/30 text-slate-600 text-sm font-medium hover:bg-slate-50">
                            <span className="material-symbols-outlined text-sm">download</span> Export Report
                        </button>
                        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-slate-900 text-sm font-bold shadow-sm hover:opacity-90">
                            <span className="material-symbols-outlined text-sm">share</span> Share Review
                        </button>
                    </div>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-0 overflow-hidden">
                {/* Left: Clause List */}
                <aside className="col-span-3 border-r border-primary/10 bg-white/50 flex flex-col overflow-y-auto max-h-[calc(100vh-160px)]">
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Clauses Found (12)</h3>
                        <span className="material-symbols-outlined text-slate-400 cursor-pointer">filter_list</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {clauses.map(c => (
                            <div key={c.id} className={`p-4 cursor-pointer hover:bg-primary/20 transition-all border-b border-primary/5 ${c.active ? 'bg-primary/10 border-l-4 border-l-' + c.riskColor : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ${c.riskColor === 'risk-high' ? 'text-risk-high bg-risk-high/10' :
                                            c.riskColor === 'risk-med' ? 'text-risk-med bg-risk-med/10' :
                                                'text-risk-safe bg-risk-safe/10'
                                        }`}>{c.risk}</span>
                                    <span className="text-xs text-slate-400">{c.section}</span>
                                </div>
                                <h4 className="font-semibold text-slate-900 text-sm mb-1">{c.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2 italic">{c.excerpt}</p>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Center: Clause Editor */}
                <section className="col-span-6 bg-white flex flex-col p-8 overflow-y-auto max-h-[calc(100vh-160px)]">
                    <div className="max-w-3xl mx-auto w-full bg-white shadow-xl rounded-lg p-12 border border-primary/10">
                        <div className="mb-8 pb-4 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Section 4.2 Indemnification</h2>
                        </div>
                        <div className="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                            <p>The Tenant shall indemnify, defend, and hold harmless the Landlord from and against any and all claims, demands, causes of action, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or in connection with the Tenant's use or occupancy of the Premises.</p>
                            <p className="bg-risk-high/5 p-4 rounded border-l-4 border-risk-high relative">
                                <mark className="bg-risk-high/20 text-slate-900 px-1">Tenant agrees that its liability under this section shall be unlimited and shall include liability for indirect, incidental, or consequential damages, including but not limited to loss of profits, business interruption, or loss of data, regardless of the cause of action.</mark>
                            </p>
                            <p>The Landlord shall notify the Tenant in writing of any claim for which it seeks indemnification promptly after becoming aware of such claim. The Tenant shall have the right to assume the defense of any such claim with counsel of its own choice.</p>
                        </div>
                        {/* AI Suggested Fix */}
                        <div className="mt-12 p-6 bg-primary/5 rounded-xl border border-primary/20 border-dashed">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">auto_fix_high</span>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">LexNet AI Suggested Fix</h5>
                                    <p className="text-sm text-slate-600 mb-4 italic">"Liability shall be capped at 12 months of annual rent and shall specifically exclude indirect or consequential damages in accordance with standard commercial practices."</p>
                                    <button className="w-full py-2.5 rounded-lg bg-primary text-slate-900 font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]">Apply Suggested Fix</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right: Insights */}
                <aside className="col-span-3 border-l border-primary/10 bg-white/50 flex flex-col overflow-y-auto max-h-[calc(100vh-160px)]">
                    <div className="p-6 border-b border-primary/10">
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-risk-high text-lg">warning</span> Risk Assessment
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500 font-medium">Compliance Score</span>
                                    <span className="text-risk-high font-bold">42%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-risk-high h-full" style={{ width: '42%' }}></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-3 bg-white rounded-lg border border-primary/10">
                                    <h4 className="text-xs font-bold text-slate-900 mb-2">Legal Conflicts</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded text-slate-600">DPDP Act (India)</span>
                                        <span className="bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded text-slate-600">RERA Sec 18</span>
                                        <span className="bg-risk-high/10 text-risk-high text-[10px] font-bold px-2 py-0.5 rounded border border-risk-high/20">Liability Cap Gap</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Analysis Insights</h4>
                                    {[
                                        { icon: 'info', color: 'text-risk-high', title: 'Unconscionability Risk:', text: 'Unlimited liability clauses are often viewed as punitive in many jurisdictions.' },
                                        { icon: 'rule', color: 'text-risk-med', title: 'Deviation:', text: "This clause deviates 85% from your organization's standard 'Gold Template'." },
                                        { icon: 'history', color: 'text-risk-safe', title: 'Precedent:', text: 'Similar clauses resulted in 12% higher litigation costs in the FY23 retail portfolio.' },
                                    ].map((insight, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className={`material-symbols-outlined ${insight.color} text-lg shrink-0`}>{insight.icon}</span>
                                            <p className="text-xs text-slate-600"><strong className="text-slate-900">{insight.title}</strong> {insight.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Compliance Tags */}
                    <div className="p-6">
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4">Compliance Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { icon: 'shield', label: 'DPDP Ready', active: true },
                                { icon: 'apartment', label: 'RERA Compliance' },
                                { icon: 'gavel', label: 'IBC 2016' },
                            ].map((tag, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${tag.active ? 'bg-primary/20 border border-primary text-slate-700' : 'bg-slate-100 border border-slate-200 text-slate-500'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">{tag.icon}</span> {tag.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Footer Status Bar */}
            <footer className="h-10 border-t border-primary/10 bg-white px-6 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-risk-safe">
                        <span className="w-2 h-2 rounded-full bg-risk-safe"></span> AI ENGINE ONLINE
                    </span>
                    <span className="border-l border-slate-200 h-4 mx-2"></span>
                    <span>MODELS: BERT-L-902, GPT-4O-LEGAL</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>LAST SCAN: 2 MINS AGO</span>
                    <span>USER: SNR_COUNSEL_01</span>
                </div>
            </footer>
        </div>
    );
}

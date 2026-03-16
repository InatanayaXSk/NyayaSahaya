import React, { useState } from 'react';

const summaryItems = [
    { icon: 'check_circle', iconColor: 'text-primary', title: 'Use of Premises:', text: 'Tenant is permitted to use the space for general office use only. Any change in business operations requires written consent from the Landlord.' },
    { icon: 'check_circle', iconColor: 'text-primary', title: 'Maintenance Obligations:', text: 'Tenant is responsible for internal non-structural repairs up to $500 per incident. Major repairs remain the Landlord\'s liability.' },
    { icon: 'warning', iconColor: 'text-amber-500', title: 'Early Termination:', text: 'Section 14.2 allows for termination only after year 2 with a 6-month rent penalty.', badge: { text: 'High Risk', color: 'amber' } },
    { icon: 'check_circle', iconColor: 'text-primary', title: 'Liability Cap:', text: 'Total liability for either party is capped at 12 months of gross rent, except in cases of gross negligence.', badge: { text: 'Standard', color: 'emerald' } },
];

const suggestedQuestions = ['How is rent increased?', 'Analyze force majeure', 'Show insurance limits'];

export default function LegalSummaryPage() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I\'ve analyzed the "Commercial Lease Agreement". You can ask me questions about specific clauses, risks, or financial obligations.', time: '09:41 AM' },
        { role: 'user', text: 'What happens if I need to leave before the 3-year term is up?', time: '09:42 AM' },
        { role: 'ai', text: '', time: '09:42 AM', isRich: true },
    ]);
    const [input, setInput] = useState('');

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Summary */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">Real Estate</span>
                            <h1 className="text-3xl font-extrabold tracking-tight">Commercial Lease Agreement</h1>
                            <p className="text-slate-500 mt-1">Version: Oct 2023 • 42 Pages analyzed</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:bg-primary/80 transition-all">
                            <span className="material-symbols-outlined text-xl">download</span> Export
                        </button>
                    </div>

                    {/* Key Terms */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Monthly Rent', value: '$4,250.00', border: 'border-primary' },
                            { label: 'Security Deposit', value: '$8,500.00', border: 'border-primary' },
                            { label: 'Notice Period', value: '90 Days', border: 'border-amber-400' },
                            { label: 'Term', value: '3 Years', border: 'border-emerald-400' },
                        ].map((term, i) => (
                            <div key={i} className={`p-4 bg-background-light rounded-lg border-l-4 ${term.border}`}>
                                <p className="text-xs font-medium text-slate-500 uppercase">{term.label}</p>
                                <p className="text-xl font-bold">{term.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">list_alt</span> Simplified Executive Summary
                            </h3>
                            <ul className="space-y-4">
                                {summaryItems.map((item, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className={`material-symbols-outlined ${item.iconColor} mt-1`}>{item.icon}</span>
                                        <p className="text-slate-700">
                                            <strong className="text-slate-900">{item.title}</strong> {item.text}
                                            {item.badge && (
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ml-2 ring-1 ring-inset ${item.badge.color === 'amber'
                                                        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                        : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                    }`}>{item.badge.text}</span>
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                        <div className="h-px bg-slate-200"></div>
                        <section>
                            <h3 className="text-lg font-bold mb-3">Compliance Checklist</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <span className="text-sm font-medium text-emerald-800 italic">Insurance Requirements met</span>
                                    <span className="material-symbols-outlined text-emerald-600">verified</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 border border-slate-200">
                                    <span className="text-sm font-medium text-slate-600">Sub-leasing rights analysis pending</span>
                                    <span className="material-symbols-outlined text-slate-400">pending</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Right: AI Chat */}
            <div className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)]">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-white">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">LexAI Assistant</h3>
                                <p className="text-xs text-emerald-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Context: Current Agreement
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* AI greeting */}
                        <div className="flex flex-col gap-2 max-w-[85%]">
                            <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 text-sm">
                                Hello! I've analyzed the "Commercial Lease Agreement". You can ask me questions about specific clauses, risks, or financial obligations.
                            </div>
                            <span className="text-[10px] text-slate-400 ml-1">09:41 AM</span>
                        </div>
                        {/* User message */}
                        <div className="flex flex-col gap-2 max-w-[85%] self-end items-end ml-auto">
                            <div className="bg-primary text-slate-900 font-medium rounded-2xl rounded-tr-none p-4 text-sm">
                                What happens if I need to leave before the 3-year term is up?
                            </div>
                            <span className="text-[10px] text-slate-400 mr-1">09:42 AM</span>
                        </div>
                        {/* AI detailed response */}
                        <div className="flex flex-col gap-2 max-w-[85%]">
                            <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 text-sm">
                                <p className="mb-2">According to <strong className="text-primary">Section 14.2 (Termination for Convenience)</strong>:</p>
                                <ul className="list-disc pl-4 space-y-1 mb-2">
                                    <li>You must provide at least 180 days written notice.</li>
                                    <li>The option is only available after the 24th month of the term.</li>
                                    <li>There is an early exit fee equal to 6 months of the current rent ($25,500).</li>
                                </ul>
                                <p className="text-xs font-bold text-amber-600 bg-amber-50 p-2 rounded">Recommendation: Negotiate to reduce the penalty to 3 months.</p>
                            </div>
                            <span className="text-[10px] text-slate-400 ml-1">09:42 AM</span>
                        </div>
                        {/* Suggested Questions */}
                        <div className="flex flex-wrap gap-2 pt-4">
                            {suggestedQuestions.map((q, i) => (
                                <button key={i} className="px-3 py-1.5 rounded-full border border-primary/40 text-xs font-medium hover:bg-primary/10 transition-colors">{q}</button>
                            ))}
                        </div>
                    </div>
                    {/* Input */}
                    <div className="p-4 border-t border-slate-200">
                        <div className="relative">
                            <textarea
                                className="w-full bg-background-light border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-primary focus:border-primary resize-none"
                                placeholder="Ask about specific terms or risks..."
                                rows="2"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            ></textarea>
                            <button className="absolute right-2 bottom-2 p-2 bg-primary text-slate-900 rounded-lg shadow-sm hover:shadow-md transition-all">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2">LexAI provides general information and does not constitute legal advice.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

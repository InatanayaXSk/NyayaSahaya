import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';

const templates = [
    { id: 'rental', name: 'Rental Agreement', icon: 'home_work' },
    { id: 'sale_deed', name: 'Sale Deed', icon: 'description' },
    { id: 'will', name: 'Will / Testament', icon: 'contract_edit' },
    { id: 'power_of_attorney', name: 'Power of Attorney', icon: 'assignment_ind' },
];

const templateClauses = {
    rental: ['Include Maintenance Clause', 'Pet Policy Attachment', 'Sub-letting Restrictions'],
    sale_deed: ['Encumbrance Certificate Clause', 'Title Insurance Requirement', 'Possession Handover Terms'],
    will: ['Residuary Estate Clause', 'Guardian Appointment', 'No-Contest (In Terrorem) Clause'],
    power_of_attorney: ['Revocable by Principal at any time', 'Survives incapacity of Principal', 'Sub-delegation Permitted'],
};

const wizardSteps = {
    rental: [
        { title: 'Lease Type', field: 'leaseType', type: 'select', options: ['Residential', 'Commercial', 'Industrial'], desc: 'What type of property is being leased?' },
        { title: 'Duration', field: 'leaseDuration', type: 'select', options: ['6 Months', '11 Months', '1 Year', '2 Years', '3 Years'], desc: 'How long will the lease last?' },
        { title: 'Furnished?', field: 'furnished', type: 'select', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], desc: 'What is the furnishing status of the property?' },
        { title: 'Escalation', field: 'escalation', type: 'select', options: ['No Escalation', '5% Annual', '10% Annual', 'Custom'], desc: 'Will rent increase over time?' },
    ],
    sale_deed: [
        { title: 'Property Type', field: 'propType', type: 'select', options: ['Residential Plot', 'Agricultural Land', 'Commercial Space', 'Flat/Apartment'], desc: 'What kind of property is being sold?' },
        { title: 'Loan Involved?', field: 'loanInvolved', type: 'select', options: ['No Loan', 'Buyer has Home Loan', 'Seller has Pending Loan'], desc: 'Is there a bank loan involved in this transaction?' },
        { title: 'Registration', field: 'registrationPlan', type: 'select', options: ['Immediate Registration', 'Within 30 Days', 'After Full Payment'], desc: 'When will the deed be registered?' },
    ],
    will: [
        { title: 'Will Type', field: 'willType', type: 'select', options: ['Simple Will', 'Joint Will', 'Conditional Will', 'Holographic Will'], desc: 'What type of will is this?' },
        { title: 'Witnesses', field: 'witnessCount', type: 'select', options: ['2 Witnesses', '3 Witnesses', '4 Witnesses'], desc: 'How many witnesses will attest?' },
        { title: 'Registration', field: 'willRegistration', type: 'select', options: ['Register with Sub-Registrar', 'Keep Unregistered', 'Deposit with Court'], desc: 'How will this will be stored/registered?' },
    ],
    power_of_attorney: [
        { title: 'PoA Type', field: 'powerType', type: 'select', options: ['General', 'Special / Specific', 'Durable', 'Springing'], desc: 'What type of Power of Attorney?' },
        { title: 'Scope', field: 'poaScope', type: 'select', options: ['Property Transactions', 'Banking & Finance', 'Legal Proceedings', 'All of the Above'], desc: 'What will the agent be authorized for?' },
        { title: 'Duration', field: 'poaDuration', type: 'select', options: ['Until Revoked', '1 Year', '2 Years', '5 Years'], desc: 'How long should the PoA be valid?' },
    ],
};

/* ===================== Smart Wizard Modal ===================== */
function SmartWizardModal({ template, onClose, onApply }) {
    const steps = wizardSteps[template] || [];
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});

    const handleSelect = (field, value) => setAnswers(prev => ({ ...prev, [field]: value }));
    const step = steps[current];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-card-dark rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-lavender-grey/20 dark:border-border-dark flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl text-white"><span className="material-symbols-outlined">magic_button</span></div>
                        <div>
                            <h3 className="font-bold dark:text-white">Smart Wizard</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Step {current + 1} of {steps.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl"><span className="material-symbols-outlined dark:text-white">close</span></button>
                </div>
                <div className="p-8">
                    <div className="flex gap-1 mb-8">{steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-slate-200 dark:bg-border-dark'}`} />)}</div>
                    {step && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-bold dark:text-white mb-1">{step.title}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {step.options.map(opt => (
                                    <button key={opt} onClick={() => handleSelect(step.field, opt)}
                                        className={`text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all ${answers[step.field] === opt ? 'border-primary bg-primary/10 text-primary dark:text-primary' : 'border-slate-200 dark:border-border-dark hover:border-primary/50 dark:text-slate-300'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-lavender-grey/20 dark:border-border-dark flex justify-between">
                    <button onClick={() => current > 0 ? setCurrent(current - 1) : onClose()}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark text-sm font-semibold dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-border-dark">
                        {current === 0 ? 'Cancel' : 'Back'}
                    </button>
                    <button disabled={!answers[step?.field]}
                        onClick={() => { if (current < steps.length - 1) setCurrent(current + 1); else { onApply(answers); onClose(); } }}
                        className="px-6 py-2.5 rounded-xl bg-primary text-slate-900 font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-40 hover:scale-[1.02] transition-all">
                        {current < steps.length - 1 ? 'Next' : 'Apply to Draft'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===================== History Panel ===================== */
function HistoryPanel({ onClose, onLoad }) {
    const [history, setHistory] = useState([]);
    useEffect(() => {
        try { setHistory(JSON.parse(localStorage.getItem('lexnet_doc_history') || '[]')); } catch { setHistory([]); }
    }, []);
    const handleDelete = (idx) => {
        const next = history.filter((_, i) => i !== idx);
        setHistory(next);
        localStorage.setItem('lexnet_doc_history', JSON.stringify(next));
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-card-dark rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-lavender-grey/20 dark:border-border-dark flex items-center justify-between shrink-0">
                    <h3 className="font-bold dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">history</span> Draft History</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl"><span className="material-symbols-outlined dark:text-white">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {history.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 py-12 text-sm">No saved drafts yet. Generate a document and it will appear here.</p>}
                    {history.map((h, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">{templates.find(t => t.id === h.template)?.icon || 'description'}</span></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold dark:text-white truncate">{h.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(h.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => { onLoad(h); onClose(); }} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><span className="material-symbols-outlined text-sm">open_in_new</span></button>
                            <button onClick={() => handleDelete(i)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const inputClass = "w-full rounded-xl border-slate-200 dark:border-border-dark dark:bg-card-dark dark:text-white focus:border-primary focus:ring-primary text-sm";
const labelClass = "text-xs font-bold text-slate-500 dark:text-slate-400";
const sectionTitleClass = "font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest";

function SectionHeader({ number, title }) {
    return (
        <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">{number}</span>
            <h4 className={sectionTitleClass}>{title}</h4>
        </div>
    );
}

function RentalForm({ formData, setFormData, clauses, setClauses }) {
    const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const toggleClause = (clause) => setClauses(prev => ({ ...prev, [clause]: !prev[clause] }));
    return (
        <>
            <div className="space-y-4">
                <SectionHeader number="1" title="Parties Involved" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Lessor Name</label>
                        <input className={inputClass} placeholder="Owner full legal name" type="text" value={formData.lessorName || ''} onChange={e => update('lessorName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Lessee Name</label>
                        <input className={inputClass} placeholder="Tenant full legal name" type="text" value={formData.lesseeName || ''} onChange={e => update('lesseeName', e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="2" title="Property Details" />
                <div className="space-y-1.5">
                    <label className={labelClass}>Full Address</label>
                    <textarea className={inputClass} placeholder="Enter complete property address" rows="3" value={formData.address || ''} onChange={e => update('address', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="3" title="Lease Terms" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Monthly Rent (₹)</label>
                        <input className={inputClass} placeholder="0.00" type="number" value={formData.rent || ''} onChange={e => update('rent', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Security Deposit (₹)</label>
                        <input className={inputClass} placeholder="0.00" type="number" value={formData.deposit || ''} onChange={e => update('deposit', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Notice Period</label>
                    <select className={inputClass} value={formData.noticePeriod || '30 Days'} onChange={e => update('noticePeriod', e.target.value)}>
                        <option>30 Days</option><option>60 Days</option><option>90 Days</option>
                    </select>
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="4" title="Additional Clauses" />
                <div className="space-y-3">
                    {templateClauses.rental.map((clause, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input checked={!!clauses[clause]} onChange={() => toggleClause(clause)} className="rounded text-primary focus:ring-primary" type="checkbox" />
                            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{clause}</span>
                        </label>
                    ))}
                </div>
            </div>
        </>
    );
}

function SaleDeedForm({ formData, setFormData }) {
    const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    return (
        <>
            <div className="space-y-4">
                <SectionHeader number="1" title="Seller Details" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Seller Name</label>
                        <input className={inputClass} placeholder="Full legal name" type="text" value={formData.sellerName || ''} onChange={e => update('sellerName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Seller Address</label>
                        <input className={inputClass} placeholder="Residential address" type="text" value={formData.sellerAddress || ''} onChange={e => update('sellerAddress', e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="2" title="Buyer Details" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Buyer Name</label>
                        <input className={inputClass} placeholder="Full legal name" type="text" value={formData.buyerName || ''} onChange={e => update('buyerName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Buyer Address</label>
                        <input className={inputClass} placeholder="Residential address" type="text" value={formData.buyerAddress || ''} onChange={e => update('buyerAddress', e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="3" title="Property Information" />
                <div className="space-y-1.5">
                    <label className={labelClass}>Property Description</label>
                    <textarea className={inputClass} placeholder="Full property description with survey number, boundaries etc." rows="3" value={formData.propertyDesc || ''} onChange={e => update('propertyDesc', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Property Address</label>
                    <textarea className={inputClass} placeholder="Complete property address" rows="2" value={formData.propertyAddress || ''} onChange={e => update('propertyAddress', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="4" title="Sale Consideration" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Sale Price (₹)</label>
                        <input className={inputClass} placeholder="0.00" type="number" value={formData.salePrice || ''} onChange={e => update('salePrice', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Earnest Money (₹)</label>
                        <input className={inputClass} placeholder="0.00" type="number" value={formData.earnestMoney || ''} onChange={e => update('earnestMoney', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Payment Mode</label>
                    <select className={inputClass} value={formData.paymentMode || 'Bank Transfer'} onChange={e => update('paymentMode', e.target.value)}>
                        <option>Bank Transfer</option><option>Cheque</option><option>Demand Draft</option>
                    </select>
                </div>
            </div>
        </>
    );
}

function WillForm({ formData, setFormData }) {
    const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    return (
        <>
            <div className="space-y-4">
                <SectionHeader number="1" title="Testator Details" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Full Name</label>
                        <input className={inputClass} placeholder="Testator's full legal name" type="text" value={formData.testatorName || ''} onChange={e => update('testatorName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Age</label>
                        <input className={inputClass} placeholder="Age" type="number" value={formData.testatorAge || ''} onChange={e => update('testatorAge', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Address</label>
                    <textarea className={inputClass} placeholder="Current residential address" rows="2" value={formData.testatorAddress || ''} onChange={e => update('testatorAddress', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="2" title="Beneficiaries" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Primary Beneficiary</label>
                        <input className={inputClass} placeholder="Full name" type="text" value={formData.beneficiary1 || ''} onChange={e => update('beneficiary1', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Relationship</label>
                        <input className={inputClass} placeholder="e.g. Son, Daughter, Spouse" type="text" value={formData.relationship1 || ''} onChange={e => update('relationship1', e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Secondary Beneficiary</label>
                        <input className={inputClass} placeholder="Full name (optional)" type="text" value={formData.beneficiary2 || ''} onChange={e => update('beneficiary2', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Relationship</label>
                        <input className={inputClass} placeholder="e.g. Son, Daughter" type="text" value={formData.relationship2 || ''} onChange={e => update('relationship2', e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="3" title="Assets & Distribution" />
                <div className="space-y-1.5">
                    <label className={labelClass}>Assets Description</label>
                    <textarea className={inputClass} placeholder="Describe the assets to be distributed (properties, bank accounts, investments, etc.)" rows="4" value={formData.assets || ''} onChange={e => update('assets', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Distribution Instructions</label>
                    <textarea className={inputClass} placeholder="How should the assets be divided among beneficiaries?" rows="3" value={formData.distribution || ''} onChange={e => update('distribution', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="4" title="Executor" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Executor Name</label>
                        <input className={inputClass} placeholder="Person to execute the will" type="text" value={formData.executorName || ''} onChange={e => update('executorName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Executor Relationship</label>
                        <input className={inputClass} placeholder="Relationship to testator" type="text" value={formData.executorRelation || ''} onChange={e => update('executorRelation', e.target.value)} />
                    </div>
                </div>
            </div>
        </>
    );
}

function PowerOfAttorneyForm({ formData, setFormData, clauses, setClauses }) {
    const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const toggleClause = (clause) => setClauses(prev => ({ ...prev, [clause]: !prev[clause] }));
    return (
        <>
            <div className="space-y-4">
                <SectionHeader number="1" title="Principal (Grantor)" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Full Name</label>
                        <input className={inputClass} placeholder="Principal's full legal name" type="text" value={formData.principalName || ''} onChange={e => update('principalName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Age</label>
                        <input className={inputClass} placeholder="Age" type="number" value={formData.principalAge || ''} onChange={e => update('principalAge', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Address</label>
                    <textarea className={inputClass} placeholder="Residential address" rows="2" value={formData.principalAddress || ''} onChange={e => update('principalAddress', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="2" title="Agent (Attorney-in-Fact)" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Full Name</label>
                        <input className={inputClass} placeholder="Agent's full legal name" type="text" value={formData.agentName || ''} onChange={e => update('agentName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Relationship</label>
                        <input className={inputClass} placeholder="Relationship to principal" type="text" value={formData.agentRelation || ''} onChange={e => update('agentRelation', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Address</label>
                    <textarea className={inputClass} placeholder="Agent's residential address" rows="2" value={formData.agentAddress || ''} onChange={e => update('agentAddress', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="3" title="Powers Granted" />
                <div className="space-y-1.5">
                    <label className={labelClass}>Type of Power</label>
                    <select className={inputClass} value={formData.powerType || 'General'} onChange={e => update('powerType', e.target.value)}>
                        <option>General</option><option>Special / Specific</option><option>Durable</option><option>Springing</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Specific Powers Description</label>
                    <textarea className={inputClass} placeholder="Describe the specific powers being granted (e.g., property sale, bank transactions, legal proceedings)" rows="4" value={formData.powersDesc || ''} onChange={e => update('powersDesc', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <SectionHeader number="4" title="Duration & Conditions" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Effective Date</label>
                        <input className={inputClass} type="date" value={formData.effectiveDate || ''} onChange={e => update('effectiveDate', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Expiry Date</label>
                        <input className={inputClass} type="date" value={formData.expiryDate || ''} onChange={e => update('expiryDate', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-3">
                    {templateClauses.power_of_attorney.map((clause, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input checked={!!clauses[clause]} onChange={() => toggleClause(clause)} className="rounded text-primary focus:ring-primary" type="checkbox" />
                            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{clause}</span>
                        </label>
                    ))}
                </div>
            </div>
        </>
    );
}

function ActiveClausesPreview({ clauses }) {
    const active = Object.entries(clauses).filter(([, v]) => v).map(([k]) => k);
    if (active.length === 0) return null;
    return (
        <div className="mt-6">
            <p className="font-bold mb-2">ADDITIONAL CLAUSES:</p>
            <div className="space-y-3 pl-4">
                {active.map((clause, i) => (
                    <p key={i}><strong>{i + 1}.</strong> {clause}: The parties mutually agree to abide by the terms and conditions stipulated under this clause as applicable under the governing law.</p>
                ))}
            </div>
        </div>
    );
}

function getPreviewContent(selectedTemplate, formData, clauses) {
    switch (selectedTemplate) {
        case 'rental':
            return {
                title: 'Residential Rental Agreement',
                content: (
                    <div className="space-y-6 text-sm leading-relaxed text-justify">
                        <p>This <span className="bg-primary/20 px-1 font-bold">RESIDENTIAL RENTAL AGREEMENT</span> is made and entered into this <span className="bg-slate-100 px-1 border-b border-slate-300">[Date]</span>, by and between:</p>
                        <div>
                            <p className="font-bold mb-2">1. THE LESSOR (OWNER):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.lessorName || '[Enter Lessor Name in Form]'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-2">2. THE LESSEE (TENANT):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.lesseeName || '[Enter Lessee Name in Form]'}</p>
                        </div>
                        <p className="font-bold">WHEREAS:</p>
                        <p>The Lessor is the lawful owner of the premises located at <span className="italic text-slate-400">{formData.address || '[Property Address will appear here]'}</span> and has agreed to let the premises to the Lessee for residential purposes only under the following terms and conditions:</p>
                        <div className="space-y-4 pl-4">
                            <p><strong>TERM:</strong> The lease shall be for a period of <span className="font-bold">11 months</span> commencing from the effective date.</p>
                            <p><strong>RENT:</strong> The Lessee agrees to pay a monthly rent of <span className="font-bold">₹ {formData.rent || '[Amount]'}</span>, payable on or before the 5th of each month.</p>
                            <p><strong>DEPOSIT:</strong> An interest-free security deposit of <span className="font-bold">₹ {formData.deposit || '[Amount]'}</span> shall be held by the Lessor.</p>
                            <p><strong>NOTICE PERIOD:</strong> Either party must provide <span className="font-bold">{formData.noticePeriod || '30 Days'}</span> written notice before termination.</p>
                        </div>
                        <ActiveClausesPreview clauses={clauses} />
                    </div>
                ),
            };
        case 'sale_deed':
            return {
                title: 'Sale Deed',
                content: (
                    <div className="space-y-6 text-sm leading-relaxed text-justify">
                        <p>This <span className="bg-primary/20 px-1 font-bold">SALE DEED</span> is executed on this <span className="bg-slate-100 px-1 border-b border-slate-300">[Date]</span>, at the Sub-Registrar's Office.</p>
                        <div>
                            <p className="font-bold mb-2">1. THE SELLER (VENDOR):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.sellerName || '[Enter Seller Name]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Residing at: {formData.sellerAddress || '[Seller Address]'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-2">2. THE BUYER (PURCHASER):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.buyerName || '[Enter Buyer Name]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Residing at: {formData.buyerAddress || '[Buyer Address]'}</p>
                        </div>
                        <p className="font-bold">PROPERTY DESCRIPTION:</p>
                        <p className="italic text-slate-400">{formData.propertyDesc || '[Property description will appear here]'}</p>
                        <p>Located at: <span className="italic text-slate-400">{formData.propertyAddress || '[Property Address]'}</span></p>
                        <div className="space-y-4 pl-4">
                            <p><strong>SALE CONSIDERATION:</strong> The total sale price agreed upon is <span className="font-bold">₹ {formData.salePrice || '[Amount]'}</span>.</p>
                            <p><strong>EARNEST MONEY:</strong> An amount of <span className="font-bold">₹ {formData.earnestMoney || '[Amount]'}</span> has been paid as earnest money.</p>
                            <p><strong>PAYMENT MODE:</strong> <span className="font-bold">{formData.paymentMode || 'Bank Transfer'}</span></p>
                        </div>
                        <p>The Seller hereby transfers all rights, title, and interest in the said property to the Buyer, free from all encumbrances, liens, and claims.</p>
                        <ActiveClausesPreview clauses={clauses} />
                    </div>
                ),
            };
        case 'will':
            return {
                title: 'Last Will and Testament',
                content: (
                    <div className="space-y-6 text-sm leading-relaxed text-justify">
                        <p>This <span className="bg-primary/20 px-1 font-bold">LAST WILL AND TESTAMENT</span> is made on this <span className="bg-slate-100 px-1 border-b border-slate-300">[Date]</span>.</p>
                        <div>
                            <p className="font-bold mb-2">TESTATOR:</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.testatorName || '[Enter Testator Name]'}, Age: {formData.testatorAge || '[Age]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Residing at: {formData.testatorAddress || '[Address]'}</p>
                        </div>
                        <p>I, the undersigned, being of sound mind and disposing memory, do hereby declare this to be my Last Will and Testament, revoking all previous wills and codicils.</p>
                        <div>
                            <p className="font-bold mb-2">BENEFICIARIES:</p>
                            <div className="pl-4 space-y-2">
                                <p>1. <span className="font-semibold">{formData.beneficiary1 || '[Primary Beneficiary]'}</span> — {formData.relationship1 || '[Relationship]'}</p>
                                {formData.beneficiary2 && <p>2. <span className="font-semibold">{formData.beneficiary2}</span> — {formData.relationship2 || '[Relationship]'}</p>}
                            </div>
                        </div>
                        <div>
                            <p className="font-bold mb-2">ASSETS:</p>
                            <p className="italic text-slate-400">{formData.assets || '[Assets description will appear here]'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-2">DISTRIBUTION:</p>
                            <p className="italic text-slate-400">{formData.distribution || '[Distribution instructions will appear here]'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-2">EXECUTOR:</p>
                            <p>I appoint <span className="font-semibold">{formData.executorName || '[Executor Name]'}</span> ({formData.executorRelation || '[Relationship]'}) as the Executor of this Will.</p>
                        </div>
                        <ActiveClausesPreview clauses={clauses} />
                    </div>
                ),
            };
        case 'power_of_attorney':
            return {
                title: 'Power of Attorney',
                content: (
                    <div className="space-y-6 text-sm leading-relaxed text-justify">
                        <p>This <span className="bg-primary/20 px-1 font-bold">POWER OF ATTORNEY</span> is executed on this <span className="bg-slate-100 px-1 border-b border-slate-300">[Date]</span>.</p>
                        <div>
                            <p className="font-bold mb-2">PRINCIPAL (GRANTOR):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.principalName || '[Enter Principal Name]'}, Age: {formData.principalAge || '[Age]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Residing at: {formData.principalAddress || '[Address]'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-2">AGENT (ATTORNEY-IN-FACT):</p>
                            <p className="border-b border-dashed border-slate-300 pb-1 italic text-slate-400">{formData.agentName || '[Enter Agent Name]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Relationship: {formData.agentRelation || '[Relationship]'}</p>
                            <p className="text-xs text-slate-400 mt-1">Residing at: {formData.agentAddress || '[Address]'}</p>
                        </div>
                        <p>I, the Principal, do hereby appoint the above-named Agent as my true and lawful Attorney-in-Fact with the following powers:</p>
                        <div className="space-y-4 pl-4">
                            <p><strong>TYPE:</strong> <span className="font-bold">{formData.powerType || 'General'}</span> Power of Attorney</p>
                            <p><strong>POWERS:</strong> <span className="italic text-slate-400">{formData.powersDesc || '[Powers description will appear here]'}</span></p>
                            <p><strong>EFFECTIVE:</strong> From <span className="font-bold">{formData.effectiveDate || '[Start Date]'}</span> to <span className="font-bold">{formData.expiryDate || '[End Date]'}</span></p>
                        </div>
                        <ActiveClausesPreview clauses={clauses} />
                    </div>
                ),
            };
        default:
            return { title: '', content: null };
    }
}

export default function DocumentGeneratorPage() {
    const [selectedTemplate, setSelectedTemplate] = useState('rental');
    const [isGenerating, setIsGenerating] = useState(false);
    const [formData, setFormData] = useState({});
    const [clauses, setClauses] = useState({});
    const [showWizard, setShowWizard] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const previewRef = useRef(null);

    const handleTemplateChange = (id) => {
        setSelectedTemplate(id);
        setFormData({});
        setClauses({});
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            // Save to history
            try {
                const prev = JSON.parse(localStorage.getItem('lexnet_doc_history') || '[]');
                const entry = { template: selectedTemplate, title: templates.find(t => t.id === selectedTemplate)?.name || selectedTemplate, formData, clauses, timestamp: Date.now() };
                const updated = [entry, ...prev].slice(0, 20);
                localStorage.setItem('lexnet_doc_history', JSON.stringify(updated));
            } catch { /* ignore quota errors */ }
        }, 2000);
    };

    const handleExport = () => {
        const el = previewRef.current;
        if (!el) return;
        html2pdf().set({ margin: 0.5, filename: `${selectedTemplate}_draft.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(el).save();
    };

    const handleLoadHistory = (entry) => {
        setSelectedTemplate(entry.template);
        setFormData(entry.formData || {});
        setClauses(entry.clauses || {});
    };

    const handleWizardApply = (answers) => {
        setFormData(prev => ({ ...prev, ...answers }));
    };

    const preview = getPreviewContent(selectedTemplate, formData, clauses);

    const formComponents = {
        rental: <RentalForm formData={formData} setFormData={setFormData} clauses={clauses} setClauses={setClauses} />,
        sale_deed: <SaleDeedForm formData={formData} setFormData={setFormData} />,
        will: <WillForm formData={formData} setFormData={setFormData} />,
        power_of_attorney: <PowerOfAttorneyForm formData={formData} setFormData={setFormData} clauses={clauses} setClauses={setClauses} />,
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <span>Legal Tools</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">AI Document Generator</span>
                    </nav>
                    <h1 className="text-4xl font-extrabold tracking-tight dark:text-white">Generate Legal Instrument</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl">Intelligent drafting powered by LexNet Juris AI. Select a template and provide details to generate a legally compliant draft.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowHistory(true)} className="px-5 py-2.5 rounded-xl border border-lavender-grey dark:border-border-dark font-semibold text-sm hover:bg-white dark:hover:bg-card-dark transition-all flex items-center gap-2 dark:text-slate-300">
                        <span className="material-symbols-outlined text-lg">history</span> History
                    </button>
                    <button onClick={() => setShowWizard(true)} className="px-5 py-2.5 rounded-xl bg-primary text-slate-900 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">magic_button</span> Smart Wizard
                    </button>
                </div>
            </div>

            {/* Template Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => handleTemplateChange(t.id)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-card-dark shadow-sm hover:shadow-md transition-all group ${selectedTemplate === t.id ? 'border-2 border-primary' : 'border border-lavender-grey/40 dark:border-border-dark hover:border-primary/50'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === t.id
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 dark:bg-background-dark text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                            }`}>
                            <span className="material-symbols-outlined text-3xl">{t.icon}</span>
                        </div>
                        <span className={`font-bold ${selectedTemplate === t.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{t.name}</span>
                    </button>
                ))}
            </div>

            {/* Drafting Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ minHeight: 700 }}>
                {/* Form Side */}
                <div className="lg:col-span-5 bg-white dark:bg-card-dark rounded-3xl border border-lavender-grey/30 dark:border-border-dark shadow-xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-lavender-grey/20 dark:border-border-dark flex items-center justify-between">
                        <h3 className="font-bold text-lg dark:text-white">Document Details</h3>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Drafting Mode</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                        {formComponents[selectedTemplate]}
                    </div>
                    <div className="p-6 border-t border-lavender-grey/20 dark:border-border-dark bg-slate-50 dark:bg-background-dark">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-4 bg-primary text-slate-900 font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-60"
                        >
                            <span className="material-symbols-outlined font-bold">{isGenerating ? 'hourglass_top' : 'article'}</span>
                            {isGenerating ? 'Generating...' : 'Generate Draft'}
                        </button>
                    </div>
                </div>

                {/* Preview Side */}
                <div className="lg:col-span-7 bg-slate-900/5 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-lavender-grey/40 dark:border-border-dark flex flex-col overflow-hidden relative">
                    {/* Toolbar */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2 bg-white/90 dark:bg-card-dark/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/40 dark:border-border-dark">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Live Preview</span>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            {[{icon: 'zoom_in', action: null}, {icon: 'download', action: handleExport}, {icon: 'print', action: () => window.print()}].map(({icon, action}) => (
                                <button key={icon} onClick={action} className="p-2 bg-white dark:bg-card-dark rounded-xl shadow-md text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* PDF Preview */}
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-slate-200/50 dark:bg-background-dark/50">
                        <div ref={previewRef} className="bg-white w-full max-w-[650px] min-h-[1000px] shadow-2xl rounded-sm p-16 flex flex-col gap-8 text-slate-800">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-slate-800 pb-2">{preview.title}</h2>
                                <p className="text-[10px] text-slate-400">DRAFT GENERATED VIA LEXNET AI ENGINE v4.2</p>
                            </div>
                            {preview.content}
                            <div className="mt-12 pt-8 border-t border-slate-200">
                                <p className="text-xs italic text-slate-500">Note: This is an AI-generated draft. While LexNet provides high-quality legal templates, we recommend professional legal review for complex transactions.</p>
                            </div>
                            {/* Watermark */}
                            <div className="mt-auto flex justify-between items-end opacity-20">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-4xl">verified_user</span>
                                    <div className="text-[8px] font-bold">AUTHENTICATED<br />LEXNET DRAFT</div>
                                </div>
                                <div className="w-24 h-24 bg-slate-200 rounded-sm flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-card-dark text-white px-6 py-3 rounded-full flex items-center gap-8 shadow-2xl z-50 dark:border dark:border-border-dark">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    <span className="text-xs font-bold tracking-widest uppercase opacity-70">Model Status: Active</span>
                </div>
                <div className="h-4 w-px bg-white/20"></div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                    <span className="text-xs font-bold tracking-widest uppercase">Processing Speed: 1.2s</span>
                </div>
                <div className="h-4 w-px bg-white/20"></div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">workspace_premium</span>
                    <span className="text-xs font-bold tracking-widest uppercase">Precision: 99.8%</span>
                </div>
            </div>

            {/* Modals */}
            {showWizard && <SmartWizardModal template={selectedTemplate} onClose={() => setShowWizard(false)} onApply={handleWizardApply} />}
            {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} onLoad={handleLoadHistory} />}
        </div>
    );
}

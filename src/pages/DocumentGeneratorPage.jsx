import React, { useState, useRef, useEffect } from 'react';

/* ===================== Smart Wizard Modal ===================== */
function SmartWizardModal({ template, onClose, onApply, wizardSteps }) {
    const steps = wizardSteps[template] || [];
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});

    const handleSelect = (field, value) => setAnswers(prev => ({ ...prev, [field]: value }));
    const step = steps[current];

    if (steps.length === 0) return null;

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
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">description</span></div>
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

export default function DocumentGeneratorPage() {
    const [templates] = useState([
        { id: 'rental', name: 'Rental Agreement', icon: 'home_work' },
        { id: 'sale_deed', name: 'Sale Deed', icon: 'description' },
        { id: 'will', name: 'Will / Testament', icon: 'contract_edit' },
        { id: 'power_of_attorney', name: 'Power of Attorney', icon: 'assignment_ind' },
    ]);
    const [selectedTemplate, setSelectedTemplate] = useState('rental');
    const [templateData, setTemplateData] = useState({ content: '', placeholders: [] });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    const [formData, setFormData] = useState({});
    const [previewContent, setPreviewContent] = useState('');
    const [showWizard, setShowWizard] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [lastDownloadUrl, setLastDownloadUrl] = useState('');
    const previewRef = useRef(null);

    const wizardSteps = {
        rental: [
            { title: 'Lease Type', field: '(Lease Type)', type: 'select', options: ['Residential', 'Commercial', 'Industrial'], desc: 'What type of property is being leased?' },
            { title: 'Duration', field: '(Duration)', type: 'select', options: ['6 Months', '11 Months', '1 Year', '2 Years', '3 Years'], desc: 'How long will the lease last?' },
        ],
    };

    // Fetch template content from backend
    useEffect(() => {
        const fetchTemplate = async () => {
            setIsLoadingTemplate(true);
            try {
                const response = await fetch(`http://localhost:8000/api/templates/${selectedTemplate}`);
                const data = await response.json();
                setTemplateData(data);
                setPreviewContent(data.content);
                
                const initialData = {};
                data.placeholders.forEach(p => {
                    initialData[p] = ''; 
                });
                setFormData(initialData);
            } catch (error) {
                console.error("Failed to fetch template", error);
            } finally {
                setIsLoadingTemplate(false);
            }
        };
        fetchTemplate();
    }, [selectedTemplate]);

    // Update preview when form data changes
    useEffect(() => {
        let updatedContent = templateData.content;
        Object.entries(formData).forEach(([placeholder, value]) => {
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (value) {
                updatedContent = updatedContent.replace(new RegExp(escapedPlaceholder, 'g'), `<span class="bg-primary/20 px-1 font-bold text-slate-900">${value}</span>`);
            } else {
                updatedContent = updatedContent.replace(new RegExp(escapedPlaceholder, 'g'), `<span class="bg-slate-100 text-slate-400 border-b border-dashed border-slate-300 px-1">${placeholder}</span>`);
            }
        });
        setPreviewContent(updatedContent);
    }, [formData, templateData]);

    const handleGenerate = async () => {
        const unfilled = templateData.placeholders.filter(p => !formData[p]);
        if (unfilled.length > 0) {
            alert(`Please fill in all placeholders: ${unfilled.slice(0,3).join(', ')}...`);
            return;
        }

        setIsGenerating(true);
        try {
            const templateName = templates.find(t => t.id === selectedTemplate)?.name || selectedTemplate;
            const payload = {
                document_type: templateName,
                data: formData,
            };
            
            const response = await fetch('http://localhost:8000/api/generate-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.success) {
                const prev = JSON.parse(localStorage.getItem('lexnet_doc_history') || '[]');
                const entry = { 
                    template: selectedTemplate, 
                    title: templateName, 
                    formData, 
                    timestamp: Date.now(),
                    doc_hash: result.doc_hash,
                    public_id: result.public_id,
                    download_url: result.cloudinary_url
                };
                localStorage.setItem('lexnet_doc_history', JSON.stringify([entry, ...prev].slice(0, 20)));
                // Safe Anchor Download (to bypass Chrome 'Unsafe attempt' errors)
                const downloadUrl = result.cloudinary_url;
                setLastDownloadUrl(downloadUrl);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', `${templateName}_final.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert("Error connecting to Document Generation Engine");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLoadHistory = (entry) => {
        setSelectedTemplate(entry.template);
        setFormData(entry.formData || {});
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
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-card-dark shadow-sm hover:shadow-md transition-all group ${selectedTemplate === t.id ? 'border-2 border-primary' : 'border border-lavender-grey/40 dark:border-border-dark hover:border-primary/50'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === t.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-background-dark text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                            <span className="material-symbols-outlined text-3xl">{t.icon}</span>
                        </div>
                        <span className={`font-bold ${selectedTemplate === t.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{t.name}</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ minHeight: 700 }}>
                {/* Form Side */}
                <div className="lg:col-span-5 bg-white dark:bg-card-dark rounded-3xl border border-lavender-grey/30 dark:border-border-dark shadow-xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-lavender-grey/20 dark:border-border-dark flex items-center justify-between">
                        <h3 className="font-bold text-lg dark:text-white">Document Details</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                        {isLoadingTemplate ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Template...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <SectionHeader number="1" title="Fill Placeholders" />
                                {templateData.placeholders.map((p, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <label className={labelClass}>{p.replace(/[()]/g, '').trim() || 'Field'}</label>
                                        <input className={inputClass} placeholder={`Enter ${p}`} type="text" value={formData[p] || ''} onChange={e => setFormData(prev => ({ ...prev, [p]: e.target.value }))} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-lavender-grey/20 dark:border-border-dark bg-slate-50 dark:bg-background-dark flex flex-col gap-3">
                        <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-primary text-slate-900 font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-60">
                            <span className="material-symbols-outlined font-bold">{isGenerating ? 'hourglass_top' : 'article'}</span>
                            {isGenerating ? 'Generating...' : 'Generate & Store in Cloud'}
                        </button>
                        
                        {lastDownloadUrl && (
                            <a 
                                href={lastDownloadUrl}
                                download
                                className="w-full py-3 bg-white dark:bg-card-dark text-primary border-2 border-primary rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-all text-sm decoration-none"
                            >
                                <span className="material-symbols-outlined">download_for_offline</span>
                                Download Final PDF
                            </a>
                        )}
                    </div>
                </div>

                {/* Preview Side */}
                <div className="lg:col-span-7 bg-slate-900/5 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-lavender-grey/40 dark:border-border-dark flex flex-col overflow-hidden relative">
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2 bg-white/90 dark:bg-card-dark/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/40 dark:border-border-dark">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Live Preview</span>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-slate-200/50 dark:bg-background-dark/50">
                        <div ref={previewRef} className="bg-white w-full max-w-[650px] min-h-[1000px] shadow-2xl rounded-sm p-16 flex flex-col gap-8 text-slate-800">
                             <div className="text-center space-y-2 mb-4">
                                <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-slate-800 pb-2">{templates.find(t=>t.id===selectedTemplate)?.name}</h2>
                                <p className="text-[10px] text-slate-400">DRAFT GENERATED VIA LEXNET AI ENGINE v4.2</p>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-justify outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setPreviewContent(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: previewContent }} />
                            <div className="mt-auto flex justify-between items-end opacity-20">
                                <div className="flex items-center gap-1"><span className="material-symbols-outlined text-4xl">verified_user</span><div className="text-[8px] font-bold">AUTHENTICATED<br />LEXNET DRAFT</div></div>
                                <div className="w-24 h-24 bg-slate-200 rounded-sm flex items-center justify-center"><span className="material-symbols-outlined text-4xl">qr_code_2</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-card-dark text-white px-6 py-3 rounded-full flex items-center gap-8 shadow-2xl z-50 dark:border dark:border-border-dark">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-xs font-bold tracking-widest uppercase opacity-70">Cloud Storage: Active</span></div>
                <div className="h-4 w-px bg-white/20"></div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">bolt</span><span className="text-xs font-bold tracking-widest uppercase">Secure Storage</span></div>
            </div>

            {showWizard && <SmartWizardModal template={selectedTemplate} onClose={() => setShowWizard(false)} onApply={(a) => setFormData(p => ({...p, ...a}))} wizardSteps={wizardSteps} />}
            {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} onLoad={handleLoadHistory} />}
        </div>
    );
}

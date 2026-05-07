import React, { useState, useRef, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';

import { API_BASE } from '../utils/api';


/* ===================== Signature Drawing Pad ===================== */
function SignaturePad({ value, onChange, label }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        // Get primary color from CSS variable for the ink
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3b82f6';
        ctx.strokeStyle = `rgb(${primaryColor})`; 
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Load existing signature if present
        if (value && value.startsWith('data:image')) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = value;
        }
    }, [value]);

    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        return {
            x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
            y: (clientY - rect.top) * (canvasRef.current.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const dataUrl = canvasRef.current.toDataURL();
        onChange(dataUrl);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onChange('');
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</label>
                <button onClick={clear} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 transition-all">Reset Sequence</button>
            </div>
            <div className="relative group">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full h-32 bg-background border-2 border-dashed border-border rounded-2xl cursor-crosshair touch-none transition-all group-hover:border-primary/40"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!value && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-4xl text-text-base">draw</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Draw Cryptographic Signature</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ===================== Smart Wizard Modal ===================== */
function SmartWizardModal({ template, onClose, onApply, wizardSteps }) {
    const steps = wizardSteps[template] || [];
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});

    const handleSelect = (field, value) => setAnswers(prev => ({ ...prev, [field]: value }));
    const step = steps[current];

    if (steps.length === 0) return null;

    return (
        <FocusTrap>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-border" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-border bg-surface/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">auto_fix</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-text-base">Smart Wizard</h3>
                                <p className="text-xs text-text-muted">Step {current + 1} of {steps.length}</p>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Close wizard" className="p-2 hover:bg-primary/10 rounded-xl transition-colors"><span className="material-symbols-outlined text-text-base">close</span></button>
                    </div>
                    <div className="p-8">
                        <div className="flex gap-1 mb-8">{steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-border'}`} />)}</div>
                        {step && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-lg font-bold text-text-base mb-1">{step.title}</h4>
                                    <p className="text-sm text-text-muted">{step.desc}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {step.options.map(opt => (
                                        <button key={opt} onClick={() => handleSelect(step.field, opt)}
                                            className={`text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all ${answers[step.field] === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 text-text-muted hover:text-text-base'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-border flex justify-between bg-surface/50">
                        <button onClick={() => current > 0 ? setCurrent(current - 1) : onClose()}
                            className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-muted hover:bg-primary/5 transition-colors">
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
        </FocusTrap>
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
        <FocusTrap>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col border border-border" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface/50">
                        <h3 className="font-bold text-text-base flex items-center gap-2"><span className="material-symbols-outlined text-primary">history</span> Draft History</h3>
                        <button onClick={onClose} aria-label="Close history" className="p-2 hover:bg-primary/10 rounded-xl transition-colors"><span className="material-symbols-outlined text-text-base">close</span></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        {history.length === 0 && <p className="text-center text-text-muted py-12 text-sm">No saved drafts yet. Generate a document and it will appear here.</p>}
                        {history.map((h, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">description</span></div>
                                    <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-text-base truncate">{h.title}</p>
                                    <p className="text-xs text-text-muted">{new Date(h.timestamp).toLocaleString()}</p>
                                </div>
                                <button onClick={() => { onLoad(h); onClose(); }} aria-label="Load draft" className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"><span className="material-symbols-outlined text-sm">open_in_new</span></button>
                                <button onClick={() => handleDelete(i)} aria-label="Delete draft" className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </FocusTrap>
    );
}

const inputClass = "w-full rounded-xl border-border bg-background text-text-base focus:border-primary focus:ring-primary text-xs font-bold uppercase tracking-tight py-3 px-5 transition-all";
const labelClass = "text-[10px] font-black text-text-muted uppercase tracking-[0.2em]";
const sectionTitleClass = "font-black text-text-base uppercase text-[10px] tracking-[0.3em]";

function SectionHeader({ number, title }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/20 text-primary text-[10px] font-black">{number}</span>
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

    const { token } = useAuth();

    // Initial Cache Sync & Template Load
    useEffect(() => {
        const fetchTemplate = async () => {
            if (!token) return;

            setIsLoadingTemplate(true);
            try {
                const response = await fetch(`${API_BASE}/templates/${selectedTemplate}`, {

                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                
                // 1. Check Local Cache (Timestamp Synergy)
                const cacheKey = `lexnet_draft_${selectedTemplate}`;
                const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
                
                setTemplateData(data);
                
                if (cached && cached.timestamp > (data.updated_at || 0)) {
                    console.log(`[LexNet] Restoring newer local draft for ${selectedTemplate}`);
                    setFormData(cached.data);
                } else {
                    const initialData = {};
                    data.placeholders.forEach(p => {
                        initialData[p] = ''; 
                    });
                    setFormData(initialData);
                }
            } catch (error) {
                console.error("Failed to fetch template", error);
            } finally {
                setIsLoadingTemplate(false);
            }
        };
        fetchTemplate();
    }, [selectedTemplate, token]);

    // Auto-Save Effect
    useEffect(() => {
        if (Object.keys(formData).length > 0) {
            const cacheKey = `lexnet_draft_${selectedTemplate}`;
            const syncData = {
                timestamp: Date.now(),
                data: formData
            };
            localStorage.setItem(cacheKey, JSON.stringify(syncData));
        }
    }, [formData, selectedTemplate]);

    // Update preview when form data changes
    useEffect(() => {
        let updatedContent = templateData.content;
        Object.entries(formData).forEach(([placeholder, value]) => {
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (value) {
                if (value.startsWith('data:image')) {
                    // Render Signature Image
                    updatedContent = updatedContent.replace(new RegExp(escapedPlaceholder, 'g'), `<img src="${value}" class="inline-block max-h-12 align-middle border-b border-primary/30" />`);
                } else {
                    updatedContent = updatedContent.replace(new RegExp(escapedPlaceholder, 'g'), `<span class="bg-primary/10 px-1 font-bold text-primary border border-primary/20 rounded-sm">${value}</span>`);
                }
            } else {
                updatedContent = updatedContent.replace(new RegExp(escapedPlaceholder, 'g'), `<span class="bg-surface border-b border-dashed border-border text-text-muted px-1 opacity-50">${placeholder}</span>`);
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
            
            const response = await fetch(`${API_BASE}/generate-doc`, {

                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        <div className="max-w-[1600px] mx-auto p-6 lg:p-10 bg-background min-h-screen text-text-base">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] text-text-muted mb-4 uppercase font-black tracking-widest">
                        <span>Legal Tools</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-primary">AI Document Generator</span>
                    </nav>
                    <h1 className="text-5xl font-black uppercase tracking-tight">Generate Legal <span className="text-primary">Instrument</span></h1>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowHistory(true)} className="px-6 py-3 rounded-2xl border border-border font-black text-[10px] uppercase tracking-[0.2em] hover:bg-surface transition-all flex items-center gap-3 text-text-muted hover:text-text-base">
                        <span className="material-symbols-outlined text-lg">history</span> Sequence History
                    </button>
                    <button onClick={() => setShowWizard(true)} className="px-6 py-3 rounded-2xl bg-primary text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">magic_button</span> Neural Wizard
                    </button>
                </div>
            </div>

            {/* Template Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {templates.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                        className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] bg-surface shadow-sm hover:shadow-xl transition-all group border-2 ${selectedTemplate === t.id ? 'border-primary' : 'border-border hover:border-primary/30'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedTemplate === t.id ? 'bg-primary text-slate-900' : 'bg-background text-text-muted group-hover:bg-primary/10 group-hover:text-primary'}`}>
                            <span className="material-symbols-outlined text-3xl">{t.icon}</span>
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${selectedTemplate === t.id ? 'text-text-base' : 'text-text-muted group-hover:text-text-base'}`}>{t.name}</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ minHeight: 700 }}>
                {/* Form Side */}
                <div className="lg:col-span-5 bg-surface rounded-[2.5rem] border border-border shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-border flex items-center justify-between bg-surface/50">
                        <h3 className="font-black uppercase tracking-[0.2em] text-xs text-text-base">Document Parameters</h3>
                        <button 
                            onClick={() => {
                                if(confirm("Discard current draft sequence?")) {
                                    const empty = {};
                                    templateData.placeholders.forEach(p => empty[p] = '');
                                    setFormData(empty);
                                    localStorage.removeItem(`lexnet_draft_${selectedTemplate}`);
                                }
                            }}
                            className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-1.5 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                        >
                            Purge Draft
                        </button>
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
                                {templateData.placeholders.map((p, i) => {
                                    const isSignature = p.toLowerCase().includes('signature');
                                    const label = p.replace(/[()]/g, '').trim() || 'Field';
                                    
                                    if (isSignature) {
                                        return (
                                            <SignaturePad 
                                                key={i}
                                                label={label}
                                                value={formData[p] || ''}
                                                onChange={(val) => setFormData(prev => ({ ...prev, [p]: val }))}
                                            />
                                        );
                                    }

                                    return (
                                        <div key={i} className="space-y-1.5">
                                            <label className={labelClass}>{label}</label>
                                            <input className={inputClass} placeholder={`Enter ${p}`} type="text" value={formData[p] || ''} onChange={e => setFormData(prev => ({ ...prev, [p]: e.target.value }))} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="p-8 border-t border-border bg-background/50 flex flex-col gap-4">
                        <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-5 bg-primary text-slate-900 font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-[10px] disabled:opacity-50">
                            <span className="material-symbols-outlined font-black">{isGenerating ? 'hourglass_top' : 'cloud_upload'}</span>
                            {isGenerating ? 'Synthesizing Document...' : 'Generate & Secure'}
                        </button>
                        
                        {lastDownloadUrl && (
                            <a 
                                href={lastDownloadUrl}
                                download
                                className="w-full py-4 bg-surface text-primary border-2 border-primary/20 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary/5 transition-all text-[10px] uppercase tracking-[0.2em] decoration-none"
                            >
                                <span className="material-symbols-outlined">download_for_offline</span>
                                Download Final Asset
                            </a>
                        )}
                    </div>
                </div>

                {/* Preview Side */}
                <div className="lg:col-span-7 bg-surface/50 rounded-[2.5rem] border-2 border-dashed border-border flex flex-col overflow-hidden relative shadow-inner">
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3 bg-background/80 backdrop-blur-xl px-5 py-2 rounded-2xl shadow-2xl border border-border">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Live Neural Preview</span>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--color-primary),0.8)]"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-background/30 backdrop-blur-sm">
                        <div ref={previewRef} className="bg-surface w-full max-w-[650px] min-h-[1000px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-lg p-20 flex flex-col gap-10 text-text-base border border-border">
                             <div className="text-center space-y-3 mb-8 border-b-4 border-double border-border pb-8">
                                <h2 className="text-2xl font-black uppercase tracking-[0.3em]">{templates.find(t=>t.id===selectedTemplate)?.name}</h2>
                                <p className="text-[9px] text-text-muted font-black tracking-[0.4em]">ENCRYPTED DRAFT // AI_ENGINE_V4.2 // NYAYASAHAYA</p>
                            </div>
                            <div 
                                className="whitespace-pre-wrap text-sm leading-relaxed text-justify outline-none selection:bg-primary/30" 
                                contentEditable 
                                suppressContentEditableWarning 
                                onBlur={(e) => setPreviewContent(e.currentTarget.innerHTML)} 
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent) }} 
                            />
                            <div className="mt-auto pt-12 flex justify-between items-end opacity-10 grayscale border-t border-border">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-6xl">verified_user</span>
                                    <div className="text-[10px] font-black uppercase tracking-widest leading-tight">AUTHENTICATED<br />LEDGER DRAFT</div>
                                </div>
                                <div className="w-28 h-28 bg-background rounded-lg flex items-center justify-center border border-border">
                                    <span className="material-symbols-outlined text-6xl text-text-muted">qr_code_2</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface text-text-base px-8 py-4 rounded-3xl flex items-center gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 border border-border/50 backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"></span>
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Neural Node: Online</span>
                </div>
                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl font-black">verified</span>
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase">Draft Immutable</span>
                </div>
            </div>

            {showWizard && <SmartWizardModal template={selectedTemplate} onClose={() => setShowWizard(false)} onApply={(a) => setFormData(p => ({...p, ...a}))} wizardSteps={wizardSteps} />}
            {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} onLoad={handleLoadHistory} />}
        </div>
    );
}

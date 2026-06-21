import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/api';

// Keys that show a password-style input
const SECRET_KEYS = new Set(['OPENROUTER_API_KEY', 'ALCHEMY_API_KEY']);

// Human-readable labels and descriptions for each key
const KEY_META = {
    RPI_BASE_URL: {
        label: 'RPi / Hardware Node URL',
        description: 'Base URL of the Raspberry Pi API server or ngrok/Cloudflare tunnel.',
        placeholder: 'https://abc123.ngrok-free.app',
        icon: 'developer_board',
    },
    HARDWARE_MODE: {
        label: 'Hardware Mode',
        description: 'Set to "real" to use physical RPi, "mock" to simulate biometrics.',
        placeholder: 'real | mock',
        icon: 'settings_input_component',
        options: ['real', 'mock'],
    },
    OPENROUTER_MODEL: {
        label: 'OpenRouter Model',
        description: 'LLM model slug used for document analysis and legal AI.',
        placeholder: 'qwen/qwen3-32b',
        icon: 'psychology',
    },
    OPENROUTER_API_KEY: {
        label: 'OpenRouter API Key',
        description: 'Secret key for OpenRouter completions. Stored server-side only.',
        placeholder: 'sk-or-v1-...',
        icon: 'key',
    },
    ALCHEMY_API_KEY: {
        label: 'Alchemy API Key',
        description: 'Alchemy Web3 API key for Ethereum Sepolia RPC access.',
        placeholder: 'Your Alchemy API Key',
        icon: 'key',
    },
    ENDPOINT_SEPOLIA: {
        label: 'Sepolia RPC Endpoint',
        description: 'Base URL of the Alchemy Sepolia endpoint (without the API key).',
        placeholder: 'https://eth-sepolia.g.alchemy.com/v2/',
        icon: 'hub',
    },
    ETH_CONTRACT_ADDRESS: {
        label: 'Smart Contract Address',
        description: 'Deployed FileVerifier contract address on Sepolia.',
        placeholder: '0x...',
        icon: 'receipt_long',
    },
    TOGETHER_API_KEY: {
        label: 'Together AI Key',
        description: 'Together AI API key (legacy chatbot backend).',
        placeholder: 'Your Together AI API Key',
        icon: 'key',
    },
};

function SettingRow({ keyName, currentValue, onSave, saving }) {
    const meta = KEY_META[keyName] || { label: keyName, description: '', placeholder: '', icon: 'settings' };
    const isSecret = SECRET_KEYS.has(keyName);
    const isRedacted = currentValue === '••••••••';
    const [editValue, setEditValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const handleEdit = () => {
        setEditValue(isRedacted ? '' : currentValue);
        setIsEditing(true);
    };

    const handleSave = async () => {
        await onSave(keyName, editValue);
        setIsEditing(false);
        setEditValue('');
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    return (
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3 transition-all hover:border-primary/30">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">{meta.icon}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-text-base">{meta.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{meta.description}</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleEdit}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Edit
                    </button>
                )}
            </div>

            {/* Current value display */}
            {!isEditing && (
                <div className="flex items-center gap-2 bg-background/60 rounded-xl px-4 py-2.5 border border-border">
                    {meta.options ? (
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${
                            currentValue === 'real'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {currentValue}
                        </span>
                    ) : (
                        <span className={`font-mono text-[11px] truncate ${isRedacted ? 'tracking-[0.3em] text-text-muted' : 'text-text-base'}`}>
                            {currentValue || <span className="italic text-text-muted">not set</span>}
                        </span>
                    )}
                </div>
            )}

            {/* Edit mode */}
            {isEditing && (
                <div className="flex flex-col gap-2">
                    {meta.options ? (
                        <div className="flex gap-2">
                            {meta.options.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setEditValue(opt)}
                                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                                        editValue === opt
                                            ? opt === 'real'
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                            : 'bg-background border-border text-text-muted hover:border-primary/30'
                                    }`}
                                >
                                    {opt === 'real' ? '🔌 Real Hardware' : '🎭 Mock Mode'}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type={isSecret && !showSecret ? 'password' : 'text'}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                placeholder={meta.placeholder}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 pr-12"
                                autoFocus
                            />
                            {isSecret && (
                                <button
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showSecret ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2 rounded-xl bg-primary text-slate-900 text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {saving ? (
                                <span className="material-symbols-outlined text-[14px] animate-spin">data_usage</span>
                            ) : (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                            )}
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-xl bg-background border border-border text-text-muted text-[10px] font-black uppercase tracking-wider hover:border-primary/30 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminSettingsPage() {
    const { token } = useAuth();
    const [secret, setSecret] = useState(localStorage.getItem('nyaya_admin_secret') || '');
    const [secretInput, setSecretInput] = useState('');
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);
    const [savingKey, setSavingKey] = useState(null);
    const [showSecretInput, setShowSecretInput] = useState(!localStorage.getItem('nyaya_admin_secret'));

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchConfig = useCallback(async (adminSecret) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/admin/config`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Settings-Secret': adminSecret,
                }
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setConfig(data.config);
        } catch (err) {
            setError(err.message);
            setConfig(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleUnlock = async (e) => {
        e.preventDefault();
        const s = secretInput.trim();
        if (!s) return;
        await fetchConfig(s);
        // Only persist if fetch succeeded (error state won't be set)
        setSecret(s);
        localStorage.setItem('nyaya_admin_secret', s);
        setShowSecretInput(false);
        setSecretInput('');
    };

    const handleSave = async (key, value) => {
        setSavingKey(key);
        try {
            const res = await fetch(`${API_BASE}/admin/config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Settings-Secret': secret,
                },
                body: JSON.stringify({ key, value }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Update failed');
            showToast(`✓ ${key} updated successfully`);
            // Refresh config
            await fetchConfig(secret);
        } catch (err) {
            showToast(`✗ ${err.message}`, 'error');
        } finally {
            setSavingKey(null);
        }
    };

    useEffect(() => {
        if (secret && !showSecretInput) {
            fetchConfig(secret);
        }
    }, []);

    return (
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                    toast.type === 'error'
                        ? 'bg-rose-500/90 text-white border border-rose-400/40'
                        : 'bg-emerald-500/90 text-white border border-emerald-400/40'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">tune</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-text-base tracking-tight">Runtime Config</h1>
                        <p className="text-xs text-text-muted uppercase tracking-[0.2em] font-bold mt-0.5">
                            Hot-patch environment variables — no redeploy needed
                        </p>
                    </div>
                </div>
                <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-xl mt-0.5 shrink-0">info</span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                        Changes are applied <strong className="text-text-base">in-memory only</strong> — they persist until the next server restart.
                        For permanent changes, update the Render environment variables as well.
                        Changes to <strong className="text-text-base">RPI_BASE_URL</strong> and <strong className="text-text-base">HARDWARE_MODE</strong> take effect immediately.
                    </p>
                </div>
            </div>

            {/* Secret unlock */}
            {(showSecretInput || !secret) ? (
                <form onSubmit={handleUnlock} className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">lock</span>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-base">Admin Authentication</h2>
                    </div>
                    <p className="text-[11px] text-text-muted">
                        Enter the <code className="font-mono bg-background px-1.5 py-0.5 rounded text-primary">SETTINGS_SECRET</code> value from your Render environment variables.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="password"
                            value={secretInput}
                            onChange={e => setSecretInput(e.target.value)}
                            placeholder="Enter admin secret..."
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !secretInput.trim()}
                            className="px-5 py-2.5 rounded-xl bg-primary text-slate-900 text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined text-[16px] animate-spin">data_usage</span>
                            ) : (
                                <span className="material-symbols-outlined text-[16px]">lock_open</span>
                            )}
                            Unlock
                        </button>
                    </div>
                    {error && (
                        <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            {error}
                        </p>
                    )}
                </form>
            ) : (
                <>
                    {/* Logged in header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Admin access active
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => fetchConfig(secret)}
                                disabled={loading}
                                className="p-2 rounded-xl hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                                title="Refresh config"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                            </button>
                            <button
                                onClick={() => {
                                    setSecret('');
                                    setShowSecretInput(true);
                                    localStorage.removeItem('nyaya_admin_secret');
                                    setConfig(null);
                                }}
                                className="text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-rose-400 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                Lock
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold">
                            {error}
                        </div>
                    )}

                    {/* Config rows */}
                    {config && (
                        <div className="flex flex-col gap-3">
                            {Object.entries(config).sort(([a], [b]) => {
                                // RPi URL first, then hardware mode, then rest alphabetically
                                const priority = { RPI_BASE_URL: 0, HARDWARE_MODE: 1 };
                                return (priority[a] ?? 99) - (priority[b] ?? 99) || a.localeCompare(b);
                            }).map(([key, value]) => (
                                <SettingRow
                                    key={key}
                                    keyName={key}
                                    currentValue={value}
                                    onSave={handleSave}
                                    saving={savingKey === key}
                                />
                            ))}
                        </div>
                    )}

                    {loading && !config && (
                        <div className="flex items-center justify-center py-20 text-text-muted gap-3">
                            <span className="material-symbols-outlined animate-spin">data_usage</span>
                            <span className="text-sm font-bold uppercase tracking-widest">Loading config...</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

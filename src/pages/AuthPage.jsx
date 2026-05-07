import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('client');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await register(username, password, role);
            }
            navigate('/'); // redirect to dashboard
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-24 pb-12 px-6 bg-background text-text-base">
            <div className="w-full max-w-md p-8 bg-surface border border-border rounded-3xl shadow-2xl relative overflow-hidden">
                {/* Accent blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="text-center mb-10 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_20px_rgba(var(--color-primary),0.1)]">
                        <span className="material-symbols-outlined text-primary text-4xl">security</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">
                        {isLogin ? 'Access' : 'Join'} <span className="text-primary">LexNet</span>
                    </h1>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-3">
                        {isLogin ? 'Secure Handshake Protocol v4.2' : 'Initialize Legal Identity Sequence'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">error</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-xs font-bold text-text-base uppercase tracking-wider mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            placeholder="e.g. harveyspecter"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-text-base uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-base uppercase tracking-wider mb-2">
                            {isLogin ? 'Signing in as' : 'Account Type'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('client')}
                                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                    role === 'client' 
                                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' 
                                        : 'bg-surface border-border text-text-muted'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">person</span>
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('lawyer')}
                                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                    role === 'lawyer' 
                                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' 
                                        : 'bg-surface border-border text-text-muted'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">gavel</span>
                                Lawyer
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-primary text-slate-900 font-black text-[11px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">sync</span>
                        ) : (
                            <>
                                <span>{isLogin ? 'Establish Handshake' : 'Initialize Protocol'}</span>
                                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center relative z-10">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-xs font-black uppercase tracking-[0.2em] text-text-muted hover:text-primary transition-colors"
                    >
                        {isLogin ? 'Need an account? Initialize Register Sequence' : 'Existing operator? Establish Handshake'}
                    </button>
                </div>
            </div>
        </div>
    );
}

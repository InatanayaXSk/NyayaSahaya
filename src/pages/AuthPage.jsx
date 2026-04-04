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
        <div className="min-h-screen flex items-center justify-center pt-24 pb-12 px-6">
            <div className="w-full max-w-md p-8 glass dark:glass-dark rounded-3xl shadow-2xl border border-slate-200/50 dark:border-border-dark relative overflow-hidden">
                {/* Accent blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-3xl">lock_person</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isLogin ? 'Access LexNet' : 'Join LexNet'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {isLogin ? 'Sign in to access your secure portal' : 'Create an identity on the legal network'}
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
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                            placeholder="e.g. harveyspecter"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            {isLogin ? 'Signing in as' : 'Account Type'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('client')}
                                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                    role === 'client' 
                                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
                                        : 'bg-white/50 dark:bg-black/10 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:border-primary/50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">person</span>
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('lawyer')}
                                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                    role === 'lawyer' 
                                        ? 'bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400 font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                        : 'bg-white/50 dark:bg-black/10 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:border-purple-500/50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">gavel</span>
                                Lawyer
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 mt-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">refresh</span>
                        ) : (
                            <>
                                {isLogin ? 'Enter Portal' : 'Create Identity'}
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center relative z-10">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isLogin ? "Don't have an identity?" : "Already have an identity?"}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="ml-2 text-primary font-bold hover:underline"
                        >
                            {isLogin ? 'Create one' : 'Log in here'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

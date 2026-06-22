import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClient } from '../../context/ClientContext';

const clientLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/risk-analysis', label: 'Risk Analysis', icon: 'warning' },
    { path: '/verify', label: 'Verify', icon: 'verified_user' },
    { path: '/bridge-monitor', label: 'Node Monitor', icon: 'terminal' },
];

const lawyerLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/document-generator', label: 'Drafting Tool', icon: 'article' },
    { path: '/verify', label: 'Verify', icon: 'verified_user' },
    { path: '/bridge-monitor', label: 'Node Monitor', icon: 'terminal' },
];

export default function GlassNav() {
    const location = useLocation();
    const { darkMode, toggleDarkMode } = useTheme();
    const { user, logout } = useAuth();
    const { clients, activeClient, setActiveClient } = useClient();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const activeLinks = user?.role === 'lawyer' ? lawyerLinks : clientLinks;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav className={`fixed top-4 left-6 right-6 z-50 px-6 py-3 rounded-2xl transition-all duration-300 bg-surface/80 backdrop-blur-xl border border-border shadow-lg`}>
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg text-slate-900">
                            <span className="material-symbols-outlined block">gavel</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-text-base">
                            LexNet <span className="text-primary">AI</span>
                        </h2>
                    </Link>
 
                    {/* Nav Links */}
                    <div className="hidden lg:flex items-center gap-5">
                        {activeLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-[11px] uppercase tracking-wider font-bold transition-colors ${location.pathname === link.path
                                        ? 'text-primary border-b-2 border-primary pb-0.5'
                                        : 'text-text-muted hover:text-primary'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {user?.role === 'lawyer' && (
                        <div className="relative hidden sm:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">person</span>
                            <select
                                className="pl-10 pr-4 py-2 bg-background/50 border border-border rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary w-48 xl:w-56 text-text-base appearance-none cursor-pointer"
                                value={activeClient?.username || ''}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        setActiveClient(null);
                                    } else {
                                        const c = clients.find(cl => cl.username === e.target.value);
                                        if (c) setActiveClient(c);
                                    }
                                }}
                            >
                                <option value="" className="text-slate-900">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.username} className="text-slate-900">
                                        {client.username}
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">expand_more</span>
                        </div>
                    )}
                    {/* Admin Settings — both client and lawyer */}
                    {user && (
                        <Link
                            to="/admin-settings"
                            className={`p-2 hover:bg-primary/10 rounded-full transition-colors ${location.pathname === '/admin-settings' ? 'text-primary bg-primary/10' : 'text-text-muted'}`}
                            title="Runtime Config"
                        >
                            <span className="material-symbols-outlined">tune</span>
                        </Link>
                    )}
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        <span className="material-symbols-outlined text-text-base">
                            {darkMode ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>
                    <button className="p-2 hover:bg-primary/10 rounded-full transition-colors relative">
                        <span className="material-symbols-outlined text-text-base">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                    </button>

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden p-2 hover:bg-primary/10 rounded-full transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <span className="material-symbols-outlined text-text-base">{mobileOpen ? 'close' : 'menu'}</span>
                    </button>
                    
                    {/* User Auth Section */}
                    {user ? (
                        <div className="hidden lg:flex items-center gap-3 ml-2 border-l border-border pl-4">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-text-base">{user.username}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                                    user.role === 'lawyer' 
                                        ? 'bg-primary/20 text-primary' 
                                        : 'bg-primary/10 text-primary'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center text-text-muted font-bold text-sm uppercase">
                                {user.username.substring(0, 2)}
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors ml-1"
                                title="Logout"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                        </div>
                    ) : (
                        <Link 
                            to="/auth"
                            className="hidden lg:flex items-center gap-2 bg-primary text-slate-900 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/30 ml-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">login</span>
                            Access Portal
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Nav */}
            {mobileOpen && (
                <div className="lg:hidden mt-3 p-4 rounded-2xl bg-surface border border-border">
                    <div className="flex flex-col gap-2">
                        {activeLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${location.pathname === link.path
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-text-muted hover:bg-primary/10 hover:text-primary'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}

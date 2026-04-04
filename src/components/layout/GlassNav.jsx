import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClient } from '../../context/ClientContext';

const clientLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/risk-analysis', label: 'Risk Analysis', icon: 'warning' },
    { path: '/hardware-auth', label: 'TLN Auth', icon: 'fingerprint' },
    { path: '/network-registry', label: 'Registry', icon: 'hub' },
    { path: '/verification-report', label: 'Verify', icon: 'verified_user' },
];

const lawyerLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/document-generator', label: 'Drafting Tool', icon: 'article' },
    { path: '/hardware-auth', label: 'TLN Auth', icon: 'fingerprint' },
    { path: '/network-registry', label: 'Registry', icon: 'hub' },
    { path: '/crypto-signing', label: 'Signing', icon: 'shield_lock' },
    { path: '/verification-report', label: 'Verify', icon: 'verified_user' },
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
        <nav className={`fixed top-4 left-6 right-6 z-50 px-6 py-3 rounded-2xl transition-all duration-300 glass-nav dark:glass-nav-dark shadow-lg`}>
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg text-white">
                            <span className="material-symbols-outlined block">gavel</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
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
                                        : 'text-slate-500 dark:text-slate-400 hover:text-primary'
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
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">person</span>
                            <select
                                className="pl-10 pr-4 py-2 bg-white/50 dark:bg-white/10 border-none rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary w-48 xl:w-56 dark:text-white appearance-none cursor-pointer"
                                value={activeClient?.username || ''}
                                onChange={(e) => {
                                    const c = clients.find(cl => cl.username === e.target.value);
                                    if(c) setActiveClient(c);
                                }}
                            >
                                {clients.length === 0 && <option value="" disabled>No clients found</option>}
                                {clients.map(client => (
                                    <option key={client.id} value={client.username} className="text-slate-900">
                                        {client.username}
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
                        </div>
                    )}
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        <span className="material-symbols-outlined dark:text-white">
                            {darkMode ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>
                    <button className="p-2 hover:bg-primary/10 rounded-full transition-colors relative">
                        <span className="material-symbols-outlined dark:text-white">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden p-2 hover:bg-primary/10 rounded-full transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <span className="material-symbols-outlined dark:text-white">{mobileOpen ? 'close' : 'menu'}</span>
                    </button>
                    
                    {/* User Auth Section */}
                    {user ? (
                        <div className="hidden lg:flex items-center gap-3 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold dark:text-white">{user.username}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                                    user.role === 'lawyer' 
                                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
                                        : 'bg-primary/20 text-primary'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm uppercase">
                                {user.username.substring(0, 2)}
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors ml-1"
                                title="Logout"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                        </div>
                    ) : (
                        <Link 
                            to="/auth"
                            className="hidden lg:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/30 ml-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">login</span>
                            Access Portal
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Nav */}
            {mobileOpen && (
                <div className="lg:hidden mt-3 p-4 rounded-2xl glass dark:bg-card-dark/90 border border-lavender-grey/20 dark:border-border-dark">
                    <div className="flex flex-col gap-2">
                        {activeLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${location.pathname === link.path
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary'
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

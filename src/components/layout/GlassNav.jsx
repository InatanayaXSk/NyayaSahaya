import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const navLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/document-generator', label: 'Drafting Tool', icon: 'article' },
    { path: '/risk-analysis', label: 'Risk Analysis', icon: 'warning' },
    { path: '/legal-summary', label: 'Summary', icon: 'summarize' },
    { path: '/hardware-auth', label: 'TLN Auth', icon: 'fingerprint' },
    { path: '/crypto-signing', label: 'Signing', icon: 'shield_lock' },
    { path: '/network-registry', label: 'Registry', icon: 'hub' },
    { path: '/verification-report', label: 'Verify', icon: 'verified_user' },
    { path: '/bridge-monitor', label: 'Bridge', icon: 'monitor_heart' },
];

export default function GlassNav() {
    const location = useLocation();
    const { darkMode, toggleDarkMode } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

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
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-xs font-semibold transition-colors ${location.pathname === link.path
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
                    <div className="relative hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            className="pl-10 pr-4 py-2 bg-white/50 dark:bg-white/10 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary w-48 xl:w-64 dark:text-white dark:placeholder-slate-400"
                            placeholder="Search..."
                            type="text"
                        />
                    </div>
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
                    <div className="hidden lg:flex w-9 h-9 rounded-full bg-primary/20 border-2 border-primary items-center justify-center text-primary font-bold text-sm">
                        JD
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            {mobileOpen && (
                <div className="lg:hidden mt-3 p-4 rounded-2xl glass dark:bg-card-dark/90 border border-lavender-grey/20 dark:border-border-dark">
                    <div className="flex flex-col gap-2">
                        {navLinks.map(link => (
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

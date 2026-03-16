import React from 'react';
import GlassNav from './GlassNav';

export default function Layout({ children }) {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <GlassNav />
            <main className="pt-20">{children}</main>
            {/* Background decorations */}
            <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="fixed top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        </div>
    );
}

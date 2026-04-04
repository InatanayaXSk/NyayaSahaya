import React, { useState } from 'react';
import GlassNav from './GlassNav';
import Chatbot from '../Chatbot/Chatbot';

export default function Layout({ children }) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <GlassNav />
            <main className="pt-20">{children}</main>
            {/* Global Floating AI Assistant Toggle */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
                {/* Chat Window */}
                {isChatOpen && (
                    <div className="pointer-events-auto w-[380px] h-[520px] shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden border border-slate-700/50 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                       <Chatbot />
                    </div>
                )}
                
                {/* Toggle Button */}
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="pointer-events-auto w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
                    aria-label="Toggle AI Chat"
                >
                    <span className="material-symbols-outlined text-3xl">
                        {isChatOpen ? 'close' : 'smart_toy'}
                    </span>
                </button>
            </div>
        </div>
    );
}

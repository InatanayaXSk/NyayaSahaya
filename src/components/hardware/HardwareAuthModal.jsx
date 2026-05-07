import React, { useState, useEffect } from "react";
import FocusTrap from 'focus-trap-react';
import { API_BASE, BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const defaultAuthSteps = [
    { name: 'Initial Handshake', status: 'Waiting...', done: false, active: false },
    { name: 'Hardware ID Check', status: 'Waiting...', done: false, active: false },
    { name: 'Biometric Verification', status: 'Waiting...', done: false, active: false },
    { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false },
];

export default function HardwareAuthModal({ isOpen, onClose, onSuccess, documentId }) {
    const [status, setStatus] = useState("Offline");
    const [authSteps, setAuthSteps] = useState(defaultAuthSteps);
    const [biometricMatch, setBiometricMatch] = useState(0);
    const [confidence, setConfidence] = useState("0.0000");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    
    const { token } = useAuth();

    useEffect(() => {
        if (!isOpen) {
            // Reset state when closed
            setAuthSteps(defaultAuthSteps);
            setBiometricMatch(0);
            setConfidence("0.0000");
            setIsAuthenticating(false);
            return;
        }

        let ws;
        let reconnectTimeout;
        
        const connect = () => {
            ws = new WebSocket(BASE_URL.replace(/^http/, 'ws') + '/ws/hardware');
            
            ws.onopen = () => setStatus("Online");
            ws.onclose = () => {
                setStatus("Offline");
                reconnectTimeout = setTimeout(connect, 2000);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const step = data.step;
                    const msg = data.message;
                    const eventType = data.event;
                    
                    if (eventType === 'AUTH_START' || step === 'start') {
                        setIsAuthenticating(true);
                        setAuthSteps([
                            { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                            { name: 'Hardware ID Check', status: msg, done: false, active: true },
                            { name: 'Biometric Verification', status: 'Waiting...', done: false, active: false },
                            { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false }
                        ]);
                    } else if (eventType === 'AUTH_PROC' || step === 'processing') {
                        setIsAuthenticating(true);
                        setBiometricMatch(85.4);
                        setConfidence("0.9982");
                        setAuthSteps([
                            { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                            { name: 'Hardware ID Check', status: 'Verified', done: true, active: false },
                            { name: 'Biometric Verification', status: msg, done: false, active: true },
                            { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false }
                        ]);
                    } else if (eventType === 'BIOMETRIC' || step === 'success') {
                        setIsAuthenticating(true);
                        setBiometricMatch(99.9);
                        setConfidence("1.0000");
                        setAuthSteps([
                            { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                            { name: 'Hardware ID Check', status: 'Verified', done: true, active: false },
                            { name: 'Biometric Verification', status: 'Success', done: true, active: false },
                            { name: 'Final Token Grant', status: 'Token Granted', done: true, active: false }
                        ]);
                        // Send success payload back after brief delay for visual
                        if (data.signature) {
                            setTimeout(() => {
                                if (onSuccess) onSuccess(data.signature);
                            }, 1500);
                        }
                    } else if (eventType === 'WARN') {
                        setAuthSteps(prev => prev.map(s => s.active ? { ...s, status: `Error: ${msg}`, active: false } : s));
                        setIsAuthenticating(false);
                    }
                } catch (e) {
                    console.error("WS Parse Error:", e);
                }
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, [isOpen, onSuccess]);

    const triggerAuth = async () => {
        if (!token || isAuthenticating) return;
        setIsAuthenticating(true);
        try {
            await fetch(`${API_BASE}/hardware/authenticate`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Auth trigger failed:", error);
            setIsAuthenticating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <FocusTrap>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <div className="bg-surface rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-border">
                    
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-border text-text-muted transition-colors"
                        aria-label="Close modal"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>

                    {/* Left side: Visualization */}
                    <div className="flex-1 bg-slate-900 p-8 flex flex-col relative overflow-hidden text-white">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#bbbdf6 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }}></div>
                        
                        <div className="relative z-10 flex items-center gap-2 mb-8">
                            <span className={`inline-block w-2 h-2 rounded-full ${status === 'Online' ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></span>
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${status === 'Online' ? 'text-primary' : 'text-red-500'}`}>Node: {status}</span>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                                <div className={`relative border-2 border-primary/40 p-8 rounded-full ${isAuthenticating ? 'border-primary shadow-[0_0_30px_rgba(var(--color-primary),0.3)]' : ''} transition-all duration-500`}>
                                    <span className="material-symbols-outlined text-8xl text-primary font-extralight" style={{ fontVariationSettings: "'FILL' 0, 'wght' 100" }}>fingerprint</span>
                                    {isAuthenticating && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 scan-line"></div>}
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-primary text-xl font-mono font-bold tracking-widest mb-1 uppercase">
                                    {isAuthenticating ? 'Scanning Biometrics' : 'Awaiting Scan'}
                                </h3>
                                <div className="flex items-center gap-4 justify-center">
                                    <span className="text-[10px] font-mono text-primary/60 uppercase tracking-tighter">Layer 01: Dermal Scan</span>
                                    <span className="text-[10px] font-mono text-primary uppercase tracking-tighter font-bold">{biometricMatch}% Match</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Controls & Progress */}
                    <div className="w-full md:w-96 bg-surface p-8 flex flex-col">
                        <h2 className="text-2xl font-black text-text-base mb-2">Hardware Gatekeeper</h2>
                        <p className="text-sm text-text-muted mb-8">This action requires cryptographic authorization from the connected Raspberry Pi node.</p>

                        <div className="space-y-6 mb-8">
                            {authSteps.map((step, i) => (
                                <div key={i} className={`relative pl-6 ${i < authSteps.length - 1 ? 'border-l-2' : ''} ${step.done ? 'border-primary/30' : 'border-border'}`}>
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-surface ${step.done ? 'bg-primary' : step.active ? 'bg-primary animate-pulse' : 'bg-border'}`}></div>
                                    <p className={`text-[11px] font-bold uppercase leading-none mb-1 ${step.done || step.active ? 'text-text-base' : 'text-text-muted'}`}>{step.name}</p>
                                    <p className={`text-[10px] uppercase ${step.active ? 'text-primary font-bold' : 'text-text-muted'}`}>{step.status}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto pt-6 border-t border-border">
                            {isAuthenticating ? (
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Scan in Progress</span>
                                    </div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-tight">Please follow the instructions on the hardware node's LCD screen.</p>
                                </div>
                            ) : (
                                <button 
                                    onClick={triggerAuth} 
                                    disabled={status !== 'Online'}
                                    className="w-full bg-primary text-slate-900 font-black text-xs py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">contactless</span>
                                    Tap Token & Scan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FocusTrap>
    );
}

import React, { useState, useEffect } from 'react';

const defaultAuthSteps = [
    { name: 'Initial Handshake', status: 'Waiting...', done: false, active: false },
    { name: 'Hardware ID Check', status: 'Waiting...', done: false, active: false },
    { name: 'Biometric Verification', status: 'Waiting...', done: false, active: false },
    { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false },
];

export default function HardwareAuthPage() {
    const [status, setStatus] = useState("Offline");
    const [authSteps, setAuthSteps] = useState(defaultAuthSteps);
    const [biometricMatch, setBiometricMatch] = useState(0);
    const [confidence, setConfidence] = useState("0.0000");

    useEffect(() => {
        let ws;
        let reconnectTimeout;
        
        const connect = () => {
            ws = new WebSocket('ws://localhost:8000/ws/hardware');
            
            ws.onopen = () => setStatus("Online");
            ws.onclose = () => {
                setStatus("Offline");
                // Auto-reconnect after 2 seconds
                reconnectTimeout = setTimeout(connect, 2000);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'auth_event') {
                        const step = data.data.step;
                        const msg = data.data.message;
                        
                        if (step === 'start') {
                            setAuthSteps([
                                { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                                { name: 'Hardware ID Check', status: msg, done: false, active: true },
                                { name: 'Biometric Verification', status: 'Waiting...', done: false, active: false },
                                { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false }
                            ]);
                        } else if (step === 'processing') {
                            setBiometricMatch(85.4);
                            setConfidence("0.9982");
                            setAuthSteps([
                                { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                                { name: 'Hardware ID Check', status: 'Verified', done: true, active: false },
                                { name: 'Biometric Verification', status: msg, done: false, active: true },
                                { name: 'Final Token Grant', status: 'Waiting...', done: false, active: false }
                            ]);
                        } else if (step === 'success') {
                            setBiometricMatch(99.9);
                            setConfidence("1.0000");
                            setAuthSteps([
                                { name: 'Initial Handshake', status: 'Complete', done: true, active: false },
                                { name: 'Hardware ID Check', status: 'Verified', done: true, active: false },
                                { name: 'Biometric Verification', status: 'Success', done: true, active: false },
                                { name: 'Final Token Grant', status: 'Token Granted', done: true, active: false }
                            ]);
                        }
                    } else if (data.type === 'hardware_status') {
                        // update status if needed
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
    }, []);

    const triggerAuth = async () => {
        fetch('http://localhost:8000/api/hardware/authenticate', { method: 'POST' }).catch(console.error);
    };
    return (
        <div className="pt-8 pb-12 px-6 max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${status === 'Online' ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></span>
                            <span className={`text-xs font-bold tracking-widest uppercase ${status === 'Online' ? 'text-primary' : 'text-red-500'}`}>System {status}</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-1">Hardware Authentication</h1>
                        <p className="text-slate-500 font-medium">Device: <span className="text-primary">TLN-BLR-001</span> • Location: Bangalore Hub</p>
                    </div>

                    {/* OLED Display */}
                    <div className="oled-display rounded-2xl p-8 border border-slate-800/50 aspect-video relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#bbbdf6 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }}></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                                <div className="relative border-2 border-primary/40 p-8 rounded-full">
                                    <span className="material-symbols-outlined text-8xl text-primary font-extralight" style={{ fontVariationSettings: "'FILL' 0, 'wght' 100" }}>fingerprint</span>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 scan-line"></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-primary text-xl font-mono font-bold tracking-widest mb-1 uppercase">Scanning Biometrics</h3>
                                <div className="flex items-center gap-4 justify-center">
                                    <span className="text-[10px] font-mono text-primary/60 uppercase tracking-tighter">Layer 01: Dermal Scan</span>
                                    <span className="text-[10px] font-mono text-primary uppercase tracking-tighter font-bold">{biometricMatch}% Match</span>
                                </div>
                            </div>
                        </div>
                        {/* Bottom-left indicators */}
                        <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div><span className="text-[10px] font-mono text-primary/80 uppercase">RFID: ACTIVE</span></div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary/30"></div><span className="text-[10px] font-mono text-primary/40 uppercase">TPM: ENCRYPTED</span></div>
                        </div>
                        {/* Top-right confidence */}
                        <div className="absolute top-6 right-6 text-right">
                            <p className="text-[10px] font-mono text-primary/60 uppercase">Confidence Level</p>
                            <p className="text-2xl font-mono font-black text-primary">{confidence}</p>
                        </div>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass p-5 rounded-xl border border-primary/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">sensors</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">RFID Status</span>
                                </div>
                                <span className="text-[10px] bg-primary/20 text-slate-800 px-2 py-0.5 rounded-full font-bold">READY</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-semibold">Proximity sensor detected authorized token within 5cm range.</p>
                        </div>
                        <div className="glass p-5 rounded-xl border border-primary/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">security</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">HSM Integrity</span>
                                </div>
                                <span className="text-[10px] bg-primary/20 text-slate-800 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-semibold">Hardware Security Module reporting no tampering detected since boot.</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-6">
                    {/* Auth Progress */}
                    <div className="glass p-6 rounded-2xl border border-primary/20">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Auth Progress</h3>
                        <div className="space-y-6">
                            {authSteps.map((step, i) => (
                                <div key={i} className={`relative pl-6 ${i < authSteps.length - 1 ? 'border-l-2' : ''} ${step.done ? 'border-primary/30' : 'border-slate-200'}`}>
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-background-light ${step.done ? 'bg-primary' : step.active ? 'bg-primary animate-pulse' : 'bg-slate-200'
                                        }`}></div>
                                    <p className={`text-[11px] font-bold uppercase leading-none mb-1 ${step.done || step.active ? 'text-slate-900' : 'text-slate-400'}`}>{step.name}</p>
                                    <p className={`text-[10px] uppercase ${step.active ? 'text-primary font-bold' : 'text-slate-500'}`}>{step.status}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Manual Override */}
                    <div className="bg-primary/10 p-6 rounded-2xl border-2 border-primary/20 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center text-slate-900">
                                <span className="material-symbols-outlined">help</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold leading-tight">Need Access?</p>
                                <p className="text-[10px] text-slate-600 font-medium">Contact Security Admin</p>
                            </div>
                        </div>
                        <button onClick={triggerAuth} className="w-full bg-primary text-slate-900 font-black text-xs py-3 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 transition-all">
                            Simulate Hardware Auth
                        </button>
                    </div>

                    {/* Network Load */}
                    <div className="glass p-6 rounded-2xl border border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest">Network Load</h3>
                            <span className="text-[10px] font-mono text-primary">Normal</span>
                        </div>
                        <div className="flex items-end gap-1 h-12">
                            {[40, 60, 80, 50, 30, 70, 45, 90, 65].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary/30 rounded-t-sm" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

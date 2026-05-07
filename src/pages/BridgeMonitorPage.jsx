import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, BASE_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const initialLogs = [
    { time: '[14:20:01]', type: 'INFO', typeColor: 'text-emerald-400', message: 'Handshake initialized with peer 192.168.1.44', opacity: 'opacity-80' },
    { time: '[14:20:03]', type: 'WS', typeColor: 'text-primary', message: 'Incoming websocket frame: op=TEXT len=128 cid=x982' },
    { time: '[14:20:05]', type: 'WARN', typeColor: 'text-amber-400', message: 'Retry logic triggered for endpoint /auth/verify - Latency > 200ms', opacity: 'opacity-80' },
    { time: '[14:20:08]', type: 'API', typeColor: 'text-blue-400', message: 'POST /v2/bridge/sync - 201 Created - 42ms' },
    { time: '[14:20:12]', type: 'INFO', typeColor: 'text-emerald-400', message: 'Garbage collection cycle completed - reclaimed 42MB' },
    { time: '[14:20:15]', type: 'WS', typeColor: 'text-primary', message: 'Broadcast sent to 412 active listeners via relay-node-7' },
    { time: '[14:20:18]', type: 'API', typeColor: 'text-blue-400', message: 'GET /v2/health - 200 OK - 4ms' },
    { time: '[14:20:21]', type: 'CRIT', typeColor: 'text-rose-400', message: 'High ingress detected on cluster sub-02. Scaling required.', animate: true },
    { time: '[14:20:25]', type: 'INFO', typeColor: 'text-emerald-400', message: 'Auto-scaler initiated: instance-br-29 spinning up...', opacity: 'opacity-60' },
];

const peerNodes = [
    { name: 'node-us-east-1', ip: '10.0.4.128', status: 'Online', statusColor: 'text-emerald-400', latency: '12ms' },
    { name: 'node-eu-west-2', ip: '10.0.8.44', status: 'Online', statusColor: 'text-emerald-400', latency: '88ms' },
    { name: 'node-ap-south-1', ip: '10.0.12.19', status: 'Congested', statusColor: 'text-amber-400', latency: '312ms' },
];

export default function BridgeMonitorPage() {
    const [logs, setLogs] = useState(initialLogs);
    const [hwStatus, setHwStatus] = useState({
        status: 'checking',
        stats: {
            cpu_load: 0,
            ram_usage_gb: 0,
            ram_total_gb: 4,
            temperature_c: 0,
            disk_io: 'Unknown'
        }
    });
    const { token } = useAuth();
    const logRef = useRef(null);

    // Fetch initial status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/hardware/heartbeat`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await res.json();
                setHwStatus(data);
            } catch (e) {
                setHwStatus(prev => ({ ...prev, status: 'offline' }));
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // WebSocket for live logs
    useEffect(() => {
        let ws;
        try {
            ws = new WebSocket(BASE_URL.replace(/^http/, 'ws') + '/ws/hardware');

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const typeColors = {
                    'INFO': 'text-emerald-400', 'WS': 'text-primary', 'WARN': 'text-amber-400',
                    'API': 'text-blue-400', 'CRIT': 'text-rose-400', 'BIOMETRIC': 'text-purple-400', 
                    'SIGN': 'text-cyan-400', 'HEARTBEAT': 'text-pink-400'
                };
                
                if (data.type === 'HEARTBEAT' && data.data) {
                    setHwStatus(prev => ({
                        ...prev,
                        status: 'online',
                        stats: data.data
                    }));
                }

                setLogs(prev => [...prev.slice(-50), {
                    time: data.timestamp,
                    type: data.type,
                    typeColor: typeColors[data.type] || 'text-slate-400',
                    message: data.message,
                }]);
            };
        } catch (e) {
            // WebSocket not available
        }
        return () => ws?.close?.();
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs]);

    const isOnline = hwStatus.status === 'online';

    return (
        <div className="bg-background text-text-base min-h-[calc(100vh-56px)]">
            {!isOnline && hwStatus.status !== 'checking' && (
                <div className="bg-rose-500/10 border-b border-border py-2 px-6 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-rose-500 text-sm animate-pulse">warning</span>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Hardware Bridge Offline - Real-time metrics suspended</p>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-3xl">hub</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight uppercase">Network <span className="text-primary">Bridge</span></h1>
                        </div>
                        <p className="text-text-muted text-[11px] font-bold uppercase tracking-widest max-w-xl leading-relaxed italic">Live telemetry stream from the NyayaSahaya Hardware Interface. Monitoring node health, peer-to-peer consensus, and biometric authorization cycles.</p>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-surface border border-border p-6 rounded-[2rem] shadow-xl">
                        <div className="text-center px-6">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Global Pulse</p>
                            <div className="flex items-center justify-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-primary' : 'bg-rose-500'} shadow-[0_0_12px_rgba(var(--color-primary),0.6)] animate-pulse`}></div>
                                <span className="text-[11px] font-black uppercase tracking-widest">{isOnline ? 'Active' : 'Offline'}</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-border"></div>
                        <div className="text-center px-6">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Consensus Latency</p>
                            <span className="text-[11px] font-black uppercase tracking-widest font-mono">{isOnline ? '12ms' : '--'}</span>
                        </div>
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Hardware Stats Column */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Health Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-surface border border-border p-8 rounded-[2.5rem] group hover:border-primary/50 transition-all shadow-sm hover:shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
                                        <span className="material-symbols-outlined text-primary text-2xl">memory</span>
                                    </div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Compute Load</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <p className="text-3xl font-black leading-none">{isOnline ? (hwStatus.stats?.cpu_load || 0) : '0'}<span className="text-sm text-text-muted ml-1 opacity-50">%</span></p>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Normal</p>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden p-0.5 border border-border">
                                        <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" style={{ width: `${isOnline ? (hwStatus.stats?.cpu_load || 0) : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface border border-border p-8 rounded-[2.5rem] group hover:border-primary/50 transition-all shadow-sm hover:shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
                                        <span className="material-symbols-outlined text-primary text-2xl">storage</span>
                                    </div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Neural Memory</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <p className="text-3xl font-black leading-none">{isOnline ? (hwStatus.stats?.ram_usage_gb || 0).toFixed(2) : '0.00'}<span className="text-sm text-text-muted ml-2 opacity-50">/ {hwStatus.stats?.ram_total_gb || 4} GB</span></p>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{isOnline ? 'Syncing' : '--'}</p>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden p-0.5 border border-border">
                                        <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" style={{ width: `${isOnline ? ((hwStatus.stats?.ram_usage_gb || 0) / (hwStatus.stats?.ram_total_gb || 4)) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface border border-border p-8 rounded-[2.5rem] group hover:border-primary/50 transition-all shadow-sm hover:shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
                                        <span className="material-symbols-outlined text-primary text-2xl">thermostat</span>
                                    </div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Core Temp</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <p className="text-3xl font-black leading-none">{isOnline ? (hwStatus.stats?.temperature_c || 0) : '0'}<span className="text-sm text-text-muted ml-1 opacity-50">°C</span></p>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{isOnline ? 'Nominal' : '--'}</p>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden p-0.5 border border-border">
                                        <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" style={{ width: `${isOnline ? ((hwStatus.stats?.temperature_c || 0) / 85) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logs Section */}
                        <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden flex flex-col h-[450px] shadow-sm">
                            <div className="px-8 py-5 border-b border-border bg-surface flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.8)]"></span>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Real-time Telemetry Stream</h3>
                                </div>
                                <div className="px-3 py-1 bg-background border border-border rounded-full">
                                    <span className="text-[9px] font-black font-mono text-text-muted tracking-tight">NODE_CORE_V4.2</span>
                                </div>
                            </div>
                            <div ref={logRef} className="flex-1 overflow-y-auto p-8 font-mono text-[10px] space-y-3 scroll-smooth custom-scrollbar bg-background/20 backdrop-blur-3xl">
                                {logs.map((log, i) => (
                                    <div key={i} className={`flex gap-6 border-l-2 border-transparent hover:border-primary/30 pl-4 transition-all group ${log.opacity || 'opacity-100'} ${log.animate ? 'animate-pulse' : ''}`}>
                                        <span className="text-text-muted whitespace-nowrap opacity-50 group-hover:opacity-100">{log.time}</span>
                                        <span className={`font-black whitespace-nowrap min-w-[60px] tracking-widest ${log.typeColor}`}>{log.type}</span>
                                        <span className="text-text-base opacity-80 group-hover:opacity-100 leading-relaxed font-medium">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Side Info Column */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Peer Nodes */}
                        <div className="bg-surface border border-border p-8 rounded-3xl">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">diversity_3</span> Active Peers
                            </h3>
                            <div className="space-y-6">
                                {peerNodes.map((peer, i) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider mb-0.5">{peer.name}</p>
                                            <p className="text-[10px] font-mono text-text-muted">{peer.ip}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${peer.statusColor}`}>{peer.status}</p>
                                            <p className="text-[9px] font-mono text-text-muted">{peer.latency}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-8 py-3 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-900 transition-all">
                                Refresh Peering
                            </button>
                        </div>

                        {/* Security Protocol */}
                        <div className="bg-surface border border-border p-8 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 relative z-10">Security Protocol</h3>
                            <p className="text-[11px] text-text-muted leading-relaxed mb-6 relative z-10">
                                This bridge utilizes RSA-4096 and ECDSA-P256 for all hardware handshakes. Periodic rotation of ephemeral keys occurs every 3600s.
                            </p>
                            <div className="p-4 bg-background/50 rounded-2xl border border-border space-y-3 relative z-10">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">TLS 1.3 Audit</span>
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Passed</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Entropy Check</span>
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Optimal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

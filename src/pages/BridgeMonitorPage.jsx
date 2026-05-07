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
                const res = await fetch(`${API_BASE}/hardware/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await res.json();
                setHwStatus(prev => ({ ...prev, ...data }));
            } catch (e) {
                setHwStatus(prev => ({ ...prev, status: 'offline' }));
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
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
                    'SIGN': 'text-cyan-400'
                };
                
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

    const manualPing = async () => {
        try {
            const res = await fetch(`${API_BASE}/hardware/ping`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                type: 'API',
                typeColor: 'text-blue-400',
                message: `Manual Ping: ${data.status.toUpperCase()} - ${JSON.stringify(data.ping_response)}`
            }]);
            if (data.status === 'online') {
                setHwStatus(prev => ({ ...prev, status: 'online', stats: data.ping_response }));
            }
        } catch (e) {
            console.error("Ping failed", e);
        }
    };

    const isOnline = hwStatus.status === 'online';

    return (
        <div className="bg-background text-text-base min-h-[calc(100vh-56px)]">
            {!isOnline && hwStatus.status !== 'checking' && (
                <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 text-center text-rose-400 text-sm animate-pulse">
                    ⚠️ Hardware Bridge Offline. Document sealing is currently disabled.
                </div>
            )}

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Bridge Monitor</h1>
                        <p className="text-text-muted text-sm mt-1">Real-time telemetry from NyayaSahaya Hardware Node</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={manualPing}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-all active:scale-95"
                        >
                            Manual Ping
                        </button>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-xs font-semibold`}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`} />
                            {hwStatus.status.toUpperCase()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="CPU Load" value={`${hwStatus.stats?.cpu_load || 0}%`} icon="C" />
                    <StatCard label="RAM Usage" value={`${hwStatus.stats?.ram_usage_gb || 0} / ${hwStatus.stats?.ram_total_gb || 4} GB`} icon="R" />
                    <StatCard label="Temperature" value={`${hwStatus.stats?.temperature_c || 0}°C`} icon="T" />
                    <StatCard label="Disk I/O" value={hwStatus.stats?.disk_io || 'Unknown'} icon="D" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
                            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-mono font-bold tracking-widest text-text-muted uppercase">Hardware Audit Logs</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                            </div>
                            <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-1.5 custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className={`flex gap-3 ${log.opacity || ''} ${log.animate ? 'animate-pulse' : ''}`}>
                                        <span className="text-slate-500 shrink-0">{log.time}</span>
                                        <span className={`font-bold shrink-0 min-w-[45px] ${log.typeColor}`}>{log.type}</span>
                                        <span className="text-slate-300">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Device Info</h3>
                            <div className="space-y-4">
                                <InfoItem label="Device ID" value="RPI-NYAYA-01" />
                                <InfoItem label="Firmware" value="v1.4.2-stable" />
                                <InfoItem label="Architecture" value="ARMv8 (64-bit)" />
                                <InfoItem label="Uptime" value="14d 02h 44m" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-xl font-bold text-primary">
                {icon}
            </div>
            <div>
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">{label}</span>
            <span className="font-mono text-text-base">{value}</span>
        </div>
    );
}

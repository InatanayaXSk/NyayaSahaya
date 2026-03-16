import React, { useState, useEffect, useRef } from 'react';

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
    const logRef = useRef(null);

    // WebSocket for live logs
    useEffect(() => {
        let ws;
        try {
            ws = new WebSocket('ws://localhost:8000/ws/hardware');
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const typeColors = {
                    'INFO': 'text-emerald-400', 'WS': 'text-primary', 'WARN': 'text-amber-400',
                    'API': 'text-blue-400', 'CRIT': 'text-rose-400', 'BIOMETRIC': 'text-purple-400', 'SIGN': 'text-cyan-400',
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

    return (
        <div className="bg-[#0a0a0f] text-slate-100 min-h-[calc(100vh-56px)]">
            <div className="pt-8 pb-12 px-6 max-w-[1440px] mx-auto grid grid-cols-12 gap-6">
                {/* Left: Main content */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Request Throughput', value: '14.2k', unit: 'req/s', icon: 'speed', bar: 65 },
                            { label: 'Avg. Latency', value: '24', unit: 'ms', icon: 'timer', bar: 20, barColor: 'bg-emerald-500' },
                            { label: 'Socket Connections', value: '892', unit: 'active', icon: 'sync_alt', bar: 40 },
                        ].map((m, i) => (
                            <div key={i} className="bg-[#161726] border border-[#2d2e45] p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-slate-400 text-xs font-mono uppercase">{m.label}</span>
                                    <span className="material-symbols-outlined text-primary text-sm">{m.icon}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-slate-100">{m.value}</span>
                                    <span className="text-[10px] text-emerald-400 font-mono">{m.unit}</span>
                                </div>
                                <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${m.barColor || 'bg-primary'}`} style={{ width: `${m.bar}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Log Stream */}
                    <div className="bg-[#161726] border border-[#2d2e45] rounded-xl overflow-hidden flex flex-col h-[500px]">
                        <div className="px-5 py-4 border-b border-[#2d2e45] flex justify-between items-center bg-slate-900/30">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">terminal</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Bridge Stream Logs</h3>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase border border-emerald-500/20">Live</span>
                                <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border border-[#2d2e45]">Debug Mode</span>
                            </div>
                        </div>
                        <div ref={logRef} className="flex-1 p-4 font-mono text-[12px] overflow-y-auto bg-black/40">
                            {logs.map((log, i) => (
                                <div key={i} className={`flex gap-4 mb-2 ${log.opacity || ''} ${log.animate ? 'text-rose-400 animate-pulse' : ''}`}>
                                    <span className="text-slate-500">{log.time}</span>
                                    <span className={log.typeColor}>{log.type}</span>
                                    <span className="text-slate-300">{log.message}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-[#2d2e45] bg-slate-900/50 flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500 text-sm">chevron_right</span>
                            <input className="bg-transparent border-none focus:ring-0 text-xs font-mono text-slate-300 w-full placeholder:text-slate-600" placeholder="Type command (e.g. /filter warn)..." type="text" />
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Hardware Heartbeat */}
                    <div className="bg-[#161726] border border-[#2d2e45] rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Hardware Heartbeat</h3>
                            <span className="material-symbols-outlined text-primary">monitor_heart</span>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'CPU Load (Cluster)', value: '42.8%', percent: 42.8 },
                                { label: 'RAM Usage', value: '8.4 / 16 GB', percent: 52 },
                            ].map((stat, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[11px] font-mono mb-2">
                                        <span className="text-slate-400 uppercase">{stat.label}</span>
                                        <span className="text-primary">{stat.value}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${stat.percent}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            <div>
                                <div className="flex justify-between text-[11px] font-mono mb-2">
                                    <span className="text-slate-400 uppercase">Disk I/O</span>
                                    <span className="text-emerald-400">Stable</span>
                                </div>
                                <div className="h-16 flex items-end gap-1">
                                    {[30, 45, 25, 60, 85, 40, 55, 35].map((h, i) => (
                                        <div key={i} className="flex-1 bg-primary/30 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Peers */}
                    <div className="bg-[#161726] border border-[#2d2e45] rounded-xl flex flex-col">
                        <div className="px-5 py-4 border-b border-[#2d2e45]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Active Peer Nodes</h3>
                        </div>
                        <div className="divide-y divide-[#2d2e45]">
                            {peerNodes.map((node, i) => (
                                <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-mono text-slate-200">{node.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{node.ip}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] block ${node.statusColor} font-bold uppercase`}>{node.status}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">Lat: {node.latency}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full py-3 text-[10px] text-primary/70 hover:text-primary uppercase font-bold tracking-widest bg-slate-900/20">
                            View All 14 Nodes
                        </button>
                    </div>

                    {/* Security Card */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-8xl">shield</span>
                        </div>
                        <h4 className="text-xs font-bold text-primary uppercase mb-2">Bridge Security</h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-4">WAF is currently inspecting 100% of packets. No anomalies detected in the last 24 hours.</p>
                        <button className="px-3 py-1.5 bg-primary text-[#0a0a0f] text-[10px] font-bold rounded-lg uppercase">Run Audit</button>
                    </div>
                </div>

                {/* Request Distribution Chart */}
                <div className="col-span-12">
                    <div className="bg-[#161726] border border-[#2d2e45] rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#2d2e45] flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Request Distribution (Last 24h)</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary"></div><span className="text-[10px] text-slate-400 font-mono uppercase">WebSocket</span></div>
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[10px] text-slate-400 font-mono uppercase">REST API</span></div>
                            </div>
                        </div>
                        <div className="p-6 h-48 relative">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                                <defs>
                                    <linearGradient id="chartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#bbbdf6', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#bbbdf6', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>
                                <path d="M0,80 Q100,20 200,60 T400,40 T600,70 T800,30 T1000,50 L1000,100 L0,100 Z" fill="url(#chartGrad)" opacity="0.4" />
                                <path d="M0,80 Q100,20 200,60 T400,40 T600,70 T800,30 T1000,50" fill="none" stroke="#bbbdf6" strokeWidth="2" />
                            </svg>
                            <div className="absolute inset-0 p-6 flex justify-between items-end pointer-events-none">
                                {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map((t, i) => (
                                    <span key={i} className="text-[9px] text-slate-600 font-mono">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

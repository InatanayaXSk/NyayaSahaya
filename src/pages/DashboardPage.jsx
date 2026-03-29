import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

const metrics = [
    { label: 'Total Documents', icon: 'folder_open', key: 'active_cases', trendKey: 'active_cases_trend', color: 'border-t-dash-primary' },
    { label: 'Docs Processed', icon: 'description', key: 'docs_processed', trendKey: 'docs_trend', color: 'border-t-dash-secondary' },
    { label: 'Signatures', icon: 'draw', key: 'critical_risks', trendKey: 'risks_trend', color: 'border-t-dash-accent' },
    { label: 'Audit Events', icon: 'history', key: 'pending_reviews', trendKey: 'reviews_trend', color: 'border-t-dash-neutral-dim' },
];

const defaultStats = {
    active_cases: 142, active_cases_trend: '+5%',
    docs_processed: '12,450', docs_trend: '+12%',
    critical_risks: 3, risks_trend: '-2%',
    pending_reviews: 28, reviews_trend: '-1%',
    recent_activity: [
        { case_ref: 'LX-2023-0891', status: 'In Review', last_update: '2 hours ago', assigned_to: 'J. Smith' },
        { case_ref: 'LX-2023-0890', status: 'Flagged', last_update: '5 hours ago', assigned_to: 'A. Davis' },
        { case_ref: 'LX-2023-0888', status: 'Processed', last_update: '1 day ago', assigned_to: 'System' },
    ],
};

function StatusBadge({ status }) {
    const styles = {
        'In Review': 'bg-slate-200 text-slate-700',
        'Flagged': 'bg-dash-secondary/20 text-dash-secondary border border-dash-secondary/20',
        'Processed': 'bg-dash-primary/20 text-dash-primary border border-dash-primary/20',
    };
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState(defaultStats);

    useEffect(() => {
        fetch(`${API_BASE}/dashboard/stats`)
            .then(r => r.json())
            .then(data => setStats({ ...defaultStats, ...data }))
            .catch(() => { });
    }, []);

    return (
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-dash-primary dark:text-primary font-serif-display text-4xl font-bold leading-tight">Operations Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Overview of current caseload and system performance.</p>
                </div>
                <button className="flex items-center justify-center rounded bg-dash-primary hover:bg-dash-neutral-dim text-white h-10 px-6 font-medium shadow-sm transition-colors gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                    <span>New Case</span>
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map(m => (
                    <div key={m.key} className={`flex flex-col gap-3 rounded bg-white dark:bg-card-dark p-6 border border-slate-200 dark:border-border-dark shadow-sm border-t-4 ${m.color}`}>
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">{m.label}</p>
                            <span className="material-symbols-outlined text-dash-primary/60" style={{ fontSize: 24 }}>{m.icon}</span>
                        </div>
                        <p className="text-dash-primary dark:text-primary font-serif-display text-3xl font-bold">
                            {typeof stats[m.key] === 'number' ? stats[m.key].toLocaleString() : stats[m.key]}
                        </p>
                        <p className={`text-sm font-medium flex items-center gap-1 ${stats[m.trendKey]?.startsWith('+') ? 'text-green-700' : 'text-green-700'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                {stats[m.trendKey]?.startsWith('+') ? 'trending_up' : 'trending_down'}
                            </span>
                            {stats[m.trendKey]} vs last month
                        </p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Processing Volume */}
                <div className="flex flex-col gap-3 rounded bg-white dark:bg-card-dark p-6 border border-slate-200 dark:border-border-dark shadow-sm border-t-4 border-t-dash-primary">
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-border-dark pb-4">
                        <div>
                            <h3 className="text-dash-primary dark:text-primary font-serif-display text-xl font-bold">Processing Volume</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Last 30 Days</p>
                        </div>
                        <div className="text-right">
                            <p className="text-dash-primary dark:text-primary font-serif-display text-2xl font-bold">12,450</p>
                            <p className="text-green-700 text-xs font-medium">+12%</p>
                        </div>
                    </div>
                    <div className="relative h-48 mt-4">
                        <div className="absolute inset-0 flex items-end justify-between gap-2 px-2">
                            {[40, 60, 45, 80, 65, 90, 100].map((h, i) => (
                                <div key={i} className="w-full bg-dash-primary/30 hover:bg-dash-primary/60 rounded-t transition-colors" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 w-full flex justify-between text-xs text-slate-500 border-t border-slate-200 pt-2 mt-2">
                            <span>Wk 1</span><span>Wk 2</span><span>Wk 3</span><span>Wk 4</span>
                        </div>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div className="flex flex-col gap-3 rounded bg-white dark:bg-card-dark p-6 border border-slate-200 dark:border-border-dark shadow-sm border-t-4 border-t-dash-secondary">
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-border-dark pb-4">
                        <div>
                            <h3 className="text-dash-primary dark:text-primary font-serif-display text-xl font-bold">Risk Distribution</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Current Active Cases</p>
                        </div>
                        <div className="text-right">
                            <p className="text-dash-primary font-serif-display text-2xl font-bold">34</p>
                            <p className="text-dash-secondary text-xs font-medium">Flagged Items</p>
                        </div>
                    </div>
                    <div className="relative h-48 mt-4 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full border-8 border-dash-primary relative flex items-center justify-center">
                            <span className="font-serif-display font-bold text-xl">142</span>
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-dash-primary"></span> Low</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-dash-secondary"></span> Medium</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-dash-accent"></span> High/Critical</div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="rounded bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark">
                    <h3 className="text-dash-primary dark:text-primary font-serif-display text-xl font-bold">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white dark:bg-card-dark text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-border-dark uppercase text-xs tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Case Ref</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Update</th>
                                <th className="px-6 py-4">Assigned To</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.recent_activity.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-background-dark transition-colors">
                                    <td className="px-6 py-4 font-medium text-dash-primary dark:text-primary">{row.case_ref}</td>
                                    <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.last_update}</td>
                                    <td className="px-6 py-4">{row.assigned_to}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-dash-primary hover:text-dash-secondary font-medium">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#0d968b', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];
const SENTIMENT_COLORS = {
    'Positive': '#10b981',
    'Neutral': '#94a3b8',
    'Negative': '#f43f5e'
};

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/analytics/dashboard-data');
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
                setError('Failed to load analytics data. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-xl flex items-center">
                <span className="material-symbols-outlined mr-3">error</span>
                <span className="font-medium">{error}</span>
            </div>
        );
    }

    const sentimentData = data.sentimentDistribution.map(item => ({
        name: item.sentiment,
        value: parseInt(item.count)
    }));

    const categoryData = data.complaintsByCategory.map(item => ({
        name: item.complaint_category,
        count: parseInt(item.count)
    }));

    const trendData = data.trendOverTime.map(item => ({
        date: new Date(item.day).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: parseInt(item.count)
    }));

    const isDark = document.documentElement.classList.contains('dark');
    const tooltipBg = isDark ? '#1a2e2c' : '#ffffff';
    const tooltipBorder = isDark ? 'rgba(13, 150, 139, 0.2)' : '#e2e8f0';
    const textColor = isDark ? '#f8fafc' : '#0f172a';

    const posCount = data.sentimentDistribution.find(s => s.sentiment === 'Positive')?.count || 0;
    const negCount = data.sentimentDistribution.find(s => s.sentiment === 'Negative')?.count || 0;
    const totalCount = parseInt(data.totalComplaints);
    const posPct = totalCount ? Math.round((posCount / totalCount) * 100) : 0;
    const negPct = totalCount ? Math.round((negCount / totalCount) * 100) : 0;

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 dark:bg-background-dark/50 custom-scrollbar">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-primary/60">Total Complaints</p>
                        <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-full">All Time</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold">{data.totalComplaints}</h3>
                        <span className="material-symbols-outlined text-primary text-3xl opacity-50">list_alt</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-primary/60">Positive Sentiment</p>
                        <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Good</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold">{posPct}%</h3>
                        <span className="material-symbols-outlined text-emerald-500 text-3xl opacity-50">sentiment_satisfied</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-primary/60">Negative Sentiment</p>
                        <span className="text-rose-500 text-xs font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">Alert</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold">{negPct}%</h3>
                        <span className="material-symbols-outlined text-rose-500 text-3xl opacity-50">sentiment_dissatisfied</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-primary/60">Top Category</p>
                        <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">Highest</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h3 className="text-xl font-bold truncate pr-2" title={categoryData[0]?.name || 'N/A'}>
                            {categoryData[0]?.name || 'N/A'}
                        </h3>
                        <span className="material-symbols-outlined text-amber-500 text-3xl opacity-50">category</span>
                    </div>
                </div>
            </div>

            {/* Charts Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold">Complaints Trend Over Time</h4>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d968b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#0d968b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(13, 150, 139, 0.1)' : '#f1f5f9'} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: 12 }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '0.75rem', border: `1px solid ${tooltipBorder}`, backgroundColor: tooltipBg, color: textColor, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#0d968b" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors flex flex-col items-center">
                    <h4 className="font-bold w-full text-left mb-6">Sentiment Breakdown</h4>
                    <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentimentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {sentimentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '0.75rem', border: `1px solid ${tooltipBorder}`, backgroundColor: tooltipBg, color: textColor, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-4 w-full text-center mt-2">
                        {sentimentData.map((s, i) => (
                            <div key={i}>
                                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{s.name}</div>
                                <div className="text-sm font-bold" style={{ color: SENTIMENT_COLORS[s.name] || '#94a3b8' }}>
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm transition-colors">
                    <h4 className="font-bold mb-5">Complaints by Category</h4>
                    <div className="space-y-3">
                        {categoryData.map((item, index) => {
                            const pct = categoryData[0]?.count ? Math.round((item.count / categoryData[0].count) * 100) : 0;
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }}></span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.count.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%`, background: COLORS[index % COLORS.length] }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm overflow-hidden flex flex-col transition-colors">
                    <div className="p-4 md:p-6 pb-2 flex justify-between items-center">
                        <h4 className="font-bold">Recent Complaints</h4>
                        <a href="/cfa/api/analytics/export" download className="text-xs font-semibold text-primary hover:underline">Export CSV</a>
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white dark:bg-surface-dark z-10">
                                <tr className="text-[11px] font-bold text-slate-400 dark:text-primary/40 uppercase tracking-wider border-b border-slate-100 dark:border-primary/5">
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4 text-right">Sentiment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-primary/5">
                                {data.recentComplaints.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium truncate max-w-[150px]">{row.product_name}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{row.complaint_category}</td>
                                        <td className="px-6 py-4 text-right">
                                            {row.sentiment === 'Positive' && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Positive
                                                </span>
                                            )}
                                            {row.sentiment === 'Negative' && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Negative
                                                </span>
                                            )}
                                            {row.sentiment === 'Neutral' && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Neutral
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile card list */}
                    <div className="sm:hidden divide-y divide-slate-100 dark:divide-primary/5 flex-1">
                        {data.recentComplaints.slice(0, 10).map((row, idx) => (
                            <div key={idx} className="px-4 py-3 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{row.product_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{row.complaint_category}</p>
                                </div>
                                {row.sentiment === 'Positive' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Pos</span>}
                                {row.sentiment === 'Negative' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Neg</span>}
                                {row.sentiment === 'Neutral' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Neu</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, LabelList
} from 'recharts';

const COLORS = ['#6C63FF', '#38B2AC', '#8B84FF', '#F43F5E', '#F59E0B'];
const SENTIMENT_COLORS = {
    'Positive': '#38B2AC',
    'Neutral': '#6B7280',
    'Negative': '#F43F5E'
};

const DrillTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const pos = payload.find(p => p.dataKey === 'positive')?.value || 0;
    const neg = payload.find(p => p.dataKey === 'negative')?.value || 0;
    const neu = payload.find(p => p.dataKey === 'neutral')?.value || 0;
    const total = pos + neg + neu;
    return (
        <div className="bg-soft-bg shadow-extruded rounded-xl p-3 text-xs min-w-[130px]">
            <p className="font-bold text-soft-fg mb-2">{label}</p>
            <div className="space-y-1">
                <div className="flex justify-between gap-4"><span className="text-emerald-600 font-semibold">Positive</span><span className="font-bold text-soft-fg">{pos}</span></div>
                <div className="flex justify-between gap-4"><span className="text-rose-500 font-semibold">Negative</span><span className="font-bold text-soft-fg">{neg}</span></div>
                <div className="flex justify-between gap-4"><span className="text-soft-muted">Neutral</span><span className="font-bold text-soft-fg">{neu}</span></div>
                <div className="border-t border-soft-muted/20 pt-1 flex justify-between gap-4"><span className="text-soft-muted">Total</span><span className="font-bold text-soft-fg">{total}</span></div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [yearlyData, setYearlyData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [drillYear, setDrillYear] = useState(null);
    const [drillLoading, setDrillLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [res, yearly] = await Promise.all([
                    axios.get('/api/analytics/dashboard-data'),
                    axios.get('/api/analytics/yearly-sentiment')
                ]);
                setData(res.data);
                setYearlyData(yearly.data);
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
                setError('Failed to load analytics data. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleYearClick = useCallback(async (chartData) => {
        const year = chartData?.activeLabel;
        if (!year) return;
        setDrillLoading(true);
        setDrillYear(parseInt(year));
        try {
            const res = await axios.get(`/api/analytics/monthly-sentiment?year=${year}`);
            setMonthlyData(res.data);
        } catch (err) {
            console.error('Failed to fetch monthly sentiment', err);
        } finally {
            setDrillLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                 <div className="w-12 h-12 rounded-2xl shadow-inset-deep flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin" />
                 </div>
                 <p className="text-sm font-bold text-soft-muted tracking-widest uppercase">Fetching Intelligence</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex justify-center">
                <div className="card-neumorphic max-w-lg text-center">
                    <span className="material-symbols-outlined text-rose-500 text-5xl mb-4">error</span>
                    <p className="font-bold text-soft-fg">{error}</p>
                </div>
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
        date: new Date(item.day).toLocaleDateString('en-US', { month: 'short' }),
        count: parseInt(item.count)
    }));

    const tooltipBg = '#E0E5EC';
    const tooltipBorder = 'rgba(163,177,198,0.4)';
    const textColor = '#3D4852';

    const posCount = data.sentimentDistribution.find(s => s.sentiment === 'Positive')?.count || 0;
    const negCount = data.sentimentDistribution.find(s => s.sentiment === 'Negative')?.count || 0;
    const totalCount = parseInt(data.totalComplaints);
    const posPct = totalCount ? Math.round((posCount / totalCount) * 100) : 0;
    const negPct = totalCount ? Math.round((negCount / totalCount) * 100) : 0;

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Total Reviews', value: data.totalComplaints, icon: 'list_alt', color: 'text-soft-fg' },
                    { label: 'Positive Share', value: `${posPct}%`, icon: 'sentiment_satisfied', color: 'text-soft-accent-secondary' },
                    { label: 'Critical Alert', value: `${negPct}%`, icon: 'sentiment_dissatisfied', color: 'text-rose-500' },
                    { label: 'Primary Issue', value: categoryData[0]?.name || 'N/A', icon: 'category', color: 'text-soft-accent', small: true },
                ].map((kpi, i) => (
                    <div key={i} className="card-neumorphic !p-6 flex flex-col justify-between group">
                        <div className="flex justify-between items-start mb-6">
                            <p className="text-[10px] font-bold text-soft-muted uppercase tracking-widest">{kpi.label}</p>
                            <div className="icon-well !w-10 !h-10 group-hover:scale-105 transition-transform duration-300">
                                <span className={`material-symbols-outlined text-[20px] ${kpi.color}`}>{kpi.icon}</span>
                            </div>
                        </div>
                        <h3 className={`${kpi.small ? 'text-lg' : 'text-3xl'} font-black text-soft-fg tracking-tighter truncate`}>{kpi.value}</h3>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card-neumorphic">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-soft-muted">Sentiment Trend Analysis</h4>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSoft" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(163,177,198,0.2)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: `none`, backgroundColor: tooltipBg, boxShadow: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)' }} />
                                <Area type="monotone" dataKey="count" stroke="#6C63FF" strokeWidth={4} fillOpacity={1} fill="url(#colorSoft)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-neumorphic flex flex-col items-center">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-soft-muted w-full mb-8">Volume Distribution</h4>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={sentimentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {sentimentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: `none`, backgroundColor: tooltipBg, boxShadow: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-6 w-full mt-6">
                        {sentimentData.map((s, i) => (
                            <div key={i} className="p-3 rounded-2xl shadow-inset-sm">
                                <div className="text-[9px] font-bold text-soft-muted mb-1 uppercase tracking-widest">{s.name}</div>
                                <div className="text-sm font-black" style={{ color: SENTIMENT_COLORS[s.name] || '#94a3b8' }}>
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Yearly / Monthly Drill-down Bar Chart */}
            <div className="card-neumorphic">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-soft-muted">
                            {drillYear ? `${drillYear} — Month by Month` : 'Reviews by Year'}
                        </h4>
                        {drillYear && (
                            <p className="text-[10px] text-soft-muted mt-1">Click a month to go back, or use the button →</p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Positive</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"></span>Negative</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block"></span>Neutral</span>
                        </div>
                        {drillYear && (
                            <button onClick={() => { setDrillYear(null); setMonthlyData([]); }}
                                className="flex items-center gap-1 text-xs font-bold text-soft-accent px-3 py-1.5 rounded-xl shadow-inset-sm hover:shadow-extruded-sm transition-all">
                                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                All Years
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-[280px]">
                    {drillLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart
                                data={drillYear ? monthlyData : yearlyData}
                                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                                onClick={!drillYear ? handleYearClick : undefined}
                                style={{ cursor: drillYear ? 'default' : 'pointer' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(163,177,198,0.2)" />
                                <XAxis
                                    dataKey={drillYear ? 'month' : 'year'}
                                    axisLine={false} tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
                                <RechartsTooltip content={<DrillTooltip />} cursor={{ fill: 'rgba(108,99,255,0.06)' }} />
                                <Bar dataKey="positive" name="Positive" stackId="a" fill="#10b981" radius={[0,0,0,0]} maxBarSize={48} />
                                <Bar dataKey="neutral"  name="Neutral"  stackId="a" fill="#cbd5e1" maxBarSize={48} />
                                <Bar dataKey="negative" name="Negative" stackId="a" fill="#f43f5e" radius={[4,4,0,0]} maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {!drillYear && (
                    <p className="text-center text-[10px] text-soft-muted mt-3 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">touch_app</span>
                        Click any year bar to see its monthly breakdown
                    </p>
                )}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-neumorphic">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-soft-muted mb-8">Topic Prevalence</h4>
                    <div className="space-y-6">
                        {categoryData.slice(0, 6).map((item, index) => {
                            const pct = categoryData[0]?.count ? Math.round((item.count / categoryData[0].count) * 100) : 0;
                            return (
                                <div key={index} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shadow-inset-sm shrink-0" style={{ background: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-sm font-bold text-soft-fg">{item.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-soft-muted">{item.count}</span>
                                    </div>
                                    <div className="h-3 rounded-full shadow-inset overflow-hidden p-0.5">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 shadow-extruded-sm"
                                            style={{ width: `${pct}%`, background: COLORS[index % COLORS.length] }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card-neumorphic !p-0 overflow-hidden flex flex-col">
                    <div className="p-8 pb-4 flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-soft-muted">Recent Intelligence</h4>
                        <div className="px-4 py-1.5 rounded-full shadow-inset-sm text-[10px] font-bold text-soft-accent uppercase tracking-widest cursor-pointer hover:shadow-inset transition-shadow">
                            Export Intelligence
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-soft-muted uppercase tracking-widest shadow-inset-sm">
                                    <th className="px-8 py-4">Context</th>
                                    <th className="px-8 py-4 text-right">Sentiment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft-muted/10">
                                {data.recentComplaints.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-soft-muted/5 transition-colors group">
                                        <td className="px-8 py-4">
                                            <p className="text-sm font-bold text-soft-fg truncate max-w-[200px]">{row.product_name}</p>
                                            <p className="text-[10px] text-soft-muted font-bold uppercase mt-1 tracking-wider">{row.complaint_category}</p>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-inset-sm ${
                                                row.sentiment === 'Positive' ? 'text-soft-accent-secondary' : 
                                                row.sentiment === 'Negative' ? 'text-rose-500' : 'text-soft-muted'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    row.sentiment === 'Positive' ? 'bg-soft-accent-secondary' : 
                                                    row.sentiment === 'Negative' ? 'bg-rose-500' : 'bg-soft-muted'
                                                }`}></span>
                                                {row.sentiment}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

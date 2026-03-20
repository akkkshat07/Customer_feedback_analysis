import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';

const COLORS = ['#6C63FF','#f59e0b','#f43f5e','#38B2AC','#10b981','#ec4899','#14b8a6','#f97316','#3b82f6','#a855f7'];
const SENTIMENT_COLORS = { Positive: '#10b981', Neutral: '#94a3b8', Negative: '#f43f5e' };

const StatCard = ({ icon, label, value, sub, color = 'text-soft-accent' }) => {
    const bg = color === 'text-emerald-500' ? 'bg-emerald-500/10' : color === 'text-rose-500' ? 'bg-rose-500/10' : color === 'text-slate-400' ? 'bg-soft-muted/10' : 'bg-soft-accent/10';
    return (
        <div className="bg-soft-bg rounded-xl shadow-extruded p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inset-sm ${bg}`}>
                <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-soft-fg leading-tight">{value}</p>
                <p className="text-xs text-soft-muted font-medium truncate">{label}</p>
                {sub && <p className="text-xs text-soft-muted">{sub}</p>}
            </div>
        </div>
    );
};

const SentimentBadge = ({ sentiment }) => {
    const cfg = { Positive: 'bg-emerald-500/10 text-emerald-600', Negative: 'bg-rose-500/10 text-rose-500', Neutral: 'bg-soft-muted/10 text-soft-muted' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg[sentiment] || cfg.Neutral}`}>{sentiment}</span>;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-soft-bg shadow-extruded rounded-xl p-3 text-sm">
            <p className="font-bold text-soft-fg mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }}></span>
                    <span className="text-soft-muted">{p.name}: <b className="text-soft-fg">{p.value}</b></span>
                </div>
            ))}
        </div>
    );
};

const ScoreBar = ({ sentiments, total }) => (
    <div className="space-y-2">
        {sentiments.map((s, i) => {
            const pct = total ? Math.round((s.count / total) * 100) : 0;
            return (
                <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-soft-fg">{s.sentiment}</span>
                        <span className="text-soft-muted">{pct}% &middot; {s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-soft-bg shadow-inset-sm overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: SENTIMENT_COLORS[s.sentiment] || '#94a3b8' }}></div>
                    </div>
                </div>
            );
        })}
    </div>
);

const MonthModal = ({ data, loading, onClose }) => {
    const [tab, setTab] = useState('Positive');

    const list = data?.[tab.toLowerCase()] || [];
    const tabs = [
        { key: 'Positive', color: 'bg-emerald-500 text-white', inactive: 'text-emerald-600 hover:bg-emerald-500/10' },
        { key: 'Negative', color: 'bg-rose-500 text-white', inactive: 'text-rose-500 hover:bg-rose-500/10' },
        { key: 'Neutral', color: 'bg-slate-400 text-white', inactive: 'text-soft-muted hover:bg-soft-muted/10' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-soft-bg rounded-2xl shadow-extruded w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-soft-muted/10">
                    <div>
                        <h3 className="font-bold text-soft-fg text-base">{data?.month} Reviews</h3>
                        <p className="text-xs text-soft-muted mt-0.5">
                            {loading ? 'Loading…' : `${data?.total || 0} total · ${data?.positive?.length || 0} positive · ${data?.negative?.length || 0} negative · ${data?.neutral?.length || 0} neutral`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:shadow-inset-sm text-soft-muted hover:text-soft-fg transition-all">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 px-5 py-3 border-b border-soft-muted/10">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${tab === t.key ? t.color : `bg-soft-bg shadow-inset-sm ${t.inactive}`}`}>
                            {t.key}
                            <span className="ml-1.5 opacity-75">({data?.[t.key.toLowerCase()]?.length || 0})</span>
                        </button>
                    ))}
                </div>

                {/* Review list */}
                <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin"></div>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-soft-muted">
                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                            <p className="text-sm">No {tab.toLowerCase()} reviews this month</p>
                        </div>
                    ) : list.map((fb, i) => (
                        <div key={i} className="bg-soft-bg rounded-xl shadow-extruded-sm p-4">
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-soft-muted truncate">{fb.complaint_category || 'Other'}</span>
                                    {fb.source && <span className="text-[10px] text-soft-muted bg-soft-bg shadow-inset-sm px-2 py-0.5 rounded-full shrink-0">{fb.source}</span>}
                                </div>
                                <SentimentBadge sentiment={fb.sentiment} />
                            </div>
                            <p className="text-soft-fg text-sm leading-relaxed">"{fb.complaint_text}"</p>
                            <div className="mt-2.5 flex justify-between items-center text-[11px] text-soft-muted font-medium">
                                <span>{fb.customer_name || 'Anonymous'}</span>
                                <span>{fb.date ? new Date(fb.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const YearDrillSection = ({ productName, onMonthClick }) => {
    const [drillData, setDrillData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(null);

    useEffect(() => {
        setLoading(true);
        setSelectedYear(null);
        axios.get(`/api/analytics/products/${encodeURIComponent(productName)}/yearly-drill`)
            .then(res => setDrillData(res.data))
            .catch(err => console.error('yearly-drill failed', err))
            .finally(() => setLoading(false));
    }, [productName]);

    if (loading) return (
        <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="font-bold text-soft-fg text-sm">Year & Month Explorer</h4>
            </div>
            <div className="flex items-center justify-center py-8">
                <div className="w-7 h-7 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!drillData?.length) return null;

    const yearEntry = drillData.find(d => d.year === selectedYear);

    return (
        <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h4 className="font-bold text-soft-fg text-sm shrink-0">Year &amp; Month Explorer</h4>
                <select
                    value={selectedYear || ''}
                    onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                    className="input-neumorphic text-sm px-3 py-1.5 text-soft-fg focus:outline-none focus:ring-2 focus:ring-soft-accent/20 min-w-[120px]"
                >
                    <option value="">Select a year…</option>
                    {drillData.map(yr => (
                        <option key={yr.year} value={yr.year}>
                            {yr.year} — {yr.total} reviews
                        </option>
                    ))}
                </select>
                {selectedYear && (
                    <button onClick={() => setSelectedYear(null)}
                        className="text-xs text-soft-accent flex items-center gap-1 hover:underline ml-auto">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        Clear
                    </button>
                )}
            </div>

            {!selectedYear ? (
                <p className="text-xs text-soft-muted text-center py-6">Select a year above to explore month-wise reviews</p>
            ) : (
                /* Month grid for selected year */
                <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-sm font-bold text-soft-accent">{selectedYear}</span>
                        <span className="text-xs text-soft-muted">— {yearEntry?.total} reviews · {yearEntry?.positive} positive · {yearEntry?.negative} negative · {yearEntry?.neutral} neutral</span>
                    </div>
                    {/* Year sentiment overview bar */}
                    <div className="mb-4">
                        <div className="flex h-2.5 rounded-full overflow-hidden shadow-inset-sm mb-1.5">
                            {(() => {
                                const t = yearEntry?.total || 1;
                                const pp = Math.round((yearEntry.positive / t) * 100);
                                const np = Math.round((yearEntry.negative / t) * 100);
                                const up = 100 - pp - np;
                                return <>
                                    <div className="bg-emerald-500 transition-all" style={{ width: `${pp}%` }}></div>
                                    <div className="bg-soft-muted/40 transition-all" style={{ width: `${up}%` }}></div>
                                    <div className="bg-rose-500 transition-all" style={{ width: `${np}%` }}></div>
                                </>;
                            })()}
                        </div>
                        <div className="flex gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Positive {Math.round((yearEntry.positive / (yearEntry.total || 1)) * 100)}%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Negative {Math.round((yearEntry.negative / (yearEntry.total || 1)) * 100)}%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-soft-muted/40 inline-block"></span>Neutral {Math.round((yearEntry.neutral / (yearEntry.total || 1)) * 100)}%</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {yearEntry?.months.map(m => {
                            const posPct = m.total ? Math.round((m.positive / m.total) * 100) : 0;
                            const negPct = m.total ? Math.round((m.negative / m.total) * 100) : 0;
                            const neuPct = 100 - posPct - negPct;
                            return (
                                <button key={m.monthLabel} onClick={() => onMonthClick(m.monthLabel)}
                                    className="group bg-soft-bg rounded-xl shadow-extruded hover:shadow-inset transition-all p-3.5 text-left">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-soft-fg group-hover:text-soft-accent transition-colors">{m.monthLabel}</span>
                                        <span className="text-[10px] text-soft-muted bg-soft-bg shadow-inset-sm px-1.5 py-0.5 rounded-full">{m.total}</span>
                                    </div>
                                    <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
                                        <div className="bg-emerald-500" style={{ width: `${posPct}%` }}></div>
                                        <div className="bg-soft-muted/40" style={{ width: `${neuPct}%` }}></div>
                                        <div className="bg-rose-500" style={{ width: `${negPct}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                                        <div className="bg-emerald-500/10 rounded-lg p-1.5 text-center">
                                            <div className="font-bold text-emerald-600">{m.positive}</div>
                                            <div className="text-soft-muted">pos</div>
                                        </div>
                                        <div className="bg-rose-500/10 rounded-lg p-1.5 text-center">
                                            <div className="font-bold text-rose-500">{m.negative}</div>
                                            <div className="text-soft-muted">neg</div>
                                        </div>
                                        <div className="bg-soft-muted/10 rounded-lg p-1.5 text-center">
                                            <div className="font-bold text-soft-muted">{m.neutral}</div>
                                            <div className="text-soft-muted">neu</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-soft-muted flex items-center gap-1 justify-center">
                                        <span className="material-symbols-outlined text-[11px]">touch_app</span>
                                        View reviews
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productDetails, setProductDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [monthModal, setMonthModal] = useState(null); // null | { month, loading, data }

    const listRef = useRef(null);
    const detailRef = useRef(null);

    useEffect(() => {
        axios.get('/api/analytics/products')
            .then(res => {
                setProducts(res.data);
                // Auto-expand all categories
                const cats = {};
                res.data.forEach(p => { cats[p.product_category] = true; });
                setExpandedCategories(cats);
            })
            .catch(err => console.error('Failed to fetch products', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!loading && listRef.current) {
            gsap.fromTo(listRef.current.querySelectorAll('.product-card'),
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.03, ease: 'power2.out' }
            );
        }
    }, [loading]);

    const fetchDetails = useCallback(async (name, page, sentiment, category, append = false) => {
        if (append) setLoadingMore(true); else setDetailsLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (sentiment !== 'All') params.append('sentiment', sentiment);
            if (category !== 'All') params.append('category', category);
            const res = await axios.get(`/api/analytics/products/${encodeURIComponent(name)}?${params}`);
            if (append) {
                setProductDetails(prev => ({ ...res.data, feedback: [...(prev?.feedback || []), ...res.data.feedback] }));
            } else {
                setProductDetails(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch details', err);
        } finally {
            setDetailsLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const handleSelect = (name) => {
        setSelectedProduct(name);
        setFeedbackPage(1);
        setSentimentFilter('All');
        setCategoryFilter('All');
        fetchDetails(name, 1, 'All', 'All');
        if (detailRef.current) {
            setTimeout(() => gsap.fromTo(detailRef.current, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }), 10);
        }
    };

    const handleFilterChange = (s, c) => {
        setSentimentFilter(s);
        setCategoryFilter(c);
        setFeedbackPage(1);
        fetchDetails(selectedProduct, 1, s, c);
    };

    const handleLoadMore = () => {
        const next = feedbackPage + 1;
        setFeedbackPage(next);
        fetchDetails(selectedProduct, next, sentimentFilter, categoryFilter, true);
    };

    const handleMonthClick = useCallback(async (chartData) => {
        const monthLabel = chartData?.activeLabel;
        if (!monthLabel || !selectedProduct) return;
        setMonthModal({ month: monthLabel, loading: true, data: null });
        try {
            const res = await axios.get(`/api/analytics/products/${encodeURIComponent(selectedProduct)}/month-reviews?month=${encodeURIComponent(monthLabel)}`);
            setMonthModal({ month: monthLabel, loading: false, data: res.data });
        } catch (err) {
            console.error('Failed to fetch month reviews', err);
            setMonthModal(null);
        }
    }, [selectedProduct]);

    const handleMonthLabelClick = useCallback(async (monthLabel) => {
        if (!monthLabel || !selectedProduct) return;
        setMonthModal({ month: monthLabel, loading: true, data: null });
        try {
            const res = await axios.get(`/api/analytics/products/${encodeURIComponent(selectedProduct)}/month-reviews?month=${encodeURIComponent(monthLabel)}`);
            setMonthModal({ month: monthLabel, loading: false, data: res.data });
        } catch (err) {
            console.error('Failed to fetch month reviews', err);
            setMonthModal(null);
        }
    }, [selectedProduct]);

    // Group and filter products by category
    const grouped = products.reduce((acc, p) => {
        const cat = p.product_category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, prods]) => {
        const filtered = searchQuery ? prods.filter(p => p.product_name.toLowerCase().includes(searchQuery.toLowerCase())) : prods;
        if (filtered.length) acc[cat] = filtered;
        return acc;
    }, {});

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-soft-bg">
            <div className="w-12 h-12 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin"></div>
            <p className="text-soft-muted font-medium">Loading Product Analytics...</p>
        </div>
    );

    return (
        <div className="flex-1 overflow-hidden flex bg-soft-bg">

            {/* ── LEFT PANEL: Category-grouped product list ── */}
            <div className={`flex flex-col overflow-hidden transition-all duration-500 ${selectedProduct ? 'hidden lg:flex lg:w-72 xl:w-80 lg:flex-none' : 'flex-1'}`}>
                {/* Header */}
                <div className="px-4 py-4 border-b border-soft-muted/10 bg-soft-bg shrink-0">
                    <h2 className="text-lg font-bold text-soft-fg">Product Intelligence</h2>
                    <p className="text-soft-muted text-xs mt-0.5">
                        {products.length} products &middot; {Object.keys(grouped).length} categories
                    </p>
                    <div className="mt-3 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-soft-muted text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input-neumorphic w-full pl-9 pr-3 py-2 text-sm text-soft-fg placeholder-soft-muted focus:outline-none focus:ring-2 focus:ring-soft-accent/20"
                        />
                    </div>
                </div>

                {/* Category groups */}
                <div className="overflow-y-auto flex-1 custom-scrollbar bg-soft-bg" ref={listRef}>
                    {Object.entries(filteredGrouped).map(([category, prods]) => (
                        <div key={category} className="border-b border-soft-muted/10">
                            <button
                                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-soft-bg hover:shadow-inset-sm transition-all"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-soft-accent text-[15px] shrink-0">folder</span>
                                    <span className="text-xs font-bold text-soft-fg uppercase tracking-wider truncate">{category}</span>
                                    <span className="text-xs bg-soft-accent/10 text-soft-accent px-1.5 py-0.5 rounded-full font-bold shrink-0">{prods.length}</span>
                                </div>
                                <span className={`material-symbols-outlined text-soft-muted text-[16px] shrink-0 transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {expandedCategories[category] && (
                                <div className="divide-y divide-soft-muted/5">
                                    {prods.map((p, idx) => {
                                        const total = p.total_complaints;
                                        const negPct = total ? Math.round((p.negative_count / total) * 100) : 0;
                                        const posPct = total ? Math.round((p.positive_count / total) * 100) : 0;
                                        const neuPct = 100 - posPct - negPct;
                                        const isSelected = selectedProduct === p.product_name;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelect(p.product_name)}
                                                onMouseEnter={e => gsap.to(e.currentTarget, { x: 3, duration: 0.15 })}
                                                onMouseLeave={e => gsap.to(e.currentTarget, { x: 0, duration: 0.15 })}
                                                className={`product-card cursor-pointer px-4 py-3 transition-all border-l-2 ${isSelected ? 'shadow-inset-sm border-soft-accent bg-soft-bg' : 'border-transparent hover:shadow-inset-sm'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h3 className={`font-semibold text-sm leading-tight flex-1 mr-2 ${isSelected ? 'text-soft-accent' : 'text-soft-fg'}`}>{p.product_name}</h3>
                                                    <span className="text-xs font-bold text-soft-muted shrink-0">{total}</span>
                                                </div>
                                                {/* Sentiment mini-bar */}
                                                <div className="flex h-1.5 rounded-full overflow-hidden bg-soft-bg shadow-inset-sm mb-1.5">
                                                    <div className="bg-emerald-500 transition-all" style={{ width: `${posPct}%` }}></div>
                                                    <div className="bg-soft-muted/40 transition-all" style={{ width: `${neuPct}%` }}></div>
                                                    <div className="bg-rose-500 transition-all" style={{ width: `${negPct}%` }}></div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="text-emerald-500 font-medium">{posPct}%</span>
                                                    <span className="text-soft-muted/50">/</span>
                                                    <span className="text-rose-500 font-medium">{negPct}%</span>
                                                    <span className="text-soft-muted/50">&middot;</span>
                                                    <span className="text-soft-muted truncate">{p.top_category}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {Object.keys(filteredGrouped).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-soft-muted">
                            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                            <p className="text-sm">No products found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: Product Detail ── */}
            {selectedProduct ? (
                <div className="flex-1 border-l border-soft-muted/10 bg-soft-bg overflow-y-auto custom-scrollbar" ref={detailRef}>

                    {/* Mobile back */}
                    <div className="lg:hidden sticky top-0 z-10 bg-soft-bg border-b border-soft-muted/10 px-4 py-3">
                        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-1.5 text-sm font-medium text-soft-accent">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
                        </button>
                    </div>

                    {detailsLoading || !productDetails ? (
                        <div className="flex flex-col items-center justify-center h-96 space-y-4">
                            <div className="w-10 h-10 border-4 border-soft-accent/20 border-t-soft-accent rounded-full animate-spin"></div>
                            <p className="text-soft-muted text-sm">Analyzing product data...</p>
                        </div>
                    ) : (
                        <div className="p-5 lg:p-6 space-y-5">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 border-b border-soft-muted/10 pb-5">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-soft-accent bg-soft-accent/10 px-2.5 py-1 rounded-full">
                                        {productDetails.summary.product_category}
                                    </span>
                                    <h2 className="text-xl lg:text-2xl font-bold text-soft-fg mt-2 mb-1">{productDetails.productName}</h2>
                                    <p className="text-soft-muted text-sm">
                                        {productDetails.summary.total} total reviews &middot; avg score&nbsp;
                                        <span className={`font-bold ${productDetails.summary.avg_score > 0 ? 'text-emerald-500' : productDetails.summary.avg_score < 0 ? 'text-rose-500' : 'text-soft-muted'}`}>
                                            {productDetails.summary.avg_score > 0 ? '+' : ''}{productDetails.summary.avg_score?.toFixed(1)}
                                        </span>
                                    </p>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="hidden lg:flex p-1.5 hover:shadow-inset-sm rounded-lg text-soft-muted hover:text-soft-fg transition-all shrink-0">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                <StatCard icon="reviews" label="Total Feedback" value={productDetails.summary.total} color="text-soft-accent" />
                                <StatCard icon="sentiment_satisfied" label="Positive" value={`${Math.round((productDetails.summary.positive_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.positive_count} reviews`} color="text-emerald-500" />
                                <StatCard icon="sentiment_dissatisfied" label="Negative" value={`${Math.round((productDetails.summary.negative_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.negative_count} reviews`} color="text-rose-500" />
                                <StatCard icon="sentiment_neutral" label="Neutral" value={`${Math.round((productDetails.summary.neutral_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.neutral_count} reviews`} color="text-slate-400" />
                            </div>

                            {/* Sentiment analysis + Issue breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Sentiment analysis */}
                                <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-soft-fg text-sm">
                                        <span className="material-symbols-outlined text-soft-accent text-[18px]">mood</span>
                                        Sentiment Analysis
                                    </h4>
                                    <ScoreBar sentiments={productDetails.sentiments} total={productDetails.summary.total} />
                                    <div className="mt-4 pt-4 border-t border-soft-muted/10 flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-xs text-soft-muted mb-1">Sentiment Score Range</p>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <span className="text-rose-500">{productDetails.summary.min_score?.toFixed(1)}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-soft-muted/40 to-emerald-500"></div>
                                                <span className="text-emerald-500">{productDetails.summary.max_score > 0 ? '+' : ''}{productDetails.summary.max_score?.toFixed(1)}</span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-2xl font-bold ${productDetails.summary.avg_score > 0 ? 'text-emerald-500' : productDetails.summary.avg_score < 0 ? 'text-rose-500' : 'text-soft-muted'}`}>
                                                {productDetails.summary.avg_score > 0 ? '+' : ''}{productDetails.summary.avg_score?.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-soft-muted">avg</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Issue breakdown */}
                                <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
                                    <h4 className="font-bold mb-3 flex items-center gap-2 text-soft-fg text-sm">
                                        <span className="material-symbols-outlined text-soft-accent text-[18px]">pie_chart</span>
                                        Issue Breakdown
                                    </h4>
                                    <div className="h-44">
                                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                            <PieChart>
                                                <Pie data={productDetails.categories} cx="38%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="count" nameKey="complaint_category" stroke="none">
                                                    {productDetails.categories.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-[11px] text-soft-fg">{v}</span>} layout="vertical" align="right" verticalAlign="middle" />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly trend */}
                            {productDetails.monthlyTrend?.length > 1 && (
                                <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold flex items-center gap-2 text-soft-fg text-sm">
                                            <span className="material-symbols-outlined text-soft-accent text-[18px]">trending_up</span>
                                            Feedback Trend Over Time
                                        </h4>
                                        <span className="text-[10px] text-soft-muted bg-soft-bg shadow-inset-sm px-2 py-1 rounded-full flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">touch_app</span>
                                            Click any month for details
                                        </span>
                                    </div>
                                    <div className="h-48 cursor-pointer">
                                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                            <AreaChart data={productDetails.monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} onClick={handleMonthClick}>
                                                <defs>
                                                    <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#6C63FF', strokeWidth: 1, strokeDasharray: '4 2' }} />
                                                <Area type="monotone" dataKey="positive" name="Positive" stroke="#10b981" fill="url(#gradPos)" strokeWidth={2} dot={false} activeDot={{ r: 4, cursor: 'pointer' }} />
                                                <Area type="monotone" dataKey="negative" name="Negative" stroke="#f43f5e" fill="url(#gradNeg)" strokeWidth={2} dot={false} activeDot={{ r: 4, cursor: 'pointer' }} />
                                                <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" activeDot={{ r: 4, cursor: 'pointer' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Source breakdown */}
                            {productDetails.sourceBreakdown?.length > 0 && (
                                <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-soft-fg text-sm">
                                        <span className="material-symbols-outlined text-soft-accent text-[18px]">hub</span>
                                        Feedback by Source
                                    </h4>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                            <BarChart data={productDetails.sourceBreakdown} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <YAxis type="category" dataKey="source" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} width={75} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Bar dataKey="positive" name="Positive" stackId="a" fill="#10b981" />
                                                <Bar dataKey="negative" name="Negative" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Year & Month Explorer */}
                            <YearDrillSection
                                productName={selectedProduct}
                                onMonthClick={handleMonthLabelClick}
                            />

                            {/* Issue category detail list */}
                            {productDetails.categories?.length > 0 && (
                                <div className="bg-soft-bg rounded-xl shadow-extruded p-5">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-soft-fg text-sm">
                                        <span className="material-symbols-outlined text-soft-accent text-[18px]">category</span>
                                        All Issue Categories
                                    </h4>
                                    <div className="space-y-2.5">
                                        {productDetails.categories.map((cat, i) => {
                                            const pct = productDetails.summary.total ? Math.round((cat.count / productDetails.summary.total) * 100) : 0;
                                            return (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }}></span>
                                                    <span className="text-sm text-soft-fg flex-1 truncate">{cat.complaint_category}</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-soft-bg shadow-inset-sm overflow-hidden shrink-0">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-soft-fg w-10 text-right shrink-0">{cat.count}</span>
                                                    <span className="text-xs text-soft-muted w-8 text-right shrink-0">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Customer Feedback ── */}
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <h4 className="font-bold text-soft-fg flex items-center gap-2 text-sm">
                                        <span className="material-symbols-outlined text-soft-accent text-[18px]">forum</span>
                                        Customer Feedback
                                        <span className="text-xs font-normal text-soft-muted">({productDetails.pagination?.total || 0} total)</span>
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Sentiment tabs */}
                                        <div className="flex rounded-xl overflow-hidden shadow-inset-sm text-xs">
                                            {['All','Positive','Neutral','Negative'].map(s => (
                                                <button key={s} onClick={() => handleFilterChange(s, categoryFilter)}
                                                    className={`px-3 py-1.5 font-medium transition-colors ${sentimentFilter === s
                                                        ? s === 'Positive' ? 'bg-emerald-500 text-white'
                                                        : s === 'Negative' ? 'bg-rose-500 text-white'
                                                        : s === 'Neutral' ? 'bg-soft-muted text-white'
                                                        : 'bg-soft-accent text-white'
                                                        : 'bg-soft-bg text-soft-muted hover:text-soft-fg'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Category dropdown */}
                                        {productDetails.categories?.length > 0 && (
                                            <select value={categoryFilter} onChange={e => handleFilterChange(sentimentFilter, e.target.value)}
                                                className="input-neumorphic text-xs px-2.5 py-1.5 text-soft-fg focus:outline-none focus:ring-2 focus:ring-soft-accent/20">
                                                <option value="All">All Issues</option>
                                                {productDetails.categories.map(c => <option key={c.complaint_category} value={c.complaint_category}>{c.complaint_category}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {productDetails.feedback?.map((fb, idx) => (
                                        <div key={idx}
                                            onMouseEnter={e => gsap.to(e.currentTarget, { x: 4, duration: 0.15 })}
                                            onMouseLeave={e => gsap.to(e.currentTarget, { x: 0, duration: 0.15 })}
                                            className="bg-soft-bg p-4 rounded-xl shadow-extruded-sm hover:shadow-inset transition-all">
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-soft-muted truncate">{fb.complaint_category || 'Other'}</span>
                                                    {fb.source && (
                                                        <span className="text-xs text-soft-muted bg-soft-bg shadow-inset-sm px-2 py-0.5 rounded-full shrink-0">{fb.source}</span>
                                                    )}
                                                </div>
                                                <SentimentBadge sentiment={fb.sentiment} />
                                            </div>
                                            <p className="text-soft-fg text-sm leading-relaxed">"{fb.complaint_text}"</p>
                                            <div className="mt-2.5 flex justify-between items-center text-[11px] text-soft-muted font-medium">
                                                <span>{fb.customer_name || 'Anonymous'}</span>
                                                <span>{fb.date ? new Date(fb.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {(!productDetails.feedback?.length) && (
                                        <div className="flex flex-col items-center justify-center py-12 text-soft-muted">
                                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                                            <p className="text-sm">No feedback matching current filters</p>
                                        </div>
                                    )}
                                </div>

                                {productDetails.pagination && feedbackPage < productDetails.pagination.totalPages && (
                                    <div className="mt-4 flex justify-center">
                                        <button onClick={handleLoadMore} disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-soft-accent/10 hover:bg-soft-accent/20 text-soft-accent font-semibold text-sm rounded-xl transition-colors disabled:opacity-50">
                                            {loadingMore
                                                ? <span className="w-4 h-4 border-2 border-soft-accent/30 border-t-soft-accent rounded-full animate-spin"></span>
                                                : <span className="material-symbols-outlined text-[18px]">expand_more</span>}
                                            Load More ({productDetails.pagination.total - productDetails.feedback.length} remaining)
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            ) : (
                <div className="hidden lg:flex flex-1 items-center justify-center bg-soft-bg border-l border-soft-muted/10">
                    <div className="text-center text-soft-muted">
                        <span className="material-symbols-outlined text-6xl mb-3 block">inventory_2</span>
                        <p className="text-lg font-semibold mb-1">Select a Product</p>
                        <p className="text-sm">Click any product from the left to view detailed analytics</p>
                    </div>
                </div>
            )}

            {/* Month drill-down modal */}
            {monthModal && (
                <MonthModal
                    data={monthModal.data}
                    loading={monthModal.loading}
                    onClose={() => setMonthModal(null)}
                />
            )}
        </div>
    );
};

export default Products;

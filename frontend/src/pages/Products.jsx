import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';

const COLORS = ['#0d968b','#f59e0b','#f43f5e','#8b5cf6','#10b981','#ec4899','#14b8a6','#f97316','#3b82f6','#a855f7'];
const SENTIMENT_COLORS = { Positive: '#10b981', Neutral: '#94a3b8', Negative: '#f43f5e' };

const StatCard = ({ icon, label, value, sub, color = 'text-primary' }) => {
    const bg = color === 'text-emerald-500' ? 'bg-emerald-500/10' : color === 'text-rose-500' ? 'bg-rose-500/10' : color === 'text-slate-400' ? 'bg-slate-500/10' : 'bg-primary/10';
    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
            </div>
        </div>
    );
};

const SentimentBadge = ({ sentiment }) => {
    const cfg = { Positive: 'bg-emerald-500/10 text-emerald-500', Negative: 'bg-rose-500/10 text-rose-500', Neutral: 'bg-slate-500/10 text-slate-400' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg[sentiment] || cfg.Neutral}`}>{sentiment}</span>;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-primary/20 rounded-xl p-3 shadow-lg text-sm">
            <p className="font-bold text-slate-700 dark:text-white mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }}></span>
                    <span className="text-slate-600 dark:text-slate-300">{p.name}: <b>{p.value}</b></span>
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
                        <span className="font-medium text-slate-600 dark:text-slate-300">{s.sentiment}</span>
                        <span className="text-slate-400">{pct}% &middot; {s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: SENTIMENT_COLORS[s.sentiment] || '#94a3b8' }}></div>
                    </div>
                </div>
            );
        })}
    </div>
);

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

    const isDark = document.documentElement.classList.contains('dark');

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Product Analytics...</p>
        </div>
    );

    return (
        <div className="flex-1 overflow-hidden flex bg-slate-50/50 dark:bg-background-dark/50">

            {/* ── LEFT PANEL: Category-grouped product list ── */}
            <div className={`flex flex-col overflow-hidden transition-all duration-500 ${selectedProduct ? 'hidden lg:flex lg:w-72 xl:w-80 lg:flex-none' : 'flex-1'}`}>
                {/* Header */}
                <div className="px-4 py-4 border-b border-slate-200 dark:border-primary/10 bg-white dark:bg-background-dark shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Product Intelligence</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {products.length} products &middot; {Object.keys(grouped).length} categories
                    </p>
                    <div className="mt-3 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-surface-dark border border-transparent dark:border-primary/10 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                </div>

                {/* Category groups */}
                <div className="overflow-y-auto flex-1 custom-scrollbar" ref={listRef}>
                    {Object.entries(filteredGrouped).map(([category, prods]) => (
                        <div key={category} className="border-b border-slate-100 dark:border-primary/5">
                            <button
                                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-surface-dark/60 hover:bg-slate-100 dark:hover:bg-surface-dark transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0">folder</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate">{category}</span>
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold shrink-0">{prods.length}</span>
                                </div>
                                <span className={`material-symbols-outlined text-slate-400 text-[16px] shrink-0 transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {expandedCategories[category] && (
                                <div className="divide-y divide-slate-100 dark:divide-primary/5">
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
                                                className={`product-card cursor-pointer px-4 py-3 transition-colors border-l-2 ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary' : 'border-transparent hover:bg-slate-50 dark:hover:bg-surface-dark/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h3 className={`font-semibold text-sm leading-tight flex-1 mr-2 ${isSelected ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{p.product_name}</h3>
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{total}</span>
                                                </div>
                                                {/* Sentiment mini-bar */}
                                                <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-1.5">
                                                    <div className="bg-emerald-500 transition-all" style={{ width: `${posPct}%` }}></div>
                                                    <div className="bg-slate-400 dark:bg-slate-500 transition-all" style={{ width: `${neuPct}%` }}></div>
                                                    <div className="bg-rose-500 transition-all" style={{ width: `${negPct}%` }}></div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="text-emerald-500 font-medium">{posPct}%</span>
                                                    <span className="text-slate-300 dark:text-slate-600">/</span>
                                                    <span className="text-rose-500 font-medium">{negPct}%</span>
                                                    <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                                                    <span className="text-slate-400 dark:text-slate-500 truncate">{p.top_category}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {Object.keys(filteredGrouped).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                            <p className="text-sm">No products found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: Product Detail ── */}
            {selectedProduct ? (
                <div className="flex-1 border-l border-slate-200 dark:border-primary/20 bg-white dark:bg-background-dark overflow-y-auto custom-scrollbar" ref={detailRef}>

                    {/* Mobile back */}
                    <div className="lg:hidden sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-primary/10 px-4 py-3">
                        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-1.5 text-sm font-medium text-primary">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
                        </button>
                    </div>

                    {detailsLoading || !productDetails ? (
                        <div className="flex flex-col items-center justify-center h-96 space-y-4">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Analyzing product data...</p>
                        </div>
                    ) : (
                        <div className="p-5 lg:p-6 space-y-5">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-primary/10 pb-5">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                        {productDetails.summary.product_category}
                                    </span>
                                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white mt-2 mb-1">{productDetails.productName}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        {productDetails.summary.total} total reviews &middot; avg score&nbsp;
                                        <span className={`font-bold ${productDetails.summary.avg_score > 0 ? 'text-emerald-500' : productDetails.summary.avg_score < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {productDetails.summary.avg_score > 0 ? '+' : ''}{productDetails.summary.avg_score?.toFixed(1)}
                                        </span>
                                    </p>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="hidden lg:flex p-1.5 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                <StatCard icon="reviews" label="Total Feedback" value={productDetails.summary.total} color="text-primary" />
                                <StatCard icon="sentiment_satisfied" label="Positive" value={`${Math.round((productDetails.summary.positive_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.positive_count} reviews`} color="text-emerald-500" />
                                <StatCard icon="sentiment_dissatisfied" label="Negative" value={`${Math.round((productDetails.summary.negative_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.negative_count} reviews`} color="text-rose-500" />
                                <StatCard icon="sentiment_neutral" label="Neutral" value={`${Math.round((productDetails.summary.neutral_count / productDetails.summary.total) * 100) || 0}%`} sub={`${productDetails.summary.neutral_count} reviews`} color="text-slate-400" />
                            </div>

                            {/* Sentiment analysis + Issue breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Sentiment analysis */}
                                <div className="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-5 shadow-sm">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">mood</span>
                                        Sentiment Analysis
                                    </h4>
                                    <ScoreBar sentiments={productDetails.sentiments} total={productDetails.summary.total} />
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-primary/10 flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400 mb-1">Sentiment Score Range</p>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <span className="text-rose-500">{productDetails.summary.min_score?.toFixed(1)}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-slate-400 to-emerald-500"></div>
                                                <span className="text-emerald-500">{productDetails.summary.max_score > 0 ? '+' : ''}{productDetails.summary.max_score?.toFixed(1)}</span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-2xl font-bold ${productDetails.summary.avg_score > 0 ? 'text-emerald-500' : productDetails.summary.avg_score < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                {productDetails.summary.avg_score > 0 ? '+' : ''}{productDetails.summary.avg_score?.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-slate-400">avg</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Issue breakdown */}
                                <div className="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-5 shadow-sm">
                                    <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
                                        Issue Breakdown
                                    </h4>
                                    <div className="h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={productDetails.categories} cx="38%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="count" nameKey="complaint_category" stroke="none">
                                                    {productDetails.categories.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-[11px] text-slate-600 dark:text-slate-300">{v}</span>} layout="vertical" align="right" verticalAlign="middle" />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly trend */}
                            {productDetails.monthlyTrend?.length > 1 && (
                                <div className="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-5 shadow-sm">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                                        Feedback Trend Over Time
                                    </h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={productDetails.monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(13,150,139,0.1)' : '#f1f5f9'} />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', fontSize: 11 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', fontSize: 11 }} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="positive" name="Positive" stroke="#10b981" fill="url(#gradPos)" strokeWidth={2} dot={false} />
                                                <Area type="monotone" dataKey="negative" name="Negative" stroke="#f43f5e" fill="url(#gradNeg)" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Source breakdown */}
                            {productDetails.sourceBreakdown?.length > 0 && (
                                <div className="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-5 shadow-sm">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                                        Feedback by Source
                                    </h4>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={productDetails.sourceBreakdown} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? 'rgba(13,150,139,0.1)' : '#f1f5f9'} />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', fontSize: 11 }} />
                                                <YAxis type="category" dataKey="source" axisLine={false} tickLine={false} tick={{ fill: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', fontSize: 11 }} width={75} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Bar dataKey="positive" name="Positive" stackId="a" fill="#10b981" />
                                                <Bar dataKey="negative" name="Negative" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Issue category detail list */}
                            {productDetails.categories?.length > 0 && (
                                <div className="bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-primary/10 p-5 shadow-sm">
                                    <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">category</span>
                                        All Issue Categories
                                    </h4>
                                    <div className="space-y-2.5">
                                        {productDetails.categories.map((cat, i) => {
                                            const pct = productDetails.summary.total ? Math.round((cat.count / productDetails.summary.total) * 100) : 0;
                                            return (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }}></span>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{cat.complaint_category}</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10 text-right shrink-0">{cat.count}</span>
                                                    <span className="text-xs text-slate-400 w-8 text-right shrink-0">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Customer Feedback ── */}
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
                                        Customer Feedback
                                        <span className="text-xs font-normal text-slate-400">({productDetails.pagination?.total || 0} total)</span>
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Sentiment tabs */}
                                        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-primary/20 text-xs">
                                            {['All','Positive','Neutral','Negative'].map(s => (
                                                <button key={s} onClick={() => handleFilterChange(s, categoryFilter)}
                                                    className={`px-3 py-1.5 font-medium transition-colors ${sentimentFilter === s
                                                        ? s === 'Positive' ? 'bg-emerald-500 text-white'
                                                        : s === 'Negative' ? 'bg-rose-500 text-white'
                                                        : s === 'Neutral' ? 'bg-slate-500 text-white'
                                                        : 'bg-primary text-white'
                                                        : 'bg-white dark:bg-surface-dark text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary/5'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Category dropdown */}
                                        {productDetails.categories?.length > 0 && (
                                            <select value={categoryFilter} onChange={e => handleFilterChange(sentimentFilter, e.target.value)}
                                                className="text-xs bg-white dark:bg-surface-dark border border-slate-200 dark:border-primary/20 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30">
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
                                            className="bg-slate-50 dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm">
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">{fb.complaint_category || 'Other'}</span>
                                                    {fb.source && (
                                                        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0">{fb.source}</span>
                                                    )}
                                                </div>
                                                <SentimentBadge sentiment={fb.sentiment} />
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">"{fb.complaint_text}"</p>
                                            <div className="mt-2.5 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                                                <span>{fb.customer_name || 'Anonymous'}</span>
                                                <span>{fb.date ? new Date(fb.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {(!productDetails.feedback?.length) && (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                                            <p className="text-sm">No feedback matching current filters</p>
                                        </div>
                                    )}
                                </div>

                                {productDetails.pagination && feedbackPage < productDetails.pagination.totalPages && (
                                    <div className="mt-4 flex justify-center">
                                        <button onClick={handleLoadMore} disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm rounded-xl transition-colors disabled:opacity-50">
                                            {loadingMore
                                                ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
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
                <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/30 dark:bg-background-dark/30 border-l border-slate-200 dark:border-primary/10">
                    <div className="text-center text-slate-400 dark:text-slate-600">
                        <span className="material-symbols-outlined text-6xl mb-3 block">inventory_2</span>
                        <p className="text-lg font-semibold mb-1 text-slate-500 dark:text-slate-500">Select a Product</p>
                        <p className="text-sm">Click any product from the left to view detailed analytics</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Sparkles, Paperclip, Mic, MicOff, X, Plus, MessageSquare, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

/* ── Typing cursor ───────────────────────────────────────────────────────── */
const TypingCursor = () => (
    <span style={{
        display: 'inline-block', width: '2px', height: '1em',
        background: '#0d968b', marginLeft: '2px',
        verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite',
    }} />
);

/* ── Explicit markdown component map (same as attrition) ────────────────── */
const mdComponents = {
    p:      ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
    ul:     ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol:     ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li:     ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
    h1:     ({ node, ...props }) => <h1 className="text-base font-bold mt-3 mb-1" {...props} />,
    h2:     ({ node, ...props }) => <h2 className="text-sm font-bold mt-3 mb-1.5 text-teal-700 dark:text-teal-300" {...props} />,
    h3:     ({ node, ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-800 dark:text-slate-100" {...props} />,
    hr:     ({ node, ...props }) => <hr className="my-3 border-slate-200 dark:border-slate-700" {...props} />,
    blockquote: ({ node, ...props }) => (
        <blockquote className="border-l-4 border-teal-400/60 bg-teal-50/60 dark:bg-teal-900/20 px-4 py-2 my-2 rounded-r-lg text-slate-600 dark:text-slate-300 italic" {...props} />
    ),
    table: ({ node, ...props }) => (
        <div className="overflow-x-auto my-3">
            <table className="text-xs border-collapse w-full" {...props} />
        </div>
    ),
    th: ({ node, ...props }) => (
        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-semibold text-left" {...props} />
    ),
    td: ({ node, ...props }) => (
        <td className="border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-700 dark:text-slate-300" {...props} />
    ),
    code: ({ node, inline, ...props }) => inline
        ? <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono text-teal-700 dark:text-teal-300" {...props} />
        : <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2" {...props} />,
};

/* ── StreamingMessage — types out like ChatGPT ───────────────────────────── */
const StreamingMessage = ({ content, onDone }) => {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const indexRef = useRef(0);

    useEffect(() => {
        setDisplayed('');
        setDone(false);
        indexRef.current = 0;
        const stream = () => {
            if (indexRef.current >= content.length) {
                setDone(true);
                onDone?.();
                return;
            }
            const chunk = Math.floor(Math.random() * 3) + 1;
            indexRef.current = Math.min(indexRef.current + chunk, content.length);
            setDisplayed(content.slice(0, indexRef.current));
            setTimeout(stream, 10 + Math.random() * 8);
        };
        const t = setTimeout(stream, 60);
        return () => clearTimeout(t);
    }, [content]);

    return (
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{displayed}</ReactMarkdown>
            {!done && <TypingCursor />}
        </div>
    );
};

/* ── StaticMessage ───────────────────────────────────────────────────────── */
const StaticMessage = ({ content }) => (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
    </div>
);

/* ── ThinkingDots ────────────────────────────────────────────────────────── */
const ThinkingDots = () => (
    <div className="flex items-center space-x-1 px-1 py-0.5">
        {[0,1,2].map(i => (
            <span key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: '#0d968b',
                display: 'inline-block',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
        ))}
    </div>
);

/* ── localStorage helpers ────────────────────────────────────────────────── */
const HISTORY_KEY = 'esme_cfa_chat_history';
const WELCOME_MSG = {
    role: 'bot',
    content: "## Hi, I'm Esme 👋\n\nI'm your AI Customer Intelligence Agent with live access to **15,375 customer reviews** across Blue Heaven and Nature's Essence.\n\nAsk me anything — sentiment trends, product analysis, complaint breakdowns, or top customer quotes.",
    streaming: false,
};

const QUICK_PROMPTS = [
    "Top 10 most complained products",
    "Sentiment breakdown by brand",
    "Most common complaint categories",
    "Show negative reviews for Blue Heaven",
];

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(sessions) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions)); } catch {}
}
function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ── Main Chatbot component ──────────────────────────────────────────────── */
const Chatbot = () => {
    const [sessions, setSessions] = useState(() => loadHistory());
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingIdx, setStreamingIdx] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

    const scrollRef = useRef(null);
    const bottomRef = useRef(null);
    const userAtBottom = useRef(true);
    const activeIdRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);

    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        userAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }, []);

    const smartScroll = useCallback(() => {
        if (userAtBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { smartScroll(); }, [messages, isLoading]);

    const persistSession = useCallback((msgs, sid) => {
        if (!sid) return;
        const sanitized = msgs.map(m => ({ ...m, streaming: false }));
        const firstUser = sanitized.find(m => m.role === 'user')?.content || 'New Chat';
        const title = firstUser.replace(/📎.*?\n\n/, '');
        const trimmed = title.length > 45 ? title.slice(0, 45) + '…' : title;
        const session = { id: sid, title: trimmed, messages: sanitized, updatedAt: new Date().toISOString() };
        setSessions(prev => {
            const idx = prev.findIndex(s => s.id === sid);
            const updated = idx >= 0
                ? prev.map((s, i) => i === idx ? session : s)
                : [session, ...prev];
            saveHistory(updated);
            return updated;
        });
    }, []);

    const handleNewChat = () => {
        setActiveId(null);
        activeIdRef.current = null;
        setMessages([WELCOME_MSG]);
        setInput('');
        setStreamingIdx(null);
        setAttachedFile(null);
        userAtBottom.current = true;
    };

    const handleLoadSession = (session) => {
        setActiveId(session.id);
        activeIdRef.current = session.id;
        setMessages(session.messages.map(m => ({ ...m, streaming: false })));
        setInput('');
        setStreamingIdx(null);
        userAtBottom.current = true;
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleDeleteSession = (e, sessionId) => {
        e.stopPropagation();
        const updated = sessions.filter(s => s.id !== sessionId);
        setSessions(updated);
        saveHistory(updated);
        if (activeId === sessionId) handleNewChat();
    };

    // ── File handling ───────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n');
            const preview = lines.slice(0, 50).join('\n');
            setAttachedFile({
                name: file.name,
                content: preview + (lines.length > 50 ? `\n...(${lines.length - 50} more rows)` : ''),
            });
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Voice handling ──────────────────────────────────────────────────────
    const toggleVoice = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert('Voice input not supported in this browser. Try Chrome or Edge.'); return; }
        if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
        const rec = new SR();
        recognitionRef.current = rec;
        rec.lang = 'en-IN';
        rec.onresult = (e) => { setInput(p => p ? p + ' ' + e.results[0][0].transcript : e.results[0][0].transcript); setIsRecording(false); };
        rec.onerror = () => setIsRecording(false);
        rec.onend = () => setIsRecording(false);
        rec.start();
        setIsRecording(true);
    };

    // ── Send ────────────────────────────────────────────────────────────────
    const handleSend = async (quickText) => {
        const msgText = (quickText || input).trim();
        if (!msgText || isLoading) return;

        const sessionId = activeIdRef.current || String(Date.now());
        if (!activeIdRef.current) { activeIdRef.current = sessionId; setActiveId(sessionId); }

        const displayContent = attachedFile ? `📎 **${attachedFile.name}**\n\n${msgText}` : msgText;
        const fileContext = attachedFile ? { name: attachedFile.name, content: attachedFile.content } : null;

        const userMessage = { role: 'user', content: displayContent, streaming: false };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setAttachedFile(null);
        setIsLoading(true);
        userAtBottom.current = true;

        try {
            const res = await axios.post('/api/chat', {
                message: msgText,
                threadId: sessionId,
                fileContext,
            }, { timeout: 120000 });

            setMessages(prev => {
                const newIdx = prev.length;
                setStreamingIdx(newIdx);
                const newMsgs = [...prev, { role: 'bot', content: res.data.response, streaming: true }];
                persistSession(newMsgs, sessionId);
                return newMsgs;
            });
        } catch (err) {
            const errMsg = err.response?.data?.error || "I'm having trouble connecting. Please try again.";
            setMessages(prev => {
                const newMsgs = [...prev, { role: 'bot', content: `❌ ${errMsg}`, streaming: false }];
                persistSession(newMsgs, sessionId);
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onStreamDone = useCallback((idx) => {
        setStreamingIdx(null);
        setMessages(prev => prev.map((m, i) => i === idx ? { ...m, streaming: false } : m));
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const showQuickPrompts = messages.length === 1 && !isLoading;

    return (
        <>
            <style>{`
                @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
                .msg-enter { animation: fadeIn 0.2s ease forwards; }
            `}</style>

            <div className="h-full w-full flex bg-slate-50 dark:bg-background-dark overflow-hidden relative">

                {/* Mobile backdrop */}
                {sidebarOpen && (
                    <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
                )}

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className={`
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    fixed md:relative md:translate-x-0
                    ${sidebarOpen ? 'md:w-64' : 'md:w-0'}
                    top-0 left-0 h-full z-30 md:z-auto
                    w-72 md:flex-shrink-0
                    transition-all duration-300 overflow-hidden
                    border-r border-slate-200 dark:border-primary/10
                    bg-white dark:bg-surface-dark flex flex-col
                `}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-primary/10 flex-shrink-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Chat History</span>
                        <button onClick={handleNewChat} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors">
                            <Plus size={12} /> New
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2" style={{ scrollbarWidth: 'thin' }}>
                        {sessions.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-8 px-3 leading-relaxed">No chat history yet.<br />Start a conversation!</p>
                        ) : sessions.map(session => (
                            <div key={session.id} className="group relative">
                                <button
                                    onClick={() => handleLoadSession(session)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                                        activeId === session.id
                                            ? 'bg-primary/10 border border-primary/30 dark:border-primary/40'
                                            : 'hover:bg-slate-50 dark:hover:bg-primary/5 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-start gap-2 pr-5">
                                        <MessageSquare size={12} className={`mt-0.5 flex-shrink-0 ${activeId === session.id ? 'text-primary' : 'text-slate-400'}`} />
                                        <div className="min-w-0">
                                            <p className={`text-xs font-medium truncate leading-snug ${activeId === session.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {session.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatTime(session.updatedAt)}</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ── Main panel ──────────────────────────────────────────── */}
                <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-surface-dark overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-teal-600 dark:from-primary dark:to-teal-700 px-4 py-3 text-white flex items-center gap-3 shadow-md flex-shrink-0">
                        <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded-md hover:bg-white/20 transition-colors flex-shrink-0">
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div className="p-1.5 bg-white/20 rounded-lg"><Sparkles size={18} /></div>
                        <div>
                            <h3 className="font-bold text-base tracking-tight">Esme AI</h3>
                            <p className="text-xs text-teal-100">Customer Intelligence · 15,375 reviews</p>
                        </div>
                        {!sidebarOpen && (
                            <button onClick={handleNewChat} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors">
                                <Plus size={13} /> New Chat
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        onScroll={onScroll}
                        className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-slate-50/60 dark:bg-background-dark/50"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
                    >
                        {messages.map((m, i) => (
                            <div key={i} className={`flex msg-enter ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end gap-2 max-w-[88%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar */}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 ${
                                        m.role === 'user'
                                            ? 'bg-primary text-white'
                                            : 'bg-white dark:bg-slate-800 border-2 border-primary/20 text-primary'
                                    }`}>
                                        {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                    </div>
                                    {/* Bubble */}
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        m.role === 'user'
                                            ? 'bg-primary text-white rounded-br-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                                    }`}>
                                        {m.role === 'user' ? (
                                            <div className="prose prose-sm prose-invert max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                    ...mdComponents,
                                                    strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                                }}>{m.content}</ReactMarkdown>
                                            </div>
                                        ) : m.streaming ? (
                                            <StreamingMessage content={m.content} onDone={() => onStreamDone(i)} />
                                        ) : (
                                            <StaticMessage content={m.content} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isLoading && (
                            <div className="flex justify-start msg-enter">
                                <div className="flex items-end gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                                        <Bot size={12} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                                        <span className="text-xs text-slate-400 mr-1">Analyzing data</span>
                                        <ThinkingDots />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} className="h-1" />
                    </div>

                    {/* Quick prompts */}
                    {showQuickPrompts && (
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_PROMPTS.map((p, i) => (
                                    <button key={i} onClick={() => handleSend(p)}
                                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all">
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="px-5 py-4 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-primary/10 flex-shrink-0">
                        {attachedFile && (
                            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-primary/10 border border-primary/25 rounded-lg text-xs text-primary font-medium w-fit max-w-xs">
                                <Paperclip size={12} />
                                <span className="truncate">{attachedFile.name}</span>
                                <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-red-500 transition-colors"><X size={12} /></button>
                            </div>
                        )}
                        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                            <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach CSV"
                                className="p-1.5 text-slate-400 hover:text-primary transition-colors flex-shrink-0">
                                <Paperclip size={18} />
                            </button>
                            <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileChange} />

                            <textarea
                                value={input}
                                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                rows={1}
                                placeholder="Ask Esme anything about customer feedback…"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none disabled:opacity-50 resize-none overflow-y-auto leading-relaxed py-1"
                                style={{ minHeight: '28px', maxHeight: '120px' }}
                            />

                            <button type="button" onClick={toggleVoice} title={isRecording ? 'Stop' : 'Voice input'}
                                className={`p-1.5 transition-all flex-shrink-0 rounded-lg ${isRecording ? 'text-red-500 bg-red-50 dark:bg-red-500/10 animate-pulse' : 'text-slate-400 hover:text-primary'}`}>
                                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>

                            <button onClick={() => handleSend()} disabled={(!input.trim() && !attachedFile) || isLoading}
                                className="p-1.5 rounded-lg flex-shrink-0 transition-all disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed bg-primary text-white hover:bg-primary/90 disabled:bg-slate-200 dark:disabled:bg-slate-700 shadow-sm">
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2">Esme AI queries live data · CSV upload &amp; voice supported</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbot;

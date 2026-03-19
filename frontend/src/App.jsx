import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Upload from './pages/Upload';
import Chatbot from './components/Chatbot';
import axios from 'axios';

// axios.defaults.baseURL = '/cfa';

const NAV_LINKS = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/products', icon: 'inventory_2', label: 'Products' },
  { to: '/chat', icon: 'auto_awesome', label: 'AI Chat' },
  { to: '/upload', icon: 'cloud_upload', label: 'Upload' },
];

const NavLink = ({ to, icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
        isActive
          ? 'bg-primary text-white shadow-md shadow-primary/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="hidden lg:block">{children}</span>
    </Link>
  );
};

/* ── Mobile bottom navigation ──────────────────────────────────────────── */
const MobileBottomNav = () => {
  const location = useLocation();
  return (
    <nav className="md:hidden flex-shrink-0 bg-white dark:bg-[#05080f]/90 border-t border-slate-200 dark:border-white/[0.07] flex items-center justify-around px-1 py-2 z-50 backdrop-blur-md">
      {NAV_LINKS.map(({ to, icon, label }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-colors ${
              isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] transition-all ${isActive ? 'text-primary scale-110' : ''}`}>{icon}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

function AppContent() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!document.getElementById('material-icons-link')) {
      const link = document.createElement('link');
      link.id = 'material-icons-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setDarkMode(true);
    }
  };

  return (
    <>
      {/* ── Dark-mode background orbs ───────────────────────────────────── */}
      {darkMode && (
        <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{
            position:'absolute', width:500, height:500, borderRadius:'50%',
            top:-160, left:-160,
            background:'radial-gradient(circle, rgba(13,150,139,0.14) 0%, transparent 70%)',
            filter:'blur(80px)', animation:'orb-drift 28s ease-in-out infinite'
          }}/>
          <div style={{
            position:'absolute', width:440, height:440, borderRadius:'50%',
            bottom:-120, right:-120,
            background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            filter:'blur(80px)', animation:'orb-drift 28s ease-in-out infinite',
            animationDelay:'-14s'
          }}/>
          <div style={{
            position:'absolute', width:360, height:360, borderRadius:'50%',
            top:'45%', left:'45%',
            transform:'translate(-50%,-50%)',
            background:'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
            filter:'blur(80px)', animation:'orb-drift 28s ease-in-out infinite',
            animationDelay:'-7s'
          }}/>
        </div>
      )}

    <div className="relative z-10 flex flex-col h-[100dvh] font-display text-slate-900 dark:text-slate-100 bg-background-light dark:bg-transparent overflow-hidden">
      {/* ── Top header ─────────────────────────────────────────────────── */}
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-200 dark:border-white/[0.07] bg-white/80 dark:bg-[#05080f]/80 backdrop-blur-md z-20 flex-shrink-0">
        {/* Logo + brand */}
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:pr-6 md:border-r md:border-slate-200 dark:md:border-primary/20">
            <img src="/cfa/Esme-Logo-01.webp" alt="Esme Logo" className="h-7 md:h-8 w-auto object-contain dark:brightness-200 dark:contrast-200" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden sm:block">Customer Feedback Analysis</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} icon={icon}>{label}</NavLink>
            ))}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[22px]">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">Administrator</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/10 text-primary font-bold shadow-sm text-sm">
              A
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/chat" element={<Chatbot />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </div>

      {/* ── Mobile bottom navigation ───────────────────────────────────── */}
      <MobileBottomNav />
    </div>
    </>
  );
}

function App() {
  return (
    <Router basename="/cfa">
      <AppContent />
    </Router>
  );
}

export default App;

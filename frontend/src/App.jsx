import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Upload from './pages/Upload';
import Chatbot from './components/Chatbot';
import axios from 'axios';

axios.defaults.baseURL = '/cfa';

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
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 text-sm ${
        isActive
          ? 'shadow-inset-sm text-soft-accent bg-soft-bg'
          : 'text-soft-muted hover:text-soft-fg hover:shadow-extruded-sm active:shadow-inset-sm'
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
    <nav className="md:hidden flex-shrink-0 bg-soft-bg/80 backdrop-blur-md shadow-extruded border-t border-transparent flex items-center justify-around px-2 py-3 z-50">
      {NAV_LINKS.map(({ to, icon, label }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-300 ${
              isActive ? 'shadow-inset-sm text-soft-accent' : 'text-soft-muted'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive ? 'scale-110' : ''}`}>{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

function AppContent() {
  useEffect(() => {
    if (!document.getElementById('material-icons-link')) {
      const link = document.createElement('link');
      link.id = 'material-icons-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
    // Force light mode theme
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="relative z-10 flex flex-col h-[100dvh] font-body text-soft-fg bg-soft-bg overflow-hidden">
      {/* ── Top header ─────────────────────────────────────────────────── */}
      <header className="h-16 md:h-20 flex items-center justify-between px-6 md:px-10 bg-soft-bg/80 backdrop-blur-md z-20 flex-shrink-0 shadow-extruded-sm">
        {/* Logo + brand */}
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3 md:pr-8 md:border-r border-transparent">
             <div className="p-1.5 rounded-xl shadow-inset">
                <img src="/cfa/Esme-Logo-01.webp" alt="Esme Logo" className="h-7 md:h-8 w-auto object-contain" />
             </div>
            <span className="text-sm font-extrabold text-soft-fg font-display tracking-tight hidden sm:block">Customer Intelligence</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} icon={icon}>{label}</NavLink>
            ))}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end px-4 py-1.5 rounded-2xl shadow-inset-sm">
              <p className="text-[10px] font-extrabold text-soft-fg uppercase tracking-widest leading-none">Administrator</p>
              <p className="text-[9px] text-soft-accent font-bold mt-1">Super User</p>
          </div>
          <div className="w-10 h-10 rounded-2xl shadow-extruded flex items-center justify-center bg-soft-bg text-soft-accent font-black text-sm border-2 border-transparent">
            A
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-soft-bg">
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Search, ClipboardList, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { initializeDefaults } from './db';

// Pages
import IdentificationPage from './pages/IdentificationPage';
import AuditLogPage from './pages/AuditLogPage';
import SummaryPage from './pages/SummaryPage';
import SettingsPage from './pages/SettingsPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="pb-20">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <NavLink 
          to="/identification" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Search size={22} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Identify</span>
        </NavLink>
        
        <NavLink 
          to="/audit" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <ClipboardList size={22} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Audit</span>
        </NavLink>
        
        <NavLink 
          to="/summary" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <BarChart3 size={22} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Summary</span>
        </NavLink>
        
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <SettingsIcon size={22} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initializeDefaults();
  }, []);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/identification" replace />} />
          <Route path="/identification" element={<IdentificationPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

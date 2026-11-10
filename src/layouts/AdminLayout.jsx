import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  Radio,
  FileText,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export default function AdminLayout() {
  const { admin, loading, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider uppercase">Authenticating Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Tournaments', path: '/admin/tournaments', icon: Trophy },
    { name: 'Registrations', path: '/admin/registrations', icon: Users },
    { name: 'Match Fixtures', path: '/admin/fixtures', icon: Calendar },
    { name: 'Live Scoring', path: '/admin/scoring', icon: Radio },
    { name: 'Reports & Exports', path: '/admin/reports', icon: FileText },
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-lime-500 flex items-center justify-center text-slate-950 font-black">
            <Flame className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-heading font-black text-base text-white">ADMIN CONSOLE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 h-screen bg-slate-900/95 md:bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 transition-transform duration-200 ease-in-out flex flex-col`}
      >
        {/* Sidebar Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-500 flex items-center justify-center text-slate-950 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-black text-lg text-white block leading-tight">
                ADMIN <span className="text-lime-400">PANEL</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                7Brothers Cricket
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Identity pill */}
        <div className="mx-4 my-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Logged In As</div>
          <div className="text-xs font-bold text-white truncate">{admin?.email}</div>
          <div className="text-[10px] font-semibold text-lime-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span> Verified Admin
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-lime-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

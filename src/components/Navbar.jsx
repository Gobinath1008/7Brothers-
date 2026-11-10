import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Activity,
  Calendar,
  UserPlus,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Flame,
  GitBranch,
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { admin, logout } = useAuth();

  const publicNavLinks = [
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Register Team', path: '/register' },
    { name: 'Live Scores', path: '/live' },
    { name: 'Bracket', path: '/bracket' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-md group-hover:shadow-lime-500/20 transition-all">
              <Flame className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-heading font-black text-xl tracking-tight text-white flex items-center gap-1.5">
                7BROTHERS <span className="text-lime-400">CRICKET</span>
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Tournament Manager
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {publicNavLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Admin Access */}
          <div className="hidden md:flex items-center gap-3">
            {admin ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panel
                </Link>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-2">
          {publicNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-base font-semibold ${
                isActive(link.path)
                  ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                  : 'text-slate-300 hover:bg-slate-850'
              }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-800">
            {admin ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold bg-lime-500 text-slate-950"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

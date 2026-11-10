import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { matchService } from '../services/api';
import { Radio, ChevronRight, Home, Trophy, UserPlus, GitBranch, Flame } from 'lucide-react';

export default function PublicLayout() {
  const [liveMatches, setLiveMatches] = useState([]);
  const location = useLocation();

  useEffect(() => {
    async function checkLiveMatches() {
      try {
        const res = await matchService.getAll(null, null, 'LIVE');
        if (res.success && res.matches) {
          setLiveMatches(res.matches);
        }
      } catch (e) {
        // Silent fail for ticker
      }
    }

    checkLiveMatches();
    const interval = setInterval(checkLiveMatches, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Register', path: '/register', icon: UserPlus },
    { name: 'Live Scores', path: '/live', icon: Radio, isLive: liveMatches.length > 0 },
    { name: 'Bracket', path: '/bracket', icon: GitBranch },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Live Match Top Alert Ticker */}
      {liveMatches.length > 0 && (
        <div className="bg-lime-500 text-slate-950 text-xs font-bold py-1.5 px-3 sm:px-4 overflow-hidden relative shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 live-dot"></span>
              <span className="uppercase tracking-wider font-extrabold flex items-center gap-1 text-[11px] sm:text-xs">
                <Radio className="w-3.5 h-3.5" /> <span className="hidden xs:inline">LIVE MATCH:</span>
              </span>
            </div>
            <div className="truncate flex-1 text-center font-bold text-[11px] sm:text-xs">
              {liveMatches[0].teamAName} vs {liveMatches[0].teamBName}
              {liveMatches[0].innings1?.runs !== undefined && (
                <span className="ml-1 sm:ml-2 font-mono">
                  ({liveMatches[0].innings1.runs}/{liveMatches[0].innings1.wickets})
                </span>
              )}
            </div>
            <Link
              to={`/matches/${liveMatches[0]._id}`}
              className="flex items-center gap-0.5 underline hover:text-black font-extrabold flex-shrink-0 text-[11px] sm:text-xs"
            >
              Watch <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <Navbar />

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <Footer />

      {/* Sticky Mobile Bottom Navigation Bar (Phone UX) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                active ? 'text-lime-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 live-dot"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.name}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-lime-400 mt-0.5"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

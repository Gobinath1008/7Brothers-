import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { matchService } from '../services/api';
import { Radio, ChevronRight } from 'lucide-react';

export default function PublicLayout() {
  const [liveMatches, setLiveMatches] = useState([]);

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
    const interval = setInterval(checkLiveMatches, 15000); // Poll live status
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Live Match Top Alert Ticker */}
      {liveMatches.length > 0 && (
        <div className="bg-lime-500 text-slate-950 text-xs font-bold py-1.5 px-4 overflow-hidden relative shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 live-dot"></span>
              <span className="uppercase tracking-wider font-extrabold flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" /> LIVE MATCH NOW:
              </span>
            </div>
            <div className="truncate flex-1 text-center font-medium">
              {liveMatches[0].teamAName} vs {liveMatches[0].teamBName}
              {liveMatches[0].innings1?.runs !== undefined && (
                <span className="ml-2 font-bold font-mono">
                  ({liveMatches[0].innings1.runs}/{liveMatches[0].innings1.wickets})
                </span>
              )}
            </div>
            <Link
              to={`/matches/${liveMatches[0]._id}`}
              className="flex items-center gap-0.5 underline hover:text-black font-extrabold flex-shrink-0"
            >
              Watch Scorecard <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

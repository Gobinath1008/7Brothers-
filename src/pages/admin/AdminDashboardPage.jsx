import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, registrationService, matchService } from '../../services/api';
import {
  Trophy,
  Users,
  Calendar,
  Radio,
  FileText,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle,
  Flame,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [tRes, rRes, mRes] = await Promise.all([
          tournamentService.getAll(),
          registrationService.getAll(),
          matchService.getAll(),
        ]);

        if (tRes.success) setTournaments(tRes.tournaments || []);
        if (rRes.success) setRegistrations(rRes.registrations || []);
        if (mRes.success) setMatches(mRes.matches || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalPlayers = registrations.reduce((sum, r) => sum + (r.players?.length || 0), 0);
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');

  const stats = [
    { label: 'Total Tournaments', value: tournaments.length, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Registered Teams', value: registrations.length, icon: Users, color: 'text-lime-400', bg: 'bg-lime-400/10' },
    { label: 'Registered Players', value: totalPlayers, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Live Matches', value: liveMatches.length, icon: Radio, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Upcoming Matches', value: upcomingMatches.length, icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: 'Completed Matches', value: completedMatches.length, icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            TOURNAMENT CONTROL <span className="text-lime-400">CENTER</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time management for Box Cricket Tournaments, Fixtures & Scoring
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/tournaments"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> New Tournament
          </Link>
          <Link
            to="/admin/scoring"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
          >
            <Radio className="w-4 h-4 text-red-400" /> Live Scorer
          </Link>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="glass-panel p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-mono text-2xl font-black text-white">{loading ? '-' : s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Dual Section: Recent Registrations & Active/Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Registrations Table */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Recent Registrations</h2>
              <span className="text-xs text-slate-400">Latest guest team submissions</span>
            </div>
            <Link
              to="/admin/registrations"
              className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1"
            >
              Manage All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-900 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No team registrations recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {registrations.slice(0, 5).map((r) => (
                <div
                  key={r._id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Capt: {r.captainName} ({r.captainPhone}) • {r.players?.length || 0} Players
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[10px] text-lime-400 block">{r.registrationId}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live / Upcoming Matches */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Live & Upcoming Fixtures</h2>
              <span className="text-xs text-slate-400">Knockout matches in progress</span>
            </div>
            <Link
              to="/admin/fixtures"
              className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1"
            >
              Fixtures Sheet <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-900 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No fixtures generated yet. Confirm registered teams and generate bracket!
            </div>
          ) : (
            <div className="space-y-2.5">
              {matches.slice(0, 5).map((m) => {
                const isLive = m.status === 'LIVE';
                return (
                  <div
                    key={m._id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isLive
                        ? 'bg-red-950/20 border-red-500/50'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{m.teamAName}</span>
                        <span className="text-slate-500 text-[10px]">vs</span>
                        <span>{m.teamBName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        M#{m.matchNumber} • {m.roundName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLive ? (
                        <Link
                          to={`/admin/scoring?match=${m._id}`}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-red-500 text-white shadow-sm flex items-center gap-1"
                        >
                          <Radio className="w-3 h-3" /> Score Now
                        </Link>
                      ) : m.status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-lime-400 bg-lime-500/10">
                          Finished
                        </span>
                      ) : (
                        <Link
                          to={`/admin/scoring?match=${m._id}`}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-slate-300"
                        >
                          Start Match
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

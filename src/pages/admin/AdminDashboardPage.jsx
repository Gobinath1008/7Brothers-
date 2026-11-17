import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, registrationService, matchService, adminService } from '../../services/api';
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
  ArrowUpRight,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data Management / Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState('DELETE_MATCHES'); // 'DELETE_MATCHES' | 'DELETE_TEAMS' | 'WIPE_ALL'
  const [deleteTournamentId, setDeleteTournamentId] = useState('');
  const [deleteTournamentsCheck, setDeleteTournamentsCheck] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
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
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openDeleteModal = (action) => {
    setDeleteAction(action);
    setDeleteConfirmText('');
    setDeleteTournamentId('');
    setDeleteTournamentsCheck(false);
    setStatusMessage({ text: '', type: '' });
    setDeleteModalOpen(true);
  };

  const handleExecuteDelete = async (e) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      alert('Please type DELETE in capital letters to confirm.');
      return;
    }

    setDeleting(true);
    setStatusMessage({ text: '', type: '' });
    try {
      const res = await adminService.resetData(
        deleteAction,
        deleteTournamentId || null,
        deleteTournamentsCheck
      );
      if (res.success) {
        setStatusMessage({ text: res.message, type: 'success' });
        setDeleteConfirmText('');
        await loadDashboardData();
        setTimeout(() => {
          setDeleteModalOpen(false);
        }, 1800);
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to delete data', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const totalPlayers = registrations.reduce((sum, r) => sum + (r.players?.length || 0), 0);
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');

  const stats = [
    {
      label: 'Total Tournaments',
      value: tournaments.length,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      link: '/admin/tournaments',
      hint: 'Manage Tournaments',
    },
    {
      label: 'Registered Teams',
      value: registrations.length,
      icon: Users,
      color: 'text-lime-400',
      bg: 'bg-lime-400/10',
      link: '/admin/registrations',
      hint: 'View Teams List',
    },
    {
      label: 'Registered Players',
      value: totalPlayers,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      link: '/admin/registrations',
      hint: 'View Player Squads',
    },
    {
      label: 'Live Matches',
      value: liveMatches.length,
      icon: Radio,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      link: liveMatches.length > 0 ? `/admin/scoring?match=${liveMatches[0]._id}` : '/admin/scoring',
      hint: liveMatches.length > 0 ? 'Score Live Now' : 'Scorer Console',
    },
    {
      label: 'Upcoming Matches',
      value: upcomingMatches.length,
      icon: Calendar,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      link: '/admin/fixtures',
      hint: 'View Schedule',
    },
    {
      label: 'Completed Matches',
      value: completedMatches.length,
      icon: CheckCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      link: '/admin/scores',
      hint: 'View Match Scores',
    },
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
            Real-time management for Box Cricket Tournaments, Fixtures & Scoring (Click any card to open)
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
            to="/admin/scores"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
          >
            <Trophy className="w-4 h-4 text-lime-400" /> Match Scores
          </Link>
          <Link
            to="/admin/scoring"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
          >
            <Radio className="w-4 h-4 text-red-400" /> Live Scorer
          </Link>
        </div>
      </div>

      {/* Statistics Cards Grid - Clickable Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Link
              key={idx}
              to={s.link}
              className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-lime-500/50 hover:bg-slate-900/90 active:scale-[0.98] transition-all group flex flex-col justify-between block relative overflow-hidden shadow-sm hover:shadow-lg hover:shadow-lime-500/5 cursor-pointer"
              title={`Click to open ${s.label}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">
                    {s.label}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-mono text-2xl font-black text-white group-hover:text-lime-400 transition-colors">
                  {loading ? '-' : s.value}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-bold text-slate-500 group-hover:text-lime-400 transition-colors">
                <span>{s.hint}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
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
                <Link
                  key={r._id}
                  to={`/admin/registrations`}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-lime-500/40 flex items-center justify-between text-xs transition-all group block cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-lime-400 transition-colors flex items-center gap-1.5">
                      <span>{r.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-lime-400" />
                    </div>
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
                </Link>
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
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-red-500 text-white shadow-sm flex items-center gap-1 hover:bg-red-600 transition-colors"
                        >
                          <Radio className="w-3 h-3" /> Score Now
                        </Link>
                      ) : m.status === 'COMPLETED' ? (
                        <Link
                          to={`/matches/${m._id}`}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 transition-colors"
                        >
                          Finished (Scorecard)
                        </Link>
                      ) : (
                        <Link
                          to={`/admin/scoring?match=${m._id}`}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
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

      {/* DATA MANAGEMENT & RESET (DANGER ZONE) */}
      <div className="glass-panel rounded-3xl p-6 border border-red-500/30 bg-red-950/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Data Management & Reset Console</h2>
              <p className="text-xs text-slate-400">
                Purge test data, reset scores, or clear registered teams before starting a new tournament
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            Admin Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Action 1: Delete Matches & Scores */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider mb-1">
                <Trash2 className="w-4 h-4 text-amber-400" /> Clear Match Scores
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deletes all fixtures and ball-by-ball deliveries. Keeps registered teams safe so you can restart scoring.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal('DELETE_MATCHES')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Matches ({matches.length})
            </button>
          </div>

          {/* Action 2: Delete Teams & Registrations */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider mb-1">
                <Users className="w-4 h-4 text-rose-400" /> Clear Teams List
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deletes all registered teams, squad players, and match pairings. Ready for fresh registrations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal('DELETE_TEAMS')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Teams ({registrations.length})
            </button>
          </div>

          {/* Action 3: Wipe All Test Data */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-500/30 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-red-400 uppercase tracking-wider mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Factory Reset
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Wipes all matches, scores, teams, and player data in one click. Admin login is preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal('WIPE_ALL')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40 transition-colors flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Wipe All Test Data
            </button>
          </div>
        </div>
      </div>

      {/* DATA DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 border border-red-500/40 shadow-2xl relative my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base font-black text-white">
                  {deleteAction === 'DELETE_MATCHES'
                    ? 'Confirm Delete All Matches'
                    : deleteAction === 'DELETE_TEAMS'
                    ? 'Confirm Delete All Teams'
                    : 'Confirm Complete Factory Reset'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusMessage.text && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-lime-500/15 border border-lime-500/40 text-lime-400'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-lime-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteDelete} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {deleteAction === 'DELETE_MATCHES' &&
                  'This will permanently delete all match fixtures, ball-by-ball deliveries, and winner records. This action cannot be undone.'}
                {deleteAction === 'DELETE_TEAMS' &&
                  'This will permanently delete all registered teams, squads, and any match fixtures referencing them. This action cannot be undone.'}
                {deleteAction === 'WIPE_ALL' &&
                  'This will permanently wipe ALL test data including matches, scorecards, teams, and players across the entire platform.'}
              </p>

              {tournaments.length > 1 && deleteAction !== 'WIPE_ALL' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Select Target Tournament
                  </label>
                  <select
                    value={deleteTournamentId}
                    onChange={(e) => setDeleteTournamentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="">All Tournaments</option>
                    {tournaments.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deleteAction === 'WIPE_ALL' && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteTournamentsCheck}
                    onChange={(e) => setDeleteTournamentsCheck(e.target.checked)}
                    className="rounded text-red-500 focus:ring-0"
                  />
                  <span>Also delete tournament configurations</span>
                </label>
              )}

              <div>
                <label className="text-xs font-bold text-red-400 block mb-1">
                  Type <span className="font-mono text-white bg-slate-900 px-1 py-0.5 rounded">DELETE</span> to confirm *
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-slate-900 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-red-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel / Keep Data
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-md disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Deleting Data...' : 'Confirm Delete 🗑️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

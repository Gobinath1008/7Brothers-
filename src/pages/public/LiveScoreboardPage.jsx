import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchService, tournamentService } from '../../services/api';
import { Radio, Trophy, Calendar, MapPin, ChevronRight, Activity } from 'lucide-react';

export default function LiveScoreboardPage() {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await matchService.getAll(selectedTournament || null);
      if (res.success) setMatches(res.matches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await tournamentService.getAll();
        if (res.success && res.tournaments?.length > 0) {
          setTournaments(res.tournaments);
        }
      } catch (e) {}
    }
    loadTournaments();
  }, []);

  useEffect(() => {
    fetchMatches();
    // Auto-poll live matches every 8 seconds
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  const filteredMatches = matches.filter((m) => {
    if (statusFilter === 'LIVE') return m.status === 'LIVE';
    if (statusFilter === 'COMPLETED') return m.status === 'COMPLETED';
    if (statusFilter === 'UPCOMING') return m.status === 'UPCOMING';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-lime-400 mb-2">
            <Radio className="w-3.5 h-3.5 text-red-500 live-dot" /> Auto-Refreshing Live Scoreboard
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            MATCHES & <span className="text-lime-400">SCORECARDS</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {tournaments.length > 1 && (
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-lime-500"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'LIVE', 'COMPLETED', 'UPCOMING'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s
                    ? 'bg-lime-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl h-48 animate-pulse"></div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Matches Found</h3>
          <p className="text-sm text-slate-400">
            No matches matching the selected filter currently exist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map((m) => {
            const isLive = m.status === 'LIVE';
            const isCompleted = m.status === 'COMPLETED';

            return (
              <Link
                key={m._id}
                to={`/matches/${m._id}`}
                className={`glass-panel p-6 rounded-2xl border transition-all block group relative overflow-hidden ${
                  isLive
                    ? 'border-red-500/80 bg-red-950/20 shadow-lg shadow-red-950/30'
                    : 'border-slate-800 hover:border-lime-500/40'
                }`}
              >
                {/* Match stage header */}
                <div className="flex items-center justify-between text-xs mb-4 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">M#{m.matchNumber}</span>
                    <span className="text-slate-400 font-medium">| {m.roundName}</span>
                  </div>

                  {isLive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black uppercase text-[10px] tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot"></span> LIVE NOW
                    </span>
                  ) : isCompleted ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-lime-500/10 text-lime-400 font-bold uppercase text-[10px]">
                      Completed
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[10px]">
                      Upcoming
                    </span>
                  )}
                </div>

                {/* Teams & Scores */}
                <div className="space-y-3 py-1">
                  {/* Team A */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-bold truncate ${
                          m.winner?._id === m.teamA?._id ? 'text-lime-400' : 'text-white'
                        }`}
                      >
                        {m.teamA?.name || m.teamAName || 'TBD'}
                      </span>
                      {m.winner?._id === m.teamA?._id && (
                        <Trophy className="w-4 h-4 text-lime-400 fill-lime-400" />
                      )}
                    </div>

                    <div className="font-mono text-base font-black text-right">
                      {m.innings1?.battingTeam === m.teamA?._id ? (
                        <span>
                          {m.innings1.runs}/{m.innings1.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings1.overs}.{m.innings1.balls} ov)
                          </span>
                        </span>
                      ) : m.innings2?.battingTeam === m.teamA?._id ? (
                        <span>
                          {m.innings2.runs}/{m.innings2.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings2.overs}.{m.innings2.balls} ov)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-bold truncate ${
                          m.winner?._id === m.teamB?._id ? 'text-lime-400' : 'text-white'
                        }`}
                      >
                        {m.teamB?.name || m.teamBName || 'TBD'}
                      </span>
                      {m.winner?._id === m.teamB?._id && (
                        <Trophy className="w-4 h-4 text-lime-400 fill-lime-400" />
                      )}
                    </div>

                    <div className="font-mono text-base font-black text-right">
                      {m.innings1?.battingTeam === m.teamB?._id ? (
                        <span>
                          {m.innings1.runs}/{m.innings1.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings1.overs}.{m.innings1.balls} ov)
                          </span>
                        </span>
                      ) : m.innings2?.battingTeam === m.teamB?._id ? (
                        <span>
                          {m.innings2.runs}/{m.innings2.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings2.overs}.{m.innings2.balls} ov)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Result / Target Note */}
                {m.winMargin && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-900 text-xs font-semibold text-lime-400">
                    {m.winMargin}
                  </div>
                )}
                {!m.winMargin && isLive && m.currentInnings === 2 && m.innings2?.target > 0 && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-900 text-xs font-semibold text-amber-300">
                    Target: {m.innings2.target} runs | Need {Math.max(0, m.innings2.target - (m.innings2.runs || 0))} runs to win
                  </div>
                )}

                {/* Footer details */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {m.venue || m.tournament?.venue || 'Pitch'}
                  </span>
                  <span className="text-lime-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Full Scorecard <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

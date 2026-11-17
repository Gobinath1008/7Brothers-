import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { matchService, tournamentService } from '../../services/api';
import {
  Radio,
  Trophy,
  Calendar,
  MapPin,
  ChevronRight,
  Activity,
  Flame,
  Filter,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function LiveScoreboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTournament = searchParams.get('tournament') || '';

  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(initialTournament);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Sync selected tournament with URL params
  const handleSelectTournament = (tId) => {
    setSelectedTournament(tId);
    if (tId) {
      setSearchParams({ tournament: tId });
    } else {
      setSearchParams({});
    }
  };

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
          // If no tournament was in URL, keep ALL or default to first if single
          if (!initialTournament && res.tournaments.length === 1) {
            setSelectedTournament(res.tournaments[0]._id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadTournaments();
  }, []);

  useEffect(() => {
    fetchMatches();
    // Auto-poll live matches every 8 seconds
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  const activeTournamentObj = tournaments.find((t) => t._id === selectedTournament);

  const filteredMatches = matches.filter((m) => {
    if (statusFilter === 'LIVE') return m.status === 'LIVE';
    if (statusFilter === 'COMPLETED') return m.status === 'COMPLETED';
    if (statusFilter === 'UPCOMING') return m.status === 'UPCOMING';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-lime-400 mb-2">
            <Radio className="w-3.5 h-3.5 text-red-500 live-dot" /> Auto-Refreshing Live Scoreboard
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            MATCHES & <span className="text-lime-400">SCORECARDS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ball-by-ball updates and knockout match standings
          </p>
        </div>

        {/* Quick Dropdown on Mobile / Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {tournaments.length > 0 && (
            <select
              value={selectedTournament}
              onChange={(e) => handleSelectTournament(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500 max-w-[200px]"
            >
              <option value="">All Tournaments ({tournaments.length})</option>
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

      {/* DEDICATED TOURNAMENT SELECTOR CARDS / PILLS */}
      {tournaments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-lime-400 font-black">
              <Trophy className="w-3.5 h-3.5" /> Select Tournament
            </span>
            {selectedTournament && (
              <button
                onClick={() => handleSelectTournament('')}
                className="text-[11px] text-slate-400 hover:text-white hover:underline font-semibold"
              >
                Clear Selection (View All)
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {/* All Tournaments Pill */}
            <button
              type="button"
              onClick={() => handleSelectTournament('')}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                !selectedTournament
                  ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20 font-black'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All Tournaments</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                !selectedTournament ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {tournaments.length}
              </span>
            </button>

            {/* Individual Tournaments */}
            {tournaments.map((t) => {
              const isSelected = selectedTournament === t._id;
              return (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => handleSelectTournament(t._id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20 font-black'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${t.status === 'LIVE' ? 'bg-red-500 live-dot' : 'bg-lime-400'}`} />
                  <span className="truncate max-w-[200px]">{t.name}</span>
                  {t.venue && (
                    <span className={`text-[10px] hidden sm:inline ${
                      isSelected ? 'text-slate-900/70 font-semibold' : 'text-slate-500'
                    }`}>
                      • {t.venue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SELECTED TOURNAMENT BANNER */}
      {activeTournamentObj && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-lime-500/30 bg-lime-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 flex-shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{activeTournamentObj.name}</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/30">
                  {activeTournamentObj.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {activeTournamentObj.venue}
                </span>
                {activeTournamentObj.tournamentDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />{' '}
                    {new Date(activeTournamentObj.tournamentDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span>• {activeTournamentObj.oversPerMatch || 5} Overs Match</span>
              </div>
            </div>
          </div>

          <Link
            to={`/tournaments/${activeTournamentObj.slug || activeTournamentObj._id}`}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-lime-400 border border-lime-500/30 flex items-center gap-1 transition-colors"
          >
            Tournament Info & Standings <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* MATCH CARDS GRID */}
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
            {selectedTournament
              ? 'No matches have been played or scheduled for this tournament yet.'
              : 'No matches matching the selected filter currently exist.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map((m) => {
            const isLive = m.status === 'LIVE';
            const isCompleted = m.status === 'COMPLETED';

            const teamAIdStr = String(m.teamA?._id || m.teamA || '');
            const teamBIdStr = String(m.teamB?._id || m.teamB || '');
            const inn1BatStr = String(m.innings1?.battingTeam?._id || m.innings1?.battingTeam || '');
            const inn2BatStr = String(m.innings2?.battingTeam?._id || m.innings2?.battingTeam || '');

            const isTeamABatting1 = (inn1BatStr && inn1BatStr === teamAIdStr) || inn1BatStr === 'teamA';
            const isTeamABatting2 = (inn2BatStr && inn2BatStr === teamAIdStr) || inn2BatStr === 'teamA';
            const isTeamBBatting1 = (inn1BatStr && inn1BatStr === teamBIdStr) || inn1BatStr === 'teamB';
            const isTeamBBatting2 = (inn2BatStr && inn2BatStr === teamBIdStr) || inn2BatStr === 'teamB';

            const winnerIdStr = String(m.winner?._id || m.winner || '');
            const isWinnerA = winnerIdStr && (winnerIdStr === teamAIdStr || winnerIdStr === m.teamAName);
            const isWinnerB = winnerIdStr && (winnerIdStr === teamBIdStr || winnerIdStr === m.teamBName);

            const displayTeamA = m.teamA?.name || m.teamAName || 'Team A';
            const displayTeamB = m.teamB?.name || m.teamBName || 'Team B';

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
                    <span className="text-slate-400 font-medium">| {m.roundName || 'Match'}</span>
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
                          isWinnerA ? 'text-lime-400' : 'text-white'
                        }`}
                      >
                        {displayTeamA}
                      </span>
                      {isWinnerA && (
                        <Trophy className="w-4 h-4 text-lime-400 fill-lime-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="font-mono text-base font-black text-right">
                      {isTeamABatting1 && m.innings1 ? (
                        <span>
                          {m.innings1.runs}/{m.innings1.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings1.overs}.{m.innings1.balls} ov)
                          </span>
                        </span>
                      ) : isTeamABatting2 && m.innings2 ? (
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
                          isWinnerB ? 'text-lime-400' : 'text-white'
                        }`}
                      >
                        {displayTeamB}
                      </span>
                      {isWinnerB && (
                        <Trophy className="w-4 h-4 text-lime-400 fill-lime-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="font-mono text-base font-black text-right">
                      {isTeamBBatting1 && m.innings1 ? (
                        <span>
                          {m.innings1.runs}/{m.innings1.wickets}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({m.innings1.overs}.{m.innings1.balls} ov)
                          </span>
                        </span>
                      ) : isTeamBBatting2 && m.innings2 ? (
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
                    🏆 {m.winMargin}
                  </div>
                )}
                {!m.winMargin && isLive && m.currentInnings === 2 && m.innings2?.target > 0 && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-900 text-xs font-semibold text-amber-300">
                    Target: {m.innings2.target} runs | Need {Math.max(0, m.innings2.target - (m.innings2.runs || 0))} runs to win
                  </div>
                )}

                {/* Footer details */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[65%]">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> {m.venue || m.tournament?.venue || 'Pitch'}
                  </span>
                  <span className="text-lime-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform flex-shrink-0">
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

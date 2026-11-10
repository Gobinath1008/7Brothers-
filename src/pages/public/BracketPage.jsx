import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tournamentService, matchService } from '../../services/api';
import KnockoutBracketView from '../../components/KnockoutBracketView';
import { Trophy, GitBranch, Calendar, MapPin, Printer, ExternalLink } from 'lucide-react';

export default function BracketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tournamentParam = searchParams.get('tournament');

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournamentParam || '');
  const [currentTournament, setCurrentTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tournaments
  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await tournamentService.getAll();
        if (res.success && res.tournaments?.length > 0) {
          setTournaments(res.tournaments);
          if (!tournamentParam) {
            setSelectedTournamentId(res.tournaments[0]._id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTournaments();
  }, [tournamentParam]);

  // Load matches whenever tournament changes
  useEffect(() => {
    if (!selectedTournamentId) return;

    async function loadMatches() {
      setLoading(true);
      try {
        const [tRes, mRes] = await Promise.all([
          tournamentService.getById(selectedTournamentId),
          matchService.getAll(selectedTournamentId),
        ]);

        if (tRes.success) setCurrentTournament(tRes.tournament);
        if (mRes.success) setMatches(mRes.matches || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, [selectedTournamentId]);

  const handleTournamentChange = (tId) => {
    setSelectedTournamentId(tId);
    setSearchParams({ tournament: tId });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-lime-400 mb-2">
            <GitBranch className="w-3.5 h-3.5" /> Official Knockout Tree
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            TOURNAMENT <span className="text-lime-400">BRACKET</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Follow the road to the championship. Winners advance, losers are eliminated.
          </p>
        </div>

        {/* Tournament Selector & Print Button */}
        <div className="flex items-center gap-3">
          {tournaments.length > 0 && (
            <select
              value={selectedTournamentId}
              onChange={(e) => handleTournamentChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
            >
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Bracket</span>
          </button>
        </div>
      </div>

      {/* Tournament Info Banner */}
      {currentTournament && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center font-black">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">{currentTournament.name}</div>
              <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(currentTournament.tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                <span>•</span>
                {currentTournament.locationUrl ? (
                  <a
                    href={currentTournament.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                    title="Click to open Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-lime-400" />
                    <span>{currentTournament.venue}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{currentTournament.venue}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              Format: Single Knockout
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-lime-500/15 text-lime-400 border border-lime-500/30">
              {currentTournament.oversPerMatch} Overs / Match
            </span>
          </div>
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="md:hidden flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-bold text-lime-400 text-center">
        <span>👈 Swipe horizontally to view full knockout tournament tree 👉</span>
      </div>

      {/* Bracket Tree Container */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generating Knockout Bracket...</p>
        </div>
      ) : (
        <KnockoutBracketView matches={matches} tournament={currentTournament} />
      )}
    </div>
  );
}

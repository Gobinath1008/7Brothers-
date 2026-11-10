import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchService, tournamentService } from '../../services/api';
import {
  Trophy,
  Radio,
  CheckCircle,
  Calendar,
  MapPin,
  Activity,
  Eye,
  Sliders,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Sparkles,
  Shield,
  X,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export default function AdminMatchScoresPage() {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Scorecard inspection modal
  const [scorecardModalMatch, setScorecardModalMatch] = useState(null);
  const [modalDetails, setModalDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Load matches & tournaments
  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, tRes] = await Promise.all([
        matchService.getAll(),
        tournamentService.getAll(),
      ]);

      if (mRes.success && mRes.matches) {
        setMatches(mRes.matches);
      }
      if (tRes.success && tRes.tournaments) {
        setTournaments(tRes.tournaments);
      }
    } catch (err) {
      console.error('Error loading match scores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Full Scorecard Modal
  const openScorecardModal = async (m) => {
    setScorecardModalMatch(m);
    setModalLoading(true);
    try {
      const res = await matchService.getById(m._id);
      if (res.success) {
        setModalDetails(res);
      }
    } catch (err) {
      console.error('Error fetching scorecard details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    if (selectedTournament !== 'ALL') {
      const tId = m.tournament?._id || m.tournament;
      if (tId !== selectedTournament) return false;
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'LIVE' && m.status !== 'LIVE') return false;
      if (statusFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      if (statusFilter === 'UPCOMING' && m.status !== 'UPCOMING') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const teamA = (m.teamA?.name || m.teamAName || '').toLowerCase();
      const teamB = (m.teamB?.name || m.teamBName || '').toLowerCase();
      const rName = (m.roundName || '').toLowerCase();
      const mNum = String(m.matchNumber || '');
      if (!teamA.includes(q) && !teamB.includes(q) && !rName.includes(q) && !mNum.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');

  // Compute over deliveries for modal display
  const getDeliveriesByOver = (allDels = [], innNum = 1) => {
    const innDels = allDels.filter((d) => d.innings === innNum);
    const map = {};
    innDels.forEach((d) => {
      const ov = d.overNumber ?? 0;
      if (!map[ov]) {
        map[ov] = {
          overNumber: ov,
          runs: 0,
          wickets: 0,
          balls: [],
        };
      }
      map[ov].balls.push(d);
      map[ov].runs += d.totalRuns ?? ((d.runsBat || 0) + (d.extraRuns || 0));
      if (d.isWicket) map[ov].wickets += 1;
    });
    return Object.values(map).sort((a, b) => a.overNumber - b.overNumber);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              MATCH SCORES & <span className="text-lime-400">RESULTS</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
              {matches.length} Matches
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time scorecards, innings breakdown, and official results for all existing matches
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            title="Refresh match scores"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-lime-400" /> Refresh
          </button>
          <Link
            to="/admin/scoring"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
          >
            <Radio className="w-4 h-4 text-slate-950" /> Live Scorer
          </Link>
        </div>
      </div>

      {/* Quick Summary Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 border-lime-500/50 shadow-md ring-1 ring-lime-500/20'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Matches
          </span>
          <div className="font-mono text-2xl font-black text-white mt-0.5">
            {matches.length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('LIVE')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'LIVE'
              ? 'bg-red-500/10 border-red-500/60 shadow-md ring-1 ring-red-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot"></span> LIVE NOW
            </span>
          </div>
          <div className="font-mono text-2xl font-black text-red-400 mt-0.5">
            {liveMatches.length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-lime-500/10 border-lime-500/60 shadow-md ring-1 ring-lime-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Completed Matches
          </span>
          <div className="font-mono text-2xl font-black text-lime-400 mt-0.5">
            {completedMatches.length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('UPCOMING')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'UPCOMING'
              ? 'bg-sky-500/10 border-sky-500/60 shadow-md ring-1 ring-sky-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Upcoming Fixtures
          </span>
          <div className="font-mono text-2xl font-black text-sky-400 mt-0.5">
            {upcomingMatches.length}
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team name or match #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
            />
          </div>

          {tournaments.length > 0 && (
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'LIVE', 'COMPLETED', 'UPCOMING'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                statusFilter === st
                  ? 'bg-lime-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Matches Grid List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-400">Loading existing match scores...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Matches Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            No matches match the selected criteria or no fixtures have been generated yet.
          </p>
          <Link
            to="/admin/fixtures"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors"
          >
            Go to Fixtures & Bracket
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((m) => {
            const isLive = m.status === 'LIVE';
            const isComp = m.status === 'COMPLETED';
            const teamAName = m.teamA?.name || m.teamAName || 'TBD';
            const teamBName = m.teamB?.name || m.teamBName || 'TBD';

            const inn1 = m.innings1 || {};
            const inn2 = m.innings2 || {};
            const totalOvers = m.tournament?.oversPerMatch || 5;

            // Figure out which team batted in inn1 and inn2
            const teamABattedInn1 = inn1.battingTeam === m.teamA?._id;
            const teamBBattedInn1 = inn1.battingTeam === m.teamB?._id;

            const teamAScore = teamABattedInn1
              ? `${inn1.runs || 0}/${inn1.wickets || 0} (${inn1.overs || 0}.${inn1.balls || 0} ov)`
              : inn2.battingTeam === m.teamA?._id
              ? `${inn2.runs || 0}/${inn2.wickets || 0} (${inn2.overs || 0}.${inn2.balls || 0} ov)`
              : '-';

            const teamBScore = teamBBattedInn1
              ? `${inn1.runs || 0}/${inn1.wickets || 0} (${inn1.overs || 0}.${inn1.balls || 0} ov)`
              : inn2.battingTeam === m.teamB?._id
              ? `${inn2.runs || 0}/${inn2.wickets || 0} (${inn2.overs || 0}.${inn2.balls || 0} ov)`
              : '-';

            const isTeamAWinner = isComp && m.winner?._id === m.teamA?._id;
            const isTeamBWinner = isComp && m.winner?._id === m.teamB?._id;

            return (
              <div
                key={m._id}
                className={`glass-panel rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                  isLive
                    ? 'border-red-500/50 bg-red-950/10 shadow-lg shadow-red-500/5'
                    : isComp
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/80 bg-slate-900/40'
                }`}
              >
                <div>
                  {/* Card Header: Match #, Round, Tournament & Live Badge */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lime-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        M#{m.matchNumber}
                      </span>
                      <span className="font-bold text-white">{m.roundName}</span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline">
                        • {m.tournament?.name || 'Tournament'}
                      </span>
                    </div>

                    <div>
                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black uppercase text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot"></span> LIVE
                        </span>
                      ) : isComp ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-lime-500/15 text-lime-400 font-bold uppercase text-[10px]">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                          {m.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams & Scores Face-Off */}
                  <div className="space-y-2.5">
                    {/* Team A Row */}
                    <div
                      className={`p-3 rounded-2xl flex items-center justify-between transition-colors ${
                        isTeamAWinner
                          ? 'bg-lime-500/10 border border-lime-500/30'
                          : 'bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isTeamAWinner && (
                          <Trophy className="w-4 h-4 text-lime-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-bold truncate ${
                          isTeamAWinner ? 'text-lime-300 font-black' : 'text-white'
                        }`}>
                          {teamAName}
                        </span>
                      </div>
                      <div className="font-mono text-base font-black text-white text-right">
                        {teamAScore}
                      </div>
                    </div>

                    {/* Team B Row */}
                    <div
                      className={`p-3 rounded-2xl flex items-center justify-between transition-colors ${
                        isTeamBWinner
                          ? 'bg-lime-500/10 border border-lime-500/30'
                          : 'bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isTeamBWinner && (
                          <Trophy className="w-4 h-4 text-lime-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-bold truncate ${
                          isTeamBWinner ? 'text-lime-300 font-black' : 'text-white'
                        }`}>
                          {teamBName}
                        </span>
                      </div>
                      <div className="font-mono text-base font-black text-white text-right">
                        {teamBScore}
                      </div>
                    </div>
                  </div>

                  {/* Result Margin / Target Banner */}
                  {m.winMargin && (
                    <div className="mt-3 p-2.5 rounded-xl bg-lime-500/15 border border-lime-500/30 text-center text-xs font-black text-lime-400">
                      🏆 {m.winMargin}
                    </div>
                  )}

                  {isLive && m.currentInnings === 2 && inn2.target > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center text-xs font-bold text-amber-300">
                      🎯 Target: {inn2.target} | Need {Math.max(0, inn2.target - (inn2.runs || 0))} runs in{' '}
                      {Math.max(0, totalOvers * 6 - ((inn2.overs || 0) * 6 + (inn2.balls || 0)))} balls
                    </div>
                  )}

                  {/* Toss Info if available */}
                  {m.toss?.wonBy && (
                    <div className="mt-2.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Toss: <strong>{m.toss.wonBy === m.teamA?._id ? teamAName : teamBName}</strong> elected to {m.toss.choice} first
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openScorecardModal(m)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-lime-400" /> View Scorecard
                  </button>

                  <Link
                    to={`/admin/scoring?match=${m._id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/40 text-xs font-bold text-lime-400 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {isComp ? 'Edit Match Score' : isLive ? 'Score Live Now' : 'Open Scorer'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL MATCH SCORECARD INSPECTION MODAL */}
      {scorecardModalMatch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider">
                  MATCH SCORECARD & BREAKDOWN
                </span>
                <h3 className="text-lg font-black text-white">
                  Match #{scorecardModalMatch.matchNumber} ({scorecardModalMatch.roundName})
                </h3>
              </div>
              <button
                onClick={() => {
                  setScorecardModalMatch(null);
                  setModalDetails(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                Loading complete scorecard & deliveries...
              </div>
            ) : modalDetails ? (
              <div className="space-y-4">
                {/* Winner margin */}
                {modalDetails.match.winMargin && (
                  <div className="p-3 rounded-2xl bg-lime-500/15 border border-lime-500/40 text-center text-xs font-black text-lime-400">
                    🏆 {modalDetails.match.winMargin}
                  </div>
                )}

                {/* Innings 1 Summary */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-lime-400 uppercase tracking-wider">
                      1st Innings: {modalDetails.match.innings1?.battingTeam === modalDetails.match.teamA?._id ? modalDetails.match.teamA?.name : modalDetails.match.teamB?.name}
                    </span>
                    <span className="font-mono text-base font-black text-white">
                      {modalDetails.match.innings1?.runs || 0} / {modalDetails.match.innings1?.wickets || 0}
                      <span className="text-xs text-slate-400 ml-1 font-sans">
                        ({modalDetails.match.innings1?.overs || 0}.{modalDetails.match.innings1?.balls || 0} ov)
                      </span>
                    </span>
                  </div>

                  {/* Over by over chips */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                      Overs Breakdown:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {getDeliveriesByOver(modalDetails.allDeliveries || modalDetails.recentDeliveries, 1).map((ov) => (
                        <div key={ov.overNumber} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Over {ov.overNumber + 1}</span>
                            <span className="text-lime-400 font-mono font-black">{ov.runs} runs</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {ov.balls.map((b, i) => (
                              <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-300">
                                {b.ballSummary}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Innings 2 Summary */}
                {modalDetails.match.innings2 && (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-lime-400 uppercase tracking-wider">
                        2nd Innings: {modalDetails.match.innings2?.battingTeam === modalDetails.match.teamA?._id ? modalDetails.match.teamA?.name : modalDetails.match.teamB?.name}
                      </span>
                      <span className="font-mono text-base font-black text-white">
                        {modalDetails.match.innings2?.runs || 0} / {modalDetails.match.innings2?.wickets || 0}
                        <span className="text-xs text-slate-400 ml-1 font-sans">
                          ({modalDetails.match.innings2?.overs || 0}.{modalDetails.match.innings2?.balls || 0} ov)
                        </span>
                      </span>
                    </div>

                    {modalDetails.match.innings2?.target > 0 && (
                      <div className="text-[11px] text-slate-400">
                        Target: <strong className="text-amber-300">{modalDetails.match.innings2.target} runs</strong>
                      </div>
                    )}

                    {/* Over by over chips */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                        Overs Breakdown:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {getDeliveriesByOver(modalDetails.allDeliveries || modalDetails.recentDeliveries, 2).map((ov) => (
                          <div key={ov.overNumber} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-400">Over {ov.overNumber + 1}</span>
                              <span className="text-lime-400 font-mono font-black">{ov.runs} runs</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {ov.balls.map((b, i) => (
                                <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-300">
                                  {b.ballSummary}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom link to scorer console */}
                <div className="pt-2">
                  <Link
                    to={`/admin/scoring?match=${modalDetails.match._id}`}
                    className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    Open Scorer & Edit Controls <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

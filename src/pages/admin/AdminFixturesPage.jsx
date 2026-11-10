import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { tournamentService, matchService, registrationService } from '../../services/api';
import { downloadFixturesPdf } from '../../utils/exportPdf';
import { downloadFixturesCsv } from '../../utils/exportCsv';
import KnockoutBracketView from '../../components/KnockoutBracketView';
import {
  Calendar,
  Trophy,
  Download,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Play,
  Radio,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
  Shuffle,
  GitBranch,
  Edit,
  SlidersHorizontal,
  Users,
  Save,
} from 'lucide-react';

export default function AdminFixturesPage() {
  const [searchParams] = useSearchParams();
  const initialTournamentId = searchParams.get('tournament') || '';

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [confirmedTeams, setConfirmedTeams] = useState([]);
  const [viewTab, setViewTab] = useState('SCHEDULE'); // 'SCHEDULE' or 'BRACKET'

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Manual Matchmaker Modal State
  const [matchmakerOpen, setMatchmakerOpen] = useState(false);
  const [manualPairs, setManualPairs] = useState([]);

  // Individual Match Edit / Fix Teams Modal State
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchEditForm, setMatchEditForm] = useState({
    teamA: '',
    teamB: '',
    venue: '',
    scheduledAt: '',
    roundName: '',
    status: 'UPCOMING',
  });
  const [savingMatch, setSavingMatch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, mRes, rRes] = await Promise.all([
        tournamentService.getAll(),
        matchService.getAll(selectedTournamentId || null),
        selectedTournamentId ? registrationService.getAll(selectedTournamentId) : Promise.resolve({ registrations: [] }),
      ]);

      if (tRes.success) {
        setTournaments(tRes.tournaments || []);
        if (!selectedTournamentId && tRes.tournaments?.length > 0) {
          setSelectedTournamentId(tRes.tournaments[0]._id);
        }
      }
      if (mRes.success) {
        setMatches(mRes.matches || []);
      }
      if (rRes.success) {
        const teams = rRes.registrations || [];
        setConfirmedTeams(teams);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTournamentId]);

  useEffect(() => {
    if (tournaments.length > 0 && selectedTournamentId) {
      const t = tournaments.find((item) => item._id === selectedTournamentId);
      setCurrentTournament(t || null);
    }
  }, [selectedTournamentId, tournaments]);

  // 1. Automatic Fixture Generation (Random Bracket)
  const handleAutoGenerateFixtures = async () => {
    if (!selectedTournamentId) return;

    if (!currentTournament?.finalTeamsConfirmed) {
      setErrorMsg('Admin must confirm the final team list in the Registrations page before generating fixtures.');
      return;
    }

    if (!window.confirm('Auto-generate knockout fixtures? Teams will be randomly paired according to official knockout rules.')) {
      return;
    }

    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await matchService.generateFixtures(selectedTournamentId, true, 'AUTOMATIC');
      if (res.success) {
        setAlertMsg(res.message);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to auto-generate fixtures');
    } finally {
      setGenerating(false);
    }
  };

  // 2. Open Manual Matchmaker Setup Modal
  const handleOpenMatchmaker = () => {
    if (!currentTournament?.finalTeamsConfirmed) {
      setErrorMsg('Admin must confirm the final team list in the Registrations page before pairing matches.');
      return;
    }

    const count = confirmedTeams.length;
    if (count < 2) {
      setErrorMsg('At least 2 teams are required to setup match fixtures.');
      return;
    }

    // Number of matches in opening round: Math.floor(count / 2)
    const numMatches = Math.ceil(count / 2);
    const initial = [];
    for (let i = 0; i < numMatches; i++) {
      initial.push({
        matchNumber: i + 1,
        teamAId: confirmedTeams[i * 2]?._id || '',
        teamBId: confirmedTeams[i * 2 + 1]?._id || '',
      });
    }
    setManualPairs(initial);
    setMatchmakerOpen(true);
  };

  // Save Manual Matchmaker Pairings
  const handleSaveManualPairs = async () => {
    setGenerating(true);
    setErrorMsg('');

    try {
      const validPairs = manualPairs.map((p) => ({
        teamAId: p.teamAId || null,
        teamBId: p.teamBId || null,
      }));

      const res = await matchService.generateFixtures(selectedTournamentId, true, 'MANUAL', validPairs);
      if (res.success) {
        setAlertMsg(res.message);
        setMatchmakerOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error generating manual fixtures');
    } finally {
      setGenerating(false);
    }
  };

  // Quick auto-fill for remaining manual matchmaker slots
  const handleAutoFillRemainingPairs = () => {
    const used = new Set();
    manualPairs.forEach((p) => {
      if (p.teamAId) used.add(p.teamAId);
      if (p.teamBId) used.add(p.teamBId);
    });

    const unused = confirmedTeams.filter((t) => !used.has(t._id));
    const nextPairs = [...manualPairs];
    let uIdx = 0;

    nextPairs.forEach((p) => {
      if (!p.teamAId && uIdx < unused.length) {
        p.teamAId = unused[uIdx]._id;
        uIdx++;
      }
      if (!p.teamBId && uIdx < unused.length) {
        p.teamBId = unused[uIdx]._id;
        uIdx++;
      }
    });

    setManualPairs([...nextPairs]);
  };

  // 3. Open Individual Match "Fix Teams" Modal
  const handleOpenEditMatch = (m) => {
    setEditingMatch(m);
    setMatchEditForm({
      teamA: m.teamA?._id || m.teamA || '',
      teamB: m.teamB?._id || m.teamB || '',
      venue: m.venue || currentTournament?.venue || '',
      scheduledAt: m.scheduledAt ? new Date(m.scheduledAt).toISOString().slice(0, 16) : '',
      roundName: m.roundName || '',
      status: m.status || 'UPCOMING',
    });
  };

  const handleSaveMatchEdit = async (e) => {
    e.preventDefault();
    if (!editingMatch) return;

    if (matchEditForm.teamA && matchEditForm.teamB && matchEditForm.teamA === matchEditForm.teamB) {
      alert('Team A and Team B cannot be the same team.');
      return;
    }

    setSavingMatch(true);
    try {
      const payload = {
        teamA: matchEditForm.teamA || null,
        teamB: matchEditForm.teamB || null,
        venue: matchEditForm.venue.trim(),
        scheduledAt: matchEditForm.scheduledAt ? new Date(matchEditForm.scheduledAt) : null,
        roundName: matchEditForm.roundName.trim(),
        status: matchEditForm.status,
      };

      const res = await matchService.update(editingMatch._id, payload);
      if (res.success) {
        setAlertMsg(`Match #${editingMatch.matchNumber} teams & schedule updated successfully! 🔥`);
        setEditingMatch(null);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error updating match teams');
    } finally {
      setSavingMatch(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            KNOCKOUT <span className="text-lime-400">FIXTURES</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fix match teams manually or auto-generate brackets, schedule pitches, and export scorecards
          </p>
        </div>

        {/* Toolbar with Manual + Automatic Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Automatic Generation Button */}
          <button
            onClick={handleAutoGenerateFixtures}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Auto-pair teams randomly into a knockout bracket"
          >
            <Shuffle className="w-4 h-4" />
            <span>⚡ Auto Pair</span>
          </button>

          {/* Manual Fixture Matchmaker Button */}
          <button
            onClick={handleOpenMatchmaker}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Manually choose which team plays against which team"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>🛠️ Manual Matchmaker</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={() => downloadFixturesPdf(currentTournament, matches)}
            disabled={matches.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-lime-400" />
            <span>PDF</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadFixturesCsv(currentTournament, matches)}
            disabled={matches.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-xl bg-lime-500/15 border border-lime-500/40 text-lime-400 text-xs flex items-center justify-between font-bold">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg('')} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between font-semibold">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tournament Selector & Tab Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tournament:</label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
          >
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.oversPerMatch} ov, {t.registeredTeamsCount || 0} teams)
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewTab('SCHEDULE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'SCHEDULE'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Schedule Sheet
          </button>
          <button
            onClick={() => setViewTab('BRACKET')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'BRACKET'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Bracket
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewTab === 'BRACKET' ? (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800">
          <KnockoutBracketView matches={matches} tournament={currentTournament} />
        </div>
      ) : (
        /* Schedule Sheet Table */
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading match fixtures...</div>
          ) : matches.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Fixtures Generated Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Confirm your teams in the Registrations page, then choose <strong>⚡ Auto Pair</strong> or <strong>🛠️ Manual Matchmaker</strong> to setup fixtures.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleAutoGenerateFixtures}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-lime-500 text-slate-950 hover:bg-lime-400"
                >
                  ⚡ Auto-Generate
                </button>
                <button
                  onClick={handleOpenMatchmaker}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-purple-600 text-white hover:bg-purple-500"
                >
                  🛠️ Manual Matchmaker
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Mobile Match Cards View */}
              <div className="block md:hidden divide-y divide-slate-800/80">
                {matches.map((m) => {
                  const isLive = m.status === 'LIVE';
                  const isCompleted = m.status === 'COMPLETED';
                  return (
                    <div key={m._id} className="p-4 space-y-3 hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                            M#{m.matchNumber}
                          </span>
                          <span className="font-bold text-lime-400">{m.roundName}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isLive
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isCompleted
                              ? 'bg-lime-500/15 text-lime-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between font-bold text-sm">
                          <span className="text-white truncate pr-2">{m.teamA?.name || m.teamAName || 'TBD'}</span>
                          {m.winner && (m.winner._id === m.teamA?._id || m.winner === m.teamA?._id) && (
                            <span className="text-lime-400 text-xs">🏆 Winner</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                          VS
                        </div>
                        <div className="flex items-center justify-between font-bold text-sm">
                          <span className="text-white truncate pr-2">{m.teamB?.name || m.teamBName || 'TBD'}</span>
                          {m.winner && (m.winner._id === m.teamB?._id || m.winner === m.teamB?._id) && (
                            <span className="text-lime-400 text-xs">🏆 Winner</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span className="truncate max-w-[140px]">{m.venue || currentTournament?.venue}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditMatch(m)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1"
                            title="Manually fix/change teams"
                          >
                            <Edit className="w-3 h-3 text-lime-400" /> Fix
                          </button>
                          <Link
                            to={`/admin/scoring?match=${m._id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                              isLive
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'bg-lime-500 text-slate-950 hover:bg-lime-400'
                            }`}
                          >
                            <Radio className="w-3.5 h-3.5" />
                            {isLive ? 'Live' : 'Scorer'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Stage / Round</th>
                      <th className="py-3 px-4">Team A</th>
                      <th className="py-3 px-4">Team B</th>
                      <th className="py-3 px-4">Venue & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Winner</th>
                      <th className="py-3 px-4 text-right">Fix / Score Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {matches.map((m) => {
                      const isLive = m.status === 'LIVE';
                      return (
                        <tr key={m._id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            #{m.matchNumber}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-lime-400 text-xs">
                            {m.roundName}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white">
                            {m.teamA?.name || m.teamAName || 'TBD'}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white">
                            {m.teamB?.name || m.teamBName || 'TBD'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            <div>{m.venue || currentTournament?.venue}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isLive
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : m.status === 'COMPLETED'
                                  ? 'bg-lime-500/15 text-lime-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-lime-400">
                            {m.winner?.name || (m.status === 'COMPLETED' ? 'Winner' : '-')}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Fix Teams Button */}
                              <button
                                onClick={() => handleOpenEditMatch(m)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Manually change Team A or Team B"
                              >
                                <Edit className="w-3 h-3 text-lime-400" /> Fix Teams
                              </button>

                              <Link
                                to={`/admin/scoring?match=${m._id}`}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                                  isLive
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-lime-500 text-slate-950 hover:bg-lime-400'
                                }`}
                              >
                                <Radio className="w-3.5 h-3.5" />
                                {isLive ? 'Score Now' : 'Scorer'}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: MANUAL MATCHMAKER (Fix opening round teams manually) */}
      {matchmakerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-purple-400" /> Manual Knockout Matchmaker
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pair teams manually for each match slot. Knockout tree will follow your exact pairings.
                </p>
              </div>
              <button onClick={() => setMatchmakerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-300">
                Confirmed Teams ({confirmedTeams.length} available)
              </span>
              <button
                type="button"
                onClick={handleAutoFillRemainingPairs}
                className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1"
              >
                ⚡ Auto-fill Unpaired Teams
              </button>
            </div>

            {/* Pair Slots */}
            <div className="space-y-3 mb-6">
              {manualPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-3"
                >
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
                    Match #{pair.matchNumber}
                  </span>

                  {/* Team A Select */}
                  <div className="flex-1 w-full">
                    <label className="text-[10px] text-lime-400 uppercase font-extrabold block mb-1">Team A</label>
                    <select
                      value={pair.teamAId}
                      onChange={(e) => {
                        const next = [...manualPairs];
                        next[idx].teamAId = e.target.value;
                        setManualPairs(next);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                    >
                      <option value="">-- Choose Team A --</option>
                      {confirmedTeams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="font-black text-slate-500 text-xs uppercase px-1">VS</span>

                  {/* Team B Select */}
                  <div className="flex-1 w-full">
                    <label className="text-[10px] text-lime-400 uppercase font-extrabold block mb-1">Team B</label>
                    <select
                      value={pair.teamBId}
                      onChange={(e) => {
                        const next = [...manualPairs];
                        next[idx].teamBId = e.target.value;
                        setManualPairs(next);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                    >
                      <option value="">-- Choose Team B --</option>
                      {confirmedTeams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMatchmakerOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualPairs}
                disabled={generating}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {generating ? 'Building Bracket...' : 'Save & Build Knockout Tree'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SINGLE MATCH PAIRING / SCHEDULE */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-lime-400" /> Fix Match #{editingMatch.matchNumber} Teams
                </h3>
                <span className="text-xs text-lime-400 font-semibold">{editingMatch.roundName}</span>
              </div>
              <button onClick={() => setEditingMatch(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatchEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team A Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Team A *</label>
                  <select
                    value={matchEditForm.teamA}
                    onChange={(e) => setMatchEditForm({ ...matchEditForm, teamA: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                  >
                    <option value="">-- TBD (Undetermined) --</option>
                    {confirmedTeams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team B Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Team B *</label>
                  <select
                    value={matchEditForm.teamB}
                    onChange={(e) => setMatchEditForm({ ...matchEditForm, teamB: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                  >
                    <option value="">-- TBD (Undetermined) --</option>
                    {confirmedTeams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Round / Stage Name</label>
                <input
                  type="text"
                  value={matchEditForm.roundName}
                  onChange={(e) => setMatchEditForm({ ...matchEditForm, roundName: e.target.value })}
                  placeholder="e.g. Round 1, Semi-Final 1, Grand Final"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    value={matchEditForm.venue}
                    onChange={(e) => setMatchEditForm({ ...matchEditForm, venue: e.target.value })}
                    placeholder="e.g. Turf Ground A"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={matchEditForm.scheduledAt}
                    onChange={(e) => setMatchEditForm({ ...matchEditForm, scheduledAt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Match Status</label>
                <select
                  value={matchEditForm.status}
                  onChange={(e) => setMatchEditForm({ ...matchEditForm, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-lime-400 focus:outline-none"
                >
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="TIED">TIED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMatch}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {savingMatch ? 'Saving...' : 'Update Match Pairing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

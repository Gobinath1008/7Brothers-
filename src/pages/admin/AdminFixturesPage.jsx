import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { tournamentService, matchService } from '../../services/api';
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
} from 'lucide-react';

export default function AdminFixturesPage() {
  const [searchParams] = useSearchParams();
  const initialTournamentId = searchParams.get('tournament') || '';

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [viewTab, setViewTab] = useState('SCHEDULE'); // 'SCHEDULE' or 'BRACKET'

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        tournamentService.getAll(),
        matchService.getAll(selectedTournamentId || null),
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

  // Generate Fixtures handler
  const handleGenerateFixtures = async () => {
    if (!selectedTournamentId) return;

    if (!currentTournament?.finalTeamsConfirmed) {
      setErrorMsg('Admin must confirm the final team list in the Registrations page before generating fixtures.');
      return;
    }

    if (!window.confirm('Generate knockout bracket fixtures now? Teams will be randomly paired according to official knockout rules.')) {
      return;
    }

    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await matchService.generateFixtures(selectedTournamentId, true);
      if (res.success) {
        setAlertMsg(res.message);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate fixtures');
    } finally {
      setGenerating(false);
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
            Generate brackets, schedule pitches, assign scorers, and export notice board sheets
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Generate Fixtures Button */}
          <button
            onClick={handleGenerateFixtures}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            {generating ? 'Generating...' : matches.length > 0 ? 'Regenerate Fixtures' : 'Generate Fixtures'}
          </button>

          {/* Download PDF */}
          <button
            onClick={() => downloadFixturesPdf(currentTournament, matches)}
            disabled={matches.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-lime-400" />
            <span>Download PDF</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadFixturesCsv(currentTournament, matches)}
            disabled={matches.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-xl bg-lime-500/15 border border-lime-500/40 text-lime-400 text-xs flex items-center justify-between">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg('')} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
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
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-lime-500"
          >
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.registeredTeamsCount || 0} teams)
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
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Fixtures Generated</h3>
              <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                First verify registrations, click "Confirm Final Teams" in the Registrations page, then click "Generate Fixtures".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <th className="py-3 px-4 text-right">Scorer Action</th>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

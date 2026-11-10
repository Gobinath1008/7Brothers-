import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, registrationService, matchService } from '../../services/api';
import { downloadAllRegistrationsPdf, downloadFixturesPdf, downloadTeamRegistrationPdf } from '../../utils/exportPdf';
import { downloadRegistrationsCsv, downloadFixturesCsv } from '../../utils/exportCsv';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  Calendar,
  Trophy,
  Shield,
  CheckCircle,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [currentTournament, setCurrentTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await tournamentService.getAll();
        if (res.success && res.tournaments?.length > 0) {
          setTournaments(res.tournaments);
          setSelectedTournamentId(res.tournaments[0]._id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) return;

    async function loadData() {
      try {
        const [tRes, rRes, mRes] = await Promise.all([
          tournamentService.getById(selectedTournamentId),
          registrationService.getAll(selectedTournamentId),
          matchService.getAll(selectedTournamentId),
        ]);

        if (tRes.success) setCurrentTournament(tRes.tournament);
        if (rRes.success) setRegistrations(rRes.registrations || []);
        if (mRes.success) setMatches(mRes.matches || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [selectedTournamentId]);

  const totalPlayers = registrations.reduce((sum, r) => sum + (r.players?.length || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            REPORTS & <span className="text-lime-400">DATA EXPORTS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate print-ready A4 notices, private captain squad sheets, and CSV exports
          </p>
        </div>

        {/* Tournament selector */}
        {tournaments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Tournament:</span>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500"
            >
              {tournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to={`/admin/registrations${selectedTournamentId ? `?tournament=${selectedTournamentId}` : ''}`}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-lime-500/50 hover:bg-slate-900/80 transition-all cursor-pointer block group"
          title="Click to view registrations"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 group-hover:text-lime-400 block mb-1">Total Teams</span>
            <span className="text-[10px] text-slate-500 group-hover:text-lime-400">View →</span>
          </div>
          <div className="font-mono text-2xl font-black text-white">{registrations.length}</div>
        </Link>
        <Link
          to={`/admin/registrations${selectedTournamentId ? `?tournament=${selectedTournamentId}` : ''}`}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-lime-500/50 hover:bg-slate-900/80 transition-all cursor-pointer block group"
          title="Click to view squads"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 group-hover:text-lime-400 block mb-1">Total Players</span>
            <span className="text-[10px] text-slate-500 group-hover:text-lime-400">View →</span>
          </div>
          <div className="font-mono text-2xl font-black text-lime-400">{totalPlayers}</div>
        </Link>
        <Link
          to={`/admin/fixtures${selectedTournamentId ? `?tournament=${selectedTournamentId}` : ''}`}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-lime-500/50 hover:bg-slate-900/80 transition-all cursor-pointer block group"
          title="Click to view matches"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 group-hover:text-lime-400 block mb-1">Total Matches</span>
            <span className="text-[10px] text-slate-500 group-hover:text-lime-400">View →</span>
          </div>
          <div className="font-mono text-2xl font-black text-white">{matches.length}</div>
        </Link>
        <Link
          to={`/admin/fixtures${selectedTournamentId ? `?tournament=${selectedTournamentId}` : ''}`}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-lime-500/50 hover:bg-slate-900/80 transition-all cursor-pointer block group"
          title="Click to view finished matches"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 group-hover:text-lime-400 block mb-1">Finished Matches</span>
            <span className="text-[10px] text-slate-500 group-hover:text-lime-400">View →</span>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-400">
            {matches.filter((m) => m.status === 'COMPLETED').length}
          </div>
        </Link>
      </div>

      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Reports Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Team Registrations Report</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Confidential document containing Registration IDs, Team Names, Captain Contact Numbers, and verified player rosters. Suitable for organizing committee reference.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => downloadAllRegistrationsPdf(currentTournament, registrations)}
              disabled={registrations.length === 0}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF (A4)
            </button>
            <button
              onClick={() => downloadRegistrationsCsv(currentTournament, registrations)}
              disabled={registrations.length === 0}
              className="py-3 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> CSV
            </button>
          </div>
        </div>

        {/* Fixtures Report Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Knockout Fixtures & Notice Board</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Printable landscape sheet showing complete tournament knockout schedule, match numbers, pitches, timings, and winner progression for physical notice boards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => downloadFixturesPdf(currentTournament, matches)}
              disabled={matches.length === 0}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Fixtures (PDF)
            </button>
            <button
              onClick={() => downloadFixturesCsv(currentTournament, matches)}
              disabled={matches.length === 0}
              className="py-3 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

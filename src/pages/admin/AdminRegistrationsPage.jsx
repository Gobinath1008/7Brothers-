import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tournamentService, registrationService } from '../../services/api';
import { downloadAllRegistrationsPdf, downloadTeamRegistrationPdf } from '../../utils/exportPdf';
import { downloadRegistrationsCsv } from '../../utils/exportCsv';
import {
  Users,
  Search,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Eye,
  Trash2,
  X,
  Phone,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function AdminRegistrationsPage() {
  const [searchParams] = useSearchParams();
  const initialTournamentId = searchParams.get('tournament') || '';

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Team Details Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirmingTeams, setConfirmingTeams] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        tournamentService.getAll(),
        registrationService.getAll(selectedTournamentId || null, searchTerm || null),
      ]);

      if (tRes.success) {
        setTournaments(tRes.tournaments || []);
        if (!selectedTournamentId && tRes.tournaments?.length > 0) {
          setSelectedTournamentId(tRes.tournaments[0]._id);
        }
      }
      if (rRes.success) {
        setRegistrations(rRes.registrations || []);
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

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const currentTournament = tournaments.find((t) => t._id === selectedTournamentId);

  // Confirm Final Team List
  const handleConfirmTeamList = async () => {
    if (!selectedTournamentId) return;
    if (!window.confirm('Confirm this final team list for knockout fixture generation? Registration will be closed if not already.')) {
      return;
    }

    setConfirmingTeams(true);
    try {
      const res = await registrationService.confirmTeams(selectedTournamentId);
      if (res.success) {
        setAlertMsg(res.message);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error confirming team list');
    } finally {
      setConfirmingTeams(false);
    }
  };

  // Delete team registration
  const handleDeleteRegistration = async (id, name) => {
    if (!window.confirm(`Delete registration for "${name}"?`)) return;

    try {
      await registrationService.delete(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete registration');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            REGISTRATION <span className="text-lime-400">MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Private directory, squad contact verification, confirmation & printable PDF reports
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Confirm Final Team List */}
          <button
            onClick={handleConfirmTeamList}
            disabled={confirmingTeams || registrations.length < 2}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50"
            title="Admin must confirm team list before generating fixtures"
          >
            <CheckCircle className="w-4 h-4" />
            {currentTournament?.finalTeamsConfirmed ? 'Team List Confirmed ✓' : 'Confirm Final Teams'}
          </button>

          {/* Download All PDF */}
          <button
            onClick={() => downloadAllRegistrationsPdf(currentTournament, registrations)}
            disabled={registrations.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-lime-400" />
            <span>Download PDF</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadRegistrationsCsv(currentTournament, registrations)}
            disabled={registrations.length === 0}
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Tournament Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tournament:</label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-lime-500"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.registeredTeamsCount || 0} teams)
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 sm:max-w-xs">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Registrations Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading registration records...</div>
        ) : registrations.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Registrations Found</h3>
            <p className="text-xs text-slate-400">Share the public registration link to register teams.</p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {registrations.map((team) => (
                <div key={team._id} className="p-4 space-y-3 hover:bg-slate-900/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-lime-400 block">{team.registrationId}</span>
                      <h4 className="text-base font-black text-white">{team.name}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        team.status === 'CONFIRMED'
                          ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                          : team.status === 'CHAMPION'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : team.status === 'ELIMINATED'
                          ? 'bg-red-500/10 text-red-400 line-through'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {team.status}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Captain:</span>
                      <span className="font-bold text-white">{team.captainName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone 1 (Capt):</span>
                      <a
                        href={`tel:${team.captainPhone}`}
                        className="text-lime-400 font-mono font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" /> {team.captainPhone}
                      </a>
                    </div>
                    {team.secondaryPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone 2 (Alt):</span>
                        <a
                          href={`tel:${team.secondaryPhone}`}
                          className="text-slate-300 font-mono font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3 text-slate-500" /> {team.secondaryPhone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px]">
                      <span className="text-slate-400">Registered:</span>
                      <span className="text-slate-300">
                        {new Date(team.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      {team.players?.length || 0} Squad Players
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTeam(team)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-lime-400" /> Squad
                      </button>
                      <button
                        onClick={() => downloadTeamRegistrationPdf(currentTournament, team)}
                        className="p-2 rounded-xl bg-lime-500/10 text-lime-400 hover:bg-lime-500/20"
                        title="Download Pass"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRegistration(team._id, team.name)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Reg ID</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Captain Details</th>
                    <th className="py-3 px-4">Players</th>
                    <th className="py-3 px-4">Date Registered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registrations.map((team) => (
                    <tr key={team._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-lime-400">
                        {team.registrationId}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {team.name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-semibold text-white">{team.captainName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-lime-400" /> P1: {team.captainPhone}
                        </div>
                        {team.secondaryPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                            <span className="text-slate-500 text-[10px]">P2:</span> {team.secondaryPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-300 font-mono">
                        {team.players?.length || 0} Players
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(team.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            team.status === 'CONFIRMED'
                              ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                              : team.status === 'CHAMPION'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : team.status === 'ELIMINATED'
                              ? 'bg-red-500/10 text-red-400 line-through'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {team.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTeam(team)}
                            title="View Full Squad"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>
                          <button
                            onClick={() => downloadTeamRegistrationPdf(currentTournament, team)}
                            title="Download Team Pass PDF"
                            className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400 hover:bg-lime-500/20"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRegistration(team._id, team.name)}
                            title="Delete Registration"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Team Details Modal with Squad List */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">{selectedTeam.name}</h3>
                <div className="text-xs text-lime-400 font-mono mt-0.5">
                  Registration ID: {selectedTeam.registrationId}
                </div>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Captain details */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Captain Name</span>
                <span className="text-sm font-bold text-white">{selectedTeam.captainName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Mobile (1)</span>
                <a href={`tel:${selectedTeam.captainPhone}`} className="font-mono text-sm font-bold text-lime-400 hover:underline">
                  {selectedTeam.captainPhone}
                </a>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Secondary Mobile (2)</span>
                {selectedTeam.secondaryPhone ? (
                  <a href={`tel:${selectedTeam.secondaryPhone}`} className="font-mono text-sm font-semibold text-slate-300 hover:underline">
                    {selectedTeam.secondaryPhone}
                  </a>
                ) : (
                  <span className="font-mono text-sm text-slate-500">-</span>
                )}
              </div>
            </div>

            {/* Squad List */}
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-300 mb-3">
              Full Squad Members ({selectedTeam.players?.length || 0} Players)
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(selectedTeam.players || []).map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-lime-400 font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white">{p.name}</span>
                    {p.isCaptain && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-400 font-bold">
                        Captain
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400">{p.phone}</span>
                </div>
              ))}
            </div>

            {/* Modal actions */}
            <div className="pt-6 border-t border-slate-800 mt-6 flex items-center justify-between">
              <button
                onClick={() => downloadTeamRegistrationPdf(currentTournament, selectedTeam)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Pass PDF
              </button>
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

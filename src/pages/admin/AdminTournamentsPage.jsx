import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService } from '../../services/api';
import {
  Trophy,
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Clock,
  Trash2,
  Edit,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  X,
  Play,
  Navigation,
} from 'lucide-react';

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    tournamentDate: '',
    regDeadline: '',
    venue: '',
    locationUrl: '',
    playersPerTeam: 7,
    oversPerMatch: 5,
    maxTeams: 16,
    matchDuration: 45,
    description: '',
  });

  const loadTournaments = async () => {
    try {
      const res = await tournamentService.getAll();
      if (res.success) setTournaments(res.tournaments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Rule: Registration deadline must strictly be before tournament date
    if (new Date(form.regDeadline) >= new Date(form.tournamentDate)) {
      setErrorMsg('Registration deadline must be before the tournament date and time.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await tournamentService.create(form);
      if (res.success) {
        setSuccessMsg('Tournament created successfully! 🔥');
        setModalOpen(false);
        setForm({
          name: '',
          tournamentDate: '',
          regDeadline: '',
          venue: '',
          locationUrl: '',
          playersPerTeam: 7,
          oversPerMatch: 5,
          maxTeams: 16,
          matchDuration: 45,
          description: '',
        });
        loadTournaments();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error creating tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await tournamentService.update(id, { status: newStatus });
      loadTournaments();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete all registered teams, players, and fixtures!`)) {
      return;
    }

    try {
      await tournamentService.delete(id);
      loadTournaments();
    } catch (err) {
      alert(err.message || 'Failed to delete tournament');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            TOURNAMENT <span className="text-lime-400">MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, configure, open/close registrations, set Google Maps venue, and track tournaments
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Create Tournament
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-lime-500/15 border border-lime-500/40 text-lime-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tournaments List Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Tournaments Created Yet</h3>
            <p className="text-xs text-slate-400 mb-4">Click "Create Tournament" to launch your first Box Cricket league.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Tournament Name</th>
                  <th className="py-3 px-4">Date & Venue (Map)</th>
                  <th className="py-3 px-4">Registration Deadline</th>
                  <th className="py-3 px-4">Format / Rules</th>
                  <th className="py-3 px-4">Teams / Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tournaments.map((t) => {
                  const isPastDeadline = new Date(t.regDeadline) < new Date();
                  return (
                    <tr key={t._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">
                        <div className="text-sm">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {t._id.slice(-6)}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        <div>{new Date(t.tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                        {t.locationUrl ? (
                          <a
                            href={t.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lime-400 hover:underline flex items-center gap-1 mt-0.5 font-bold text-[11px] transition-colors"
                            title="Click to open in Google Maps"
                          >
                            <MapPin className="w-3 h-3 text-lime-400" />
                            <span>{t.venue}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        ) : (
                          <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" /> {t.venue}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className={isPastDeadline ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                          {new Date(t.regDeadline).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {isPastDeadline ? '(Deadline passed)' : '(Active)'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300 font-mono">
                        <div>{t.oversPerMatch} Overs | {t.playersPerTeam} Players</div>
                        <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Knockout</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-white mb-1">
                          {t.registeredTeamsCount || 0} / {t.maxTeams} Teams
                        </div>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-lime-400 focus:outline-none"
                        >
                          <option value="REGISTRATION_OPEN">REGISTRATION OPEN</option>
                          <option value="REGISTRATION_CLOSED">REGISTRATION CLOSED</option>
                          <option value="FIXTURES_GENERATED">FIXTURES GENERATED</option>
                          <option value="ONGOING">ONGOING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/registrations?tournament=${t._id}`}
                            title="Manage Registrations"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold"
                          >
                            Registrations
                          </Link>
                          <Link
                            to={`/admin/fixtures?tournament=${t._id}`}
                            title="Manage Fixtures"
                            className="px-2.5 py-1.5 rounded-lg bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 text-[11px] font-bold"
                          >
                            Fixtures
                          </Link>
                          <button
                            onClick={() => handleDelete(t._id, t.name)}
                            title="Delete Tournament"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-lime-400" /> Create New Tournament
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tournament Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7Brothers Box Cricket Super League 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tournament Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.tournamentDate}
                    onChange={(e) => setForm({ ...form, tournamentDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Registration Deadline (Must be before tournament) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.regDeadline}
                    onChange={(e) => setForm({ ...form, regDeadline: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Registration must close before the tournament starts.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Venue / Ground Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7Brothers Turf Arena, Main Pitch"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              {/* Google Maps Location URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Google Maps Location Link (Click to open map)</span>
                  <span className="text-[10px] text-lime-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                    value={form.locationUrl}
                    onChange={(e) => setForm({ ...form, locationUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Paste the Google Maps share link so players can click and navigate directly to the venue.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Players / Team *</label>
                  <input
                    type="number"
                    min={4}
                    max={15}
                    required
                    value={form.playersPerTeam}
                    onChange={(e) => setForm({ ...form, playersPerTeam: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Overs / Match *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={form.oversPerMatch}
                    onChange={(e) => setForm({ ...form, oversPerMatch: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Max Teams</label>
                  <input
                    type="number"
                    min={2}
                    max={64}
                    value={form.maxTeams}
                    onChange={(e) => setForm({ ...form, maxTeams: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description / Rules (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Special ground rules, shoes allowed, prize pool details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-lime-500"
                ></textarea>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

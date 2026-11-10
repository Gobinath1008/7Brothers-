import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { tournamentService, registrationService } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  Users,
  Shield,
  Phone,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export default function RegisterTeamPage() {
  const [searchParams] = useSearchParams();
  const preSelectedTournamentId = searchParams.get('tournament');

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(preSelectedTournamentId || '');
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [players, setPlayers] = useState([]);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Load available tournaments
  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await tournamentService.getAll();
        if (res.success && res.tournaments) {
          setTournaments(res.tournaments);
          if (preSelectedTournamentId) {
            setSelectedTournamentId(preSelectedTournamentId);
          } else if (res.tournaments.length > 0) {
            // Find first tournament with open registration
            const openT = res.tournaments.find((t) => t.status === 'REGISTRATION_OPEN') || res.tournaments[0];
            setSelectedTournamentId(openT._id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTournaments();
  }, [preSelectedTournamentId]);

  // Sync selected tournament object and initialize player slots
  useEffect(() => {
    if (!selectedTournamentId || tournaments.length === 0) return;

    const t = tournaments.find((item) => item._id === selectedTournamentId);
    setSelectedTournament(t || null);

    if (t) {
      const squadSize = t.playersPerTeam || 7;
      // Initialize squad list
      const initialPlayers = [];
      for (let i = 0; i < squadSize; i++) {
        initialPlayers.push({
          name: i === 0 ? captainName : '',
          phone: i === 0 ? captainPhone : '',
          isCaptain: i === 0,
        });
      }
      setPlayers(initialPlayers);
    }
  }, [selectedTournamentId, tournaments]);

  // Keep player 1 in sync with captain inputs
  const handleCaptainNameChange = (val) => {
    setCaptainName(val);
    setPlayers((prev) => {
      const next = [...prev];
      if (next[0]) next[0].name = val;
      return next;
    });
  };

  const handleCaptainPhoneChange = (val) => {
    setCaptainPhone(val);
    setPlayers((prev) => {
      const next = [...prev];
      if (next[0]) next[0].phone = val;
      return next;
    });
  };

  const handlePlayerChange = (index, field, value) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTournament) {
      setErrorMsg('Please select a tournament');
      return;
    }

    // Check deadline on client first
    if (new Date(selectedTournament.regDeadline) < new Date()) {
      setErrorMsg('Registration for this tournament has closed.');
      return;
    }

    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) {
      setErrorMsg('Please enter Team Name, Captain Name, and Captain Mobile Number.');
      return;
    }

    // Verify all players
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.trim() || !players[i].phone.trim()) {
        setErrorMsg(`Player #${i + 1} name and mobile number are required.`);
        return;
      }
      const cleaned = players[i].phone.replace(/\D/g, '');
      if (cleaned.length < 10) {
        setErrorMsg(`Player #${i + 1} (${players[i].name}) must have a valid 10-digit mobile number.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        tournamentId: selectedTournament._id,
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        players,
      };

      const res = await registrationService.registerTeam(payload);

      if (res.success) {
        setSuccessData(res);
        // Trigger celebratory confetti
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#84cc16', '#10b981', '#ffffff', '#eab308'],
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  // If already successfully submitted, show success card
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-2 border-lime-500/70 text-center glow-lime">
          <div className="w-16 h-16 rounded-2xl bg-lime-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-lime-500/30">
            <Sparkles className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h2 className="text-3xl font-black text-white mb-2">Team Registered Successfully! 🔥</h2>
          <p className="text-sm text-slate-300 mb-6">
            Your team is officially registered for <span className="text-lime-400 font-bold">{successData.team?.tournamentName}</span>.
          </p>

          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-left space-y-3 mb-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Registration ID</span>
              <span className="font-mono text-base font-black text-lime-400">{successData.registrationId}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Team Name</span>
              <span className="text-sm font-bold text-white">{successData.team?.name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Captain</span>
              <span className="text-sm font-semibold text-slate-200">{successData.team?.captainName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Squad Size</span>
              <span className="text-sm font-semibold text-slate-200">{successData.team?.playerCount} Players</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/bracket"
              className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors"
            >
              View Tournament Bracket
            </Link>
            <button
              onClick={() => {
                setSuccessData(null);
                setTeamName('');
                setCaptainName('');
                setCaptainPhone('');
              }}
              className="px-6 py-3.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              Register Another Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClosed = selectedTournament && (
    selectedTournament.status !== 'REGISTRATION_OPEN' ||
    new Date(selectedTournament.regDeadline) < new Date()
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Flame className="w-3.5 h-3.5" /> No Account or Password Needed
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          REGISTER YOUR <span className="text-lime-400">BOX CRICKET TEAM</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
          Enter your team and player details below. Verification is instant and spots are locked on submission.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl">
        {/* Tournament Selector */}
        <div className="mb-8">
          <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-300 mb-2">
            Select Tournament *
          </label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-lime-500"
          >
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.oversPerMatch} Overs, {t.playersPerTeam} Players) - {t.venue}
              </option>
            ))}
          </select>

          {/* Tournament Details Banner */}
          {selectedTournament && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-lime-400" />
                  <span>
                    Deadline:{' '}
                    <strong className="text-white">
                      {new Date(selectedTournament.regDeadline).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-lime-400" />
                  {selectedTournament.locationUrl ? (
                    <a
                      href={selectedTournament.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                      title="Click to open Google Maps"
                    >
                      <span>{selectedTournament.venue}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>{selectedTournament.venue}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isClosed
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                  }`}
                >
                  {isClosed ? 'Registration Closed' : 'Registration Open'}
                </span>
              </div>
            </div>
          )}
        </div>

        {isClosed ? (
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Registration Closed</h3>
            <p className="text-xs text-slate-400">
              The registration deadline for this tournament has passed or registration was closed by the organizers.
            </p>
            <div className="pt-2">
              <Link to="/tournaments" className="text-xs font-bold text-lime-400 hover:underline">
                Explore Other Tournaments →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Team Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-lime-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> 1. Team & Captain Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Strikers"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Captain Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Captain Full Name"
                    value={captainName}
                    onChange={(e) => handleCaptainNameChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Captain Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={captainPhone}
                    onChange={(e) => handleCaptainPhoneChange(e.target.value)}
                    maxLength={10}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>
            </div>

            {/* Players Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-lime-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 2. Squad Players ({players.length} Players Required)
                </h3>
                <span className="text-[11px] text-slate-400">All players must have valid phone numbers</span>
              </div>

              <div className="space-y-3">
                {players.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center gap-3"
                  >
                    <div className="flex items-center gap-2 sm:w-28 flex-shrink-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-lime-400 font-mono text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {idx === 0 ? 'Captain' : `Player ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="text"
                        required
                        placeholder="Player Name"
                        value={p.name}
                        onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                      />
                    </div>

                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="tel"
                        required
                        placeholder="10-digit Phone"
                        maxLength={10}
                        value={p.phone}
                        onChange={(e) => handlePlayerChange(idx, 'phone', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-all glow-lime disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    Verifying & Registering Team...
                  </>
                ) : (
                  <>
                    Confirm & Complete Registration <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-3">
                By registering, your captain confirms squad availability on the tournament date.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

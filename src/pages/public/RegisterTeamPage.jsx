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
  PhoneCall,
} from 'lucide-react';

export default function RegisterTeamPage() {
  const [searchParams] = useSearchParams();
  const preSelectedTournamentId = searchParams.get('tournament');

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(preSelectedTournamentId || '');
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Simplified Form states: Team Name, Captain Name, 2 Phone Numbers
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');

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

  // Sync selected tournament object
  useEffect(() => {
    if (!selectedTournamentId || tournaments.length === 0) return;
    const t = tournaments.find((item) => item._id === selectedTournamentId);
    setSelectedTournament(t || null);
  }, [selectedTournamentId, tournaments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTournament) {
      setErrorMsg('Please select a tournament');
      return;
    }

    if (new Date(selectedTournament.regDeadline) < new Date()) {
      setErrorMsg('Registration for this tournament has closed.');
      return;
    }

    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim() || !secondaryPhone.trim()) {
      setErrorMsg('Please fill in Team Name, Captain Name, Primary Mobile Number, and Secondary Mobile Number.');
      return;
    }

    const cleanPhone1 = captainPhone.replace(/\D/g, '');
    const cleanPhone2 = secondaryPhone.replace(/\D/g, '');

    if (cleanPhone1.length < 10) {
      setErrorMsg('Primary mobile number must be a valid 10-digit number.');
      return;
    }

    if (cleanPhone2.length < 10) {
      setErrorMsg('Secondary / Alternate mobile number must be a valid 10-digit number.');
      return;
    }

    if (cleanPhone1 === cleanPhone2) {
      setErrorMsg('Primary and secondary mobile numbers must be different.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tournamentId: selectedTournament._id,
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: cleanPhone1,
        secondaryPhone: cleanPhone2,
      };

      const res = await registrationService.registerTeam(payload);

      if (res.success) {
        setSuccessData(res);
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Primary Mobile</span>
              <span className="font-mono text-sm font-semibold text-lime-400">{successData.team?.captainPhone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Secondary Mobile</span>
              <span className="font-mono text-sm font-semibold text-slate-300">{successData.team?.secondaryPhone}</span>
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
                setSecondaryPhone('');
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-bold uppercase tracking-wider">
          <Flame className="w-4 h-4" /> Official Entry Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          REGISTER YOUR <span className="text-lime-400">TEAM</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Enter your team name, captain details, and contact numbers to secure your tournament slot.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        {/* Tournament Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Select Tournament *
          </label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-lime-500"
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Registration Form: Team Name, Captain Name, 2 Phone Numbers */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-lime-400" /> Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7Brothers Strikers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-lime-400" /> Team Captain Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Captain Full Name"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-lime-400" /> Phone Number 1 (Captain Mobile) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit primary mobile"
                    value={captainPhone}
                    onChange={(e) => setCaptainPhone(e.target.value)}
                    maxLength={10}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Primary contact for match updates</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> Phone Number 2 (Alternate Mobile) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit secondary mobile"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    maxLength={10}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Emergency / Alternate squad number</span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-all glow-lime disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    Registering Team...
                  </>
                ) : (
                  <>
                    Submit Team Registration <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-3">
                No squad player list needed upfront. Team details & contacts will be registered immediately.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

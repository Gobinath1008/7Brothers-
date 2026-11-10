import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, matchService } from '../../services/api';
import {
  Flame,
  Trophy,
  Users,
  Calendar,
  Radio,
  ChevronRight,
  Shield,
  Clock,
  MapPin,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tRes, mRes] = await Promise.all([
          tournamentService.getAll(),
          matchService.getAll(null, null, 'LIVE'),
        ]);
        if (tRes.success) setTournaments(tRes.tournaments || []);
        if (mRes.success) setLiveMatches(mRes.matches || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeTournaments = tournaments.filter(
    (t) => t.status === 'REGISTRATION_OPEN' || t.status === 'FIXTURES_GENERATED' || t.status === 'ONGOING'
  );

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.12),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Flame className="w-4 h-4" /> 7Brothers Official Box Cricket League
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
              KNOCKOUT <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-lime-500">CRICKET.</span>
              <br />WIN OR GO HOME.
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mb-8 leading-relaxed">
              Experience electrifying Box Cricket tournaments. Instant guest team registration, real-time live ball scoring, automated knockout brackets, and verified printable scorecards.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-all glow-lime shadow-lg"
              >
                <Users className="w-4 h-4" /> Register Your Team
              </Link>
              <Link
                to="/live"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                <Radio className="w-4 h-4 text-red-400" /> Watch Live Scores
              </Link>
              <Link
                to="/bracket"
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Trophy className="w-4 h-4 text-lime-400" /> Knockout Tree
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Match Alert Cards */}
      {liveMatches.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 live-dot"></span> LIVE MATCHES RIGHT NOW
            </h2>
            <Link to="/live" className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1">
              All Scores <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <Link
                key={m._id}
                to={`/matches/${m._id}`}
                className="glass-panel p-5 rounded-2xl border-2 border-red-500/50 hover:border-red-400 transition-all block relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                    {m.roundName || 'Knockout Match'}
                  </span>
                  <span className="text-slate-400">{m.tournament?.name}</span>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white group-hover:text-lime-400 transition-colors">
                      {m.teamAName}
                    </div>
                    {m.innings1?.battingTeam === m.teamA?._id && (
                      <div className="font-mono text-2xl font-black text-lime-400">
                        {m.innings1.runs}/{m.innings1.wickets} <span className="text-xs text-slate-400">({m.innings1.overs}.{m.innings1.balls} ov)</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2">VS</div>

                  <div className="flex-1 text-right">
                    <div className="text-lg font-bold text-white group-hover:text-lime-400 transition-colors">
                      {m.teamBName}
                    </div>
                    {m.innings2?.battingTeam === m.teamB?._id && (
                      <div className="font-mono text-2xl font-black text-lime-400">
                        {m.innings2.runs}/{m.innings2.wickets} <span className="text-xs text-slate-400">({m.innings2.overs}.{m.innings2.balls} ov)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {m.venue || 'Main Pitch'}
                  </span>
                  <span className="text-lime-400 font-bold flex items-center gap-1">
                    Live Scorecard <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Tournaments */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white">Active Tournaments</h2>
            <p className="text-sm text-slate-400">Register your team before deadline or view brackets</p>
          </div>
          <Link to="/tournaments" className="text-sm font-bold text-lime-400 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl h-60 animate-pulse"></div>
            ))}
          </div>
        ) : activeTournaments.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Active Tournaments</h3>
            <p className="text-sm text-slate-400">Check back soon for upcoming Box Cricket championships!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeTournaments.map((t) => {
              const isRegOpen = t.status === 'REGISTRATION_OPEN';
              const regDate = new Date(t.regDeadline);
              const isPastDeadline = regDate < new Date();

              return (
                <div
                  key={t._id}
                  className="glass-panel rounded-2xl p-6 flex flex-col justify-between border border-slate-800 glass-panel-hover"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isRegOpen && !isPastDeadline
                            ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isRegOpen && !isPastDeadline ? 'Registration Open' : 'Registration Closed'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{t.oversPerMatch} Overs</span>
                    </div>

                    <h3 className="text-xl font-black text-white mb-2">{t.name}</h3>

                    <div className="space-y-2 text-xs text-slate-300 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-lime-400" />
                        <span>Date: {new Date(t.tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-lime-400" />
                        {t.locationUrl ? (
                          <a
                            href={t.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                            title="Click to open Google Maps"
                          >
                            <span>Venue: {t.venue}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>Venue: {t.venue}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-lime-400" />
                        <span>{t.playersPerTeam} Players / Team | {t.registeredTeamsCount || 0} Registered</span>
                      </div>
                      {isRegOpen && (
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Clock className="w-4 h-4" />
                          <span>Closing: {regDate.toLocaleDateString('en-IN')} {regDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
                    {isRegOpen && !isPastDeadline ? (
                      <Link
                        to={`/register?tournament=${t._id}`}
                        className="flex-1 py-2.5 rounded-xl text-center text-xs font-black uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
                      >
                        Register Team
                      </Link>
                    ) : (
                      <Link
                        to={`/bracket?tournament=${t._id}`}
                        className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 transition-colors"
                      >
                        View Bracket
                      </Link>
                    )}
                    <Link
                      to={`/tournaments/${t._id}`}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Automated Knockout</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every match matters. Winners automatically advance to the next round bracket while losers are eliminated.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Live Ball-by-Ball</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time scoreboard for fans and players with live commentary, strike rates, run rate and boundaries.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Instant Registration</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero login required for guests. Fast validation prevents duplicate phone numbers and team names.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

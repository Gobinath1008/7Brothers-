import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService } from '../../services/api';
import { Trophy, Calendar, MapPin, Users, Clock, ChevronRight, Search, ExternalLink } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await tournamentService.getAll();
        if (res.success) setTournaments(res.tournaments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTournaments();
  }, []);

  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.venue.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'OPEN') return t.status === 'REGISTRATION_OPEN' && new Date(t.regDeadline) >= new Date();
    if (filter === 'LIVE') return t.status === 'ONGOING' || t.status === 'FIXTURES_GENERATED';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            BOX CRICKET <span className="text-lime-400">TOURNAMENTS</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse upcoming, live, and concluded knockout championships
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'OPEN', 'LIVE', 'COMPLETED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f
                    ? 'bg-lime-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl h-64 animate-pulse"></div>
          ))}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Tournaments Found</h3>
          <p className="text-sm text-slate-400">
            Try adjusting your search criteria or filter options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            const isRegOpen = t.status === 'REGISTRATION_OPEN' && new Date(t.regDeadline) >= new Date();
            const regDate = new Date(t.regDeadline);

            return (
              <div
                key={t._id}
                className="glass-panel rounded-2xl p-6 flex flex-col justify-between border border-slate-800 glass-panel-hover"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isRegOpen
                          ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                          : t.status === 'COMPLETED'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isRegOpen ? 'Registration Open' : t.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {t.oversPerMatch} OVERS
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-3">{t.name}</h3>

                  <div className="space-y-2 text-xs text-slate-300 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-lime-400" />
                      <span>{new Date(t.tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
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
                          <span>{t.venue}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span>{t.venue}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-lime-400" />
                      <span>{t.playersPerTeam} Players Squad | {t.registeredTeamsCount || 0} / {t.maxTeams} Teams</span>
                    </div>
                    {isRegOpen && (
                      <div className="flex items-center gap-2 text-amber-400 font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Deadline: {regDate.toLocaleDateString('en-IN')} {regDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                  {isRegOpen ? (
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
                    to={`/bracket?tournament=${t._id}`}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                  >
                    Fixtures
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

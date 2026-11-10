import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchService } from '../../services/api';
import {
  Trophy,
  Calendar,
  MapPin,
  ChevronLeft,
  Radio,
  Clock,
  Shield,
  Activity,
  ExternalLink,
} from 'lucide-react';

export default function MatchDetailsPage() {
  const { id } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [activeInningsTab, setActiveInningsTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatch = async () => {
    try {
      const res = await matchService.getById(id);
      if (res.success && res.match) {
        setMatchData(res);
        if (res.match.currentInnings === 2 && activeInningsTab === 1 && res.match.status === 'LIVE') {
          setActiveInningsTab(2);
        }
      } else {
        setError('Match not found');
      }
    } catch (err) {
      setError(err.message || 'Error loading match scorecard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 5000); // Poll every 5s for live score
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold text-slate-400">Loading Live Scorecard...</p>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-400 mb-4">{error || 'Scorecard unavailable'}</p>
        <Link to="/live" className="text-xs font-bold text-lime-400 hover:underline">
          ← Back to Live Scores
        </Link>
      </div>
    );
  }

  const { match, recentDeliveries = [], allDeliveries = [] } = matchData;
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  // Active innings data
  const inn = activeInningsTab === 1 ? match.innings1 : match.innings2;
  const battingTeamId = inn?.battingTeam;
  const bowlingTeamId = inn?.bowlingTeam;

  // Group deliveries for active innings by over
  const innDeliveries = (allDeliveries.length > 0 ? allDeliveries : recentDeliveries).filter(
    (d) => d.innings === activeInningsTab
  );

  const oversMap = {};
  innDeliveries.forEach((d) => {
    const ov = d.overNumber ?? 0;
    if (!oversMap[ov]) {
      oversMap[ov] = {
        overNumber: ov,
        balls: [],
        runs: 0,
        wickets: 0,
        extras: 0,
      };
    }
    oversMap[ov].balls.push(d);
    oversMap[ov].runs += d.totalRuns ?? ((d.runsBat || 0) + (d.extraRuns || 0));
    if (d.isWicket) oversMap[ov].wickets += 1;
    if (d.extraType && d.extraType !== 'NONE') oversMap[ov].extras += d.extraRuns || 1;
  });

  const oversList = Object.values(oversMap).sort((a, b) => a.overNumber - b.overNumber);

  const battingTeamName =
    battingTeamId === match.teamA?._id
      ? match.teamA?.name
      : battingTeamId === match.teamB?._id
      ? match.teamB?.name
      : 'Batting Team';

  const bowlingTeamName =
    bowlingTeamId === match.teamA?._id
      ? match.teamA?.name
      : bowlingTeamId === match.teamB?._id
      ? match.teamB?.name
      : 'Bowling Team';

  // Filter batting and bowling cards for active innings
  const activeBatters = (match.battingCard || []).filter(
    (b) => b.team && b.team.toString() === battingTeamId?.toString()
  );
  const activeBowlers = (match.bowlingCard || []).filter(
    (b) => b.team && b.team.toString() === bowlingTeamId?.toString()
  );

  // Calculate CRR
  const totalOversDec = (inn?.overs || 0) + (inn?.balls || 0) / 6;
  const crr = totalOversDec > 0 ? ((inn?.runs || 0) / totalOversDec).toFixed(2) : '0.00';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back Link */}
      <Link to="/live" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to All Matches
      </Link>

      {/* Main Match Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Tournament & Stage */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-6 pb-4 border-b border-slate-800">
          <div>
            <span className="font-extrabold text-white">{match.tournament?.name}</span>
            <span className="text-slate-400 ml-2 font-medium">| {match.roundName} (Match #{match.matchNumber})</span>
          </div>

          <div>
            {isLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-black uppercase text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 live-dot"></span> LIVE MATCH
              </span>
            ) : isCompleted ? (
              <span className="px-3 py-1 rounded-full bg-lime-500/20 text-lime-400 font-bold uppercase text-xs">
                Match Completed
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-medium text-xs">
                Upcoming
              </span>
            )}
          </div>
        </div>

        {/* Big Teams Face-off & Live Score Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Team A */}
          <div className={`p-4 rounded-2xl ${match.winner?._id === match.teamA?._id ? 'bg-lime-500/10 border border-lime-500/30' : 'bg-slate-900/60'}`}>
            <div className="text-xs uppercase font-extrabold text-slate-400 mb-1">TEAM A</div>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {match.teamA?.name || match.teamAName || 'TBD'}
              {match.winner?._id === match.teamA?._id && <Trophy className="w-5 h-5 text-lime-400" />}
            </div>
            <div className="font-mono text-3xl font-black text-lime-400 mt-2">
              {match.innings1?.battingTeam === match.teamA?._id
                ? `${match.innings1.runs}/${match.innings1.wickets}`
                : match.innings2?.battingTeam === match.teamA?._id
                ? `${match.innings2.runs}/${match.innings2.wickets}`
                : '-'}
              <span className="text-sm font-sans text-slate-400 ml-2 font-medium">
                {match.innings1?.battingTeam === match.teamA?._id
                  ? `(${match.innings1.overs}.${match.innings1.balls} / ${match.tournament?.oversPerMatch || 5} ov)`
                  : match.innings2?.battingTeam === match.teamA?._id
                  ? `(${match.innings2.overs}.${match.innings2.balls} / ${match.tournament?.oversPerMatch || 5} ov)`
                  : ''}
              </span>
            </div>
          </div>

          {/* Team B */}
          <div className={`p-4 rounded-2xl ${match.winner?._id === match.teamB?._id ? 'bg-lime-500/10 border border-lime-500/30' : 'bg-slate-900/60'}`}>
            <div className="text-xs uppercase font-extrabold text-slate-400 mb-1">TEAM B</div>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {match.teamB?.name || match.teamBName || 'TBD'}
              {match.winner?._id === match.teamB?._id && <Trophy className="w-5 h-5 text-lime-400" />}
            </div>
            <div className="font-mono text-3xl font-black text-lime-400 mt-2">
              {match.innings1?.battingTeam === match.teamB?._id
                ? `${match.innings1.runs}/${match.innings1.wickets}`
                : match.innings2?.battingTeam === match.teamB?._id
                ? `${match.innings2.runs}/${match.innings2.wickets}`
                : '-'}
              <span className="text-sm font-sans text-slate-400 ml-2 font-medium">
                {match.innings1?.battingTeam === match.teamB?._id
                  ? `(${match.innings1.overs}.${match.innings1.balls} / ${match.tournament?.oversPerMatch || 5} ov)`
                  : match.innings2?.battingTeam === match.teamB?._id
                  ? `(${match.innings2.overs}.${match.innings2.balls} / ${match.tournament?.oversPerMatch || 5} ov)`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Win Banner / Target Info */}
        {match.winMargin && (
          <div className="mt-6 p-3.5 rounded-xl bg-lime-500/15 border border-lime-500/40 text-center text-sm font-black text-lime-400">
            🏆 {match.winMargin}
          </div>
        )}
        {!match.winMargin && isLive && match.currentInnings === 2 && match.innings2?.target > 0 && (
          <div className="mt-6 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-center text-sm font-bold text-amber-300">
            🎯 Target: {match.innings2.target} runs | Need {Math.max(0, match.innings2.target - (match.innings2.runs || 0))} runs to win
          </div>
        )}

        {/* Toss & Venue Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            {match.tournament?.locationUrl ? (
              <a
                href={match.tournament.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                title="Click to open Google Maps"
              >
                <span>Venue: {match.venue || match.tournament?.venue}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span>Venue: {match.venue || match.tournament?.venue}</span>
            )}
          </div>
          {match.toss?.wonBy && (
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-lime-400" />
              <span>
                Toss won by {match.toss.wonBy.name} (chose to {match.toss.choice})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deliveries Strip */}
      {recentDeliveries.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="text-xs uppercase font-extrabold text-slate-400 mb-2.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-lime-400" /> Recent Deliveries (Latest First)
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {recentDeliveries.map((ball) => {
              const isW = ball.isWicket;
              const isBoundary = ball.runsBat === 4 || ball.runsBat === 6;
              const isExtra = ball.extraType !== 'NONE';

              return (
                <div
                  key={ball._id}
                  className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-mono font-bold text-xs ${
                    isW
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                      : ball.runsBat === 6
                      ? 'bg-purple-600 text-white font-black'
                      : ball.runsBat === 4
                      ? 'bg-lime-500 text-slate-950 font-black'
                      : isExtra
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                  title={`${ball.striker?.name} vs ${ball.bowler?.name} - ${ball.ballSummary}`}
                >
                  {ball.ballSummary}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overs Breakdown by Innings */}
      {oversList.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-lime-400" /> Over by Over Runs Breakdown
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Innings {activeInningsTab}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {oversList.map((ovData) => (
              <div
                key={ovData.overNumber}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Over {ovData.overNumber + 1}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {ovData.balls.map((b, i) => (
                      <span
                        key={i}
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          b.isWicket
                            ? 'bg-red-500 text-white font-black'
                            : b.runsBat === 4
                            ? 'bg-lime-500 text-slate-950 font-black'
                            : b.runsBat === 6
                            ? 'bg-purple-600 text-white font-black'
                            : b.extraType !== 'NONE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {b.ballSummary}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-base font-black text-lime-400 leading-none">
                    {ovData.runs} <span className="text-[9px] font-sans text-slate-400 font-bold">runs</span>
                  </div>
                  {ovData.wickets > 0 && (
                    <div className="text-[10px] text-red-400 font-bold mt-1">
                      {ovData.wickets} wkt{ovData.wickets !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Innings Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveInningsTab(1)}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeInningsTab === 1
              ? 'border-lime-500 text-lime-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          1st Innings Scorecard
        </button>
        <button
          onClick={() => setActiveInningsTab(2)}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeInningsTab === 2
              ? 'border-lime-500 text-lime-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          2nd Innings Scorecard
        </button>
      </div>

      {/* Scorecard Table View */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-8">
        {/* Innings Overview Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white">{battingTeamName} Batting</h3>
            <span className="text-xs text-slate-400">CRR: {crr} runs/over</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-black text-lime-400">
              {inn?.runs || 0}/{inn?.wickets || 0}
            </span>
            <div className="text-xs text-slate-400 font-mono">
              Overs: {inn?.overs || 0}.{inn?.balls || 0} / {match.tournament?.oversPerMatch || 5}
            </div>
          </div>
        </div>

        {/* Batting Card Table */}
        <div>
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3">Batter Statistics</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Batter</th>
                  <th className="py-2.5 px-3">Dismissal</th>
                  <th className="py-2.5 px-3 text-right">R</th>
                  <th className="py-2.5 px-3 text-right">B</th>
                  <th className="py-2.5 px-3 text-right">4s</th>
                  <th className="py-2.5 px-3 text-right">6s</th>
                  <th className="py-2.5 px-3 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeBatters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No batting records recorded for this innings yet.
                    </td>
                  </tr>
                ) : (
                  activeBatters.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                        {b.playerName}
                        {b.onStrike && <span className="text-lime-400 font-black">*</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-400 italic text-[11px]">{b.dismissal || 'not out'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{b.runs}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{b.balls}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{b.fours}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{b.sixes}</td>
                      <td className="py-3 px-3 text-right font-mono text-lime-400 font-bold">{b.strikeRate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Extras summary */}
          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Extras: <strong>{inn?.extras?.total || 0}</strong> (Wd: {inn?.extras?.wide || 0}, Nb: {inn?.extras?.noBall || 0}, B: {inn?.extras?.bye || 0}, Lb: {inn?.extras?.legBye || 0})
            </span>
            <span className="font-bold text-white">
              Total: {inn?.runs || 0}/{inn?.wickets || 0} ({inn?.overs || 0}.{inn?.balls || 0} Overs)
            </span>
          </div>
        </div>

        {/* Bowling Card Table */}
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3">{bowlingTeamName} Bowlers</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Bowler</th>
                  <th className="py-2.5 px-3 text-right">O</th>
                  <th className="py-2.5 px-3 text-right">M</th>
                  <th className="py-2.5 px-3 text-right">R</th>
                  <th className="py-2.5 px-3 text-right">W</th>
                  <th className="py-2.5 px-3 text-right">Econ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeBowlers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No bowling records recorded for this innings yet.
                    </td>
                  </tr>
                ) : (
                  activeBowlers.map((bw, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-bold text-white">{bw.playerName}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {bw.overs}.{bw.balls}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{bw.maidens}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{bw.runsConceded}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-lime-400">{bw.wickets}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{bw.economy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

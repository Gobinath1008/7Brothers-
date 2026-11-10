import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { matchService, scoringService, tournamentService } from '../../services/api';
import {
  Radio,
  RotateCcw,
  Trophy,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  Shield,
  Activity,
  Flame,
} from 'lucide-react';

export default function AdminLiveScoringPage() {
  const [searchParams] = useSearchParams();
  const matchParam = searchParams.get('match');

  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(matchParam || '');
  const [matchData, setMatchData] = useState(null);

  // Lineup states
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);

  // Active scorer selection states
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Modals
  const [tossModalOpen, setTossModalOpen] = useState(false);
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossChoice, setTossChoice] = useState('BAT');

  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState('BOWLED');
  const [playerOutId, setPlayerOutId] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');

  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load matches
  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await matchService.getAll();
        if (res.success && res.matches) {
          setMatches(res.matches);
          if (!selectedMatchId && res.matches.length > 0) {
            // Pick live match first, else first upcoming match
            const liveMatch = res.matches.find((m) => m.status === 'LIVE') || res.matches[0];
            setSelectedMatchId(liveMatch._id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMatches();
  }, []);

  // Load specific match details
  const fetchCurrentMatch = async () => {
    if (!selectedMatchId) return;
    try {
      const res = await matchService.getById(selectedMatchId);
      if (res.success && res.match) {
        setMatchData(res.match);
        setTeamAPlayers(res.teamAPlayers || []);
        setTeamBPlayers(res.teamBPlayers || []);

        const m = res.match;
        // If toss not set, open toss modal
        if (!m.toss?.wonBy && m.teamA && m.teamB && m.status !== 'COMPLETED') {
          setTossWonBy(m.teamA._id);
          setTossModalOpen(true);
        }

        // Auto select current striker & non-striker
        const currentBatters = (m.battingCard || []).filter((b) => b.isBatting && !b.isOut);
        if (currentBatters.length >= 1 && !strikerId) {
          setStrikerId(currentBatters[0].player);
        }
        if (currentBatters.length >= 2 && !nonStrikerId) {
          setNonStrikerId(currentBatters[1].player);
        }

        // Auto select current bowler
        const curBowler = (m.bowlingCard || []).find((bw) => bw.isCurrentBowler);
        if (curBowler && !bowlerId) {
          setBowlerId(curBowler.player);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error loading match');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentMatch();
  }, [selectedMatchId]);

  if (!matchData) {
    return (
      <div className="py-16 text-center">
        <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
        <h2 className="text-xl font-bold text-white mb-2">Live Scorer Console</h2>
        <p className="text-xs text-slate-400 mb-6">Select a match to start scoring deliveries</p>
        {matches.length > 0 && (
          <div className="max-w-md mx-auto">
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white"
            >
              {matches.map((m) => (
                <option key={m._id} value={m._id}>
                  M#{m.matchNumber} ({m.roundName}): {m.teamAName} vs {m.teamBName} - {m.status}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  const currentInnNum = matchData.currentInnings || 1;
  const inn = currentInnNum === 1 ? matchData.innings1 : matchData.innings2;
  const isCompleted = matchData.status === 'COMPLETED';

  // Batting and Bowling squads
  const battingSquad = inn.battingTeam === matchData.teamA?._id ? teamAPlayers : teamBPlayers;
  const bowlingSquad = inn.bowlingTeam === matchData.teamA?._id ? teamAPlayers : teamBPlayers;

  const battingTeamName =
    inn.battingTeam === matchData.teamA?._id ? matchData.teamA?.name : matchData.teamB?.name;
  const bowlingTeamName =
    inn.bowlingTeam === matchData.teamA?._id ? matchData.teamA?.name : matchData.teamB?.name;

  // Handle Toss
  const handleSaveToss = async () => {
    try {
      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'TOSS',
        tossWonBy,
        tossChoice,
      });
      if (res.success) {
        setTossModalOpen(false);
        fetchCurrentMatch();
      }
    } catch (err) {
      alert(err.message || 'Failed to save toss');
    }
  };

  // Record normal ball or extras
  const handleRecordBall = async (runs = 0, extraType = 'NONE') => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setErrorMsg('Please select Striker, Non-Striker, and Bowler.');
      return;
    }

    if (strikerId === nonStrikerId) {
      setErrorMsg('Striker and Non-Striker cannot be the same player!');
      return;
    }

    setRecording(true);
    setErrorMsg('');
    setAlertMsg('');

    try {
      const res = await scoringService.recordBall({
        matchId: matchData._id,
        runs,
        extraType,
        extraRuns: 0,
        isWicket: false,
        strikerId,
        nonStrikerId,
        bowlerId,
      });

      if (res.success) {
        if (res.isOverComplete) {
          setAlertMsg('Over complete! Please select the new bowler.');
        }
        if (res.nextStriker) setStrikerId(res.nextStriker);
        if (res.nextNonStriker) setNonStrikerId(res.nextNonStriker);
        if (res.isMatchComplete) {
          setAlertMsg(`MATCH FINISHED! ${res.winMargin}`);
        }
        fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording ball');
    } finally {
      setRecording(false);
    }
  };

  // Record Wicket
  const handleRecordWicket = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setErrorMsg('Please select Striker, Non-Striker, and Bowler.');
      return;
    }

    setRecording(true);
    setWicketModalOpen(false);
    setErrorMsg('');

    try {
      const res = await scoringService.recordBall({
        matchId: matchData._id,
        runs: 0,
        extraType: 'NONE',
        isWicket: true,
        wicketType,
        playerOutId: playerOutId || strikerId,
        newBatsmanId: newBatsmanId || null,
        strikerId,
        nonStrikerId,
        bowlerId,
      });

      if (res.success) {
        if (newBatsmanId) {
          if (playerOutId === nonStrikerId) {
            setNonStrikerId(newBatsmanId);
          } else {
            setStrikerId(newBatsmanId);
          }
        }
        setNewBatsmanId('');
        fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording wicket');
    } finally {
      setRecording(false);
    }
  };

  // Undo Last Ball
  const handleUndoBall = async () => {
    if (!window.confirm('Undo the last recorded delivery?')) return;
    try {
      const res = await scoringService.undoBall(matchData._id);
      if (res.success) {
        setAlertMsg('Last delivery undone successfully ↺');
        fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to undo ball');
    }
  };

  // Switch Strike manually
  const handleSwitchStrike = () => {
    const temp = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(temp);
  };

  // End Innings Manually
  const handleSwitchInnings = async () => {
    if (!window.confirm('Close 1st innings and start 2nd innings chasing target?')) return;
    try {
      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'SWITCH_INNINGS',
      });
      if (res.success) {
        setStrikerId('');
        setNonStrikerId('');
        setBowlerId('');
        fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error switching innings');
    }
  };

  // Finalize Match manually
  const handleCompleteMatch = async (winnerId, loserId) => {
    if (!window.confirm('Finalize match result and advance winner to next round?')) return;
    try {
      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'COMPLETE_MATCH',
        winnerId,
        loserId,
        winMargin: 'Match completed by official confirmation',
      });
      if (res.success) {
        setAlertMsg(res.message);
        fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error finalizing match');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      {/* Match Selector Dropdown Strip */}
      <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <select
          value={selectedMatchId}
          onChange={(e) => {
            setSelectedMatchId(e.target.value);
            setStrikerId('');
            setNonStrikerId('');
            setBowlerId('');
          }}
          className="bg-transparent text-xs font-bold text-white focus:outline-none flex-1 truncate"
        >
          {matches.map((m) => (
            <option key={m._id} value={m._id} className="bg-slate-950">
              M#{m.matchNumber}: {m.teamAName} vs {m.teamBName} ({m.status})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!matchData.toss?.wonBy && (
            <button
              onClick={() => setTossModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-lime-500 text-slate-950 text-[10px] font-black uppercase"
            >
              Set Toss
            </button>
          )}
          <button
            onClick={handleUndoBall}
            title="Undo Last Ball"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3 rounded-xl bg-lime-500/15 border border-lime-500/40 text-lime-400 text-xs flex items-center justify-between font-bold">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between font-semibold">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Big Scoreboard Banner */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Stage & Innings */}
        <div className="flex items-center justify-between text-xs mb-3 text-slate-400 font-bold">
          <span className="uppercase tracking-wider">
            {matchData.roundName} • {currentInnNum === 1 ? '1st Innings' : '2nd Innings Chasing'}
          </span>
          {matchData.status === 'LIVE' ? (
            <span className="text-red-400 flex items-center gap-1 uppercase font-extrabold text-[10px]">
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot"></span> LIVE
            </span>
          ) : (
            <span className="text-lime-400 text-[10px] uppercase font-bold">{matchData.status}</span>
          )}
        </div>

        {/* Big Score & Overs Display */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-xs uppercase font-extrabold text-lime-400">{battingTeamName}</div>
            <div className="font-scoreboard text-5xl font-black text-white leading-none">
              {inn.runs} / <span className="text-lime-400">{inn.wickets}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase font-bold text-slate-400">OVERS</div>
            <div className="font-mono text-3xl font-black text-white">
              {inn.overs}.{inn.balls}
              <span className="text-sm font-sans text-slate-500 ml-1">/ {matchData.tournament?.oversPerMatch || 5}</span>
            </div>
          </div>
        </div>

        {/* Target & Equation Banner (for 2nd innings) */}
        {currentInnNum === 2 && inn.target > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-bold mb-3">
            <span className="text-slate-300">Target: {inn.target}</span>
            <span className="text-amber-300">
              Need {Math.max(0, inn.target - inn.runs)} runs in{' '}
              {Math.max(0, (matchData.tournament?.oversPerMatch || 5) * 6 - (inn.overs * 6 + inn.balls))} balls
            </span>
          </div>
        )}

        {/* Completed Margin banner */}
        {matchData.winMargin && (
          <div className="p-3 rounded-xl bg-lime-500/20 border border-lime-500/50 text-center text-xs font-black text-lime-400">
            🏆 {matchData.winMargin}
          </div>
        )}
      </div>

      {/* Striker / Non-Striker & Bowler Selection Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Batters Selector */}
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>BATTING ({battingTeamName})</span>
            <button
              onClick={handleSwitchStrike}
              className="flex items-center gap-1 text-lime-400 hover:underline text-[10px]"
            >
              <ArrowRightLeft className="w-3 h-3" /> Rotate Strike
            </button>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="text-[10px] text-lime-400 font-extrabold uppercase">Striker *</label>
              <select
                value={strikerId}
                onChange={(e) => setStrikerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="">Select Striker</option>
                {battingSquad.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.isCaptain ? '(C)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase">Non-Striker *</label>
              <select
                value={nonStrikerId}
                onChange={(e) => setNonStrikerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="">Select Non-Striker</option>
                {battingSquad.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.isCaptain ? '(C)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bowler Selector */}
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-[11px] font-bold text-slate-400">BOWLING ({bowlingTeamName})</div>
          <div>
            <label className="text-[10px] text-lime-400 font-extrabold uppercase">Active Bowler *</label>
            <select
              value={bowlerId}
              onChange={(e) => setBowlerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
            >
              <option value="">Select Bowler</option>
              {bowlingSquad.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.isCaptain ? '(C)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            Extras: Wd: {inn.extras?.wide || 0} | Nb: {inn.extras?.noBall || 0} | Total: {inn.extras?.total || 0}
          </div>
        </div>
      </div>

      {/* BIG TACTILE MOBILE SCORING BUTTONS */}
      {!isCompleted && (
        <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-3">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 text-center">
            Tap Ball Outcome
          </div>

          {/* Primary Runs Grid: 0, 1, 2, 3, 4, 5, 6, W */}
          <div className="grid grid-cols-4 gap-2.5">
            {[0, 1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(r, 'NONE')}
                className="py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-mono text-2xl font-black text-white active:scale-95 transition-transform shadow-md"
              >
                {r}
              </button>
            ))}

            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(4, 'NONE')}
              className="py-4 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-mono text-2xl font-black active:scale-95 transition-transform shadow-md"
            >
              4
            </button>

            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(5, 'NONE')}
              className="py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-mono text-2xl font-black text-white active:scale-95 transition-transform shadow-md"
            >
              5
            </button>

            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(6, 'NONE')}
              className="py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-2xl font-black active:scale-95 transition-transform shadow-md"
            >
              6
            </button>

            {/* WICKET BUTTON */}
            <button
              type="button"
              disabled={recording}
              onClick={() => {
                setPlayerOutId(strikerId);
                setWicketModalOpen(true);
              }}
              className="py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-mono text-2xl font-black active:scale-95 transition-transform shadow-md glow-lime-sm"
            >
              W
            </button>
          </div>

          {/* Extras Row: Wide, No Ball, Bye, Leg Bye */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(0, 'WIDE')}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-95"
            >
              +Wd
            </button>
            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(0, 'NO_BALL')}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-95"
            >
              +Nb
            </button>
            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(1, 'BYE')}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95"
            >
              +1 Bye
            </button>
            <button
              type="button"
              disabled={recording}
              onClick={() => handleRecordBall(1, 'LEG_BYE')}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95"
            >
              +1 Lb
            </button>
          </div>
        </div>
      )}

      {/* Innings Switch & Match Completion Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {currentInnNum === 1 && !isCompleted && (
          <button
            onClick={handleSwitchInnings}
            className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white"
          >
            End 1st Innings →
          </button>
        )}

        {!isCompleted && matchData.teamA && matchData.teamB && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleCompleteMatch(matchData.teamA._id, matchData.teamB._id)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white"
            >
              Declare {matchData.teamA.name} Winner
            </button>
            <button
              onClick={() => handleCompleteMatch(matchData.teamB._id, matchData.teamA._id)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white"
            >
              Declare {matchData.teamB.name} Winner
            </button>
          </div>
        )}
      </div>

      {/* Toss Modal */}
      {tossModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-lime-400" /> Match Toss Setup
            </h3>
            <p className="text-xs text-slate-400 mb-4">Select who won the toss and their choice</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Toss Won By *</label>
                <select
                  value={tossWonBy}
                  onChange={(e) => setTossWonBy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value={matchData.teamA?._id}>{matchData.teamA?.name}</option>
                  <option value={matchData.teamB?._id}>{matchData.teamB?.name}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Elected To *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTossChoice('BAT')}
                    className={`py-2 rounded-xl text-xs font-black uppercase ${
                      tossChoice === 'BAT' ? 'bg-lime-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    BAT FIRST
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossChoice('BOWL')}
                    className={`py-2 rounded-xl text-xs font-black uppercase ${
                      tossChoice === 'BOWL' ? 'bg-lime-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    BOWL FIRST
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveToss}
                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
              >
                Confirm Toss & Start Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wicket Modal */}
      {wicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <h3 className="text-base font-black text-red-400 mb-1 flex items-center gap-2">
              🚨 Wicket Fall Recording
            </h3>
            <p className="text-xs text-slate-400 mb-4">Specify dismissal details and next batsman</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Batsman Out *</label>
                <select
                  value={playerOutId}
                  onChange={(e) => setPlayerOutId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value={strikerId}>Striker (Current on-strike)</option>
                  <option value={nonStrikerId}>Non-Striker (Run-out)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Dismissal Type *</label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="LBW">LBW</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">New Batsman (Optional)</label>
                <select
                  value={newBatsmanId}
                  onChange={(e) => setNewBatsmanId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Select next player</option>
                  {battingSquad.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWicketModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordWicket}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-red-600 text-white hover:bg-red-500 shadow-md"
                >
                  Confirm Wicket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

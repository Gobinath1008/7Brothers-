import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { matchService, scoringService } from '../../services/api';
import {
  Radio,
  RotateCcw,
  Trophy,
  AlertCircle,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Shield,
  Activity,
  Flame,
  ArrowRight,
  Eye,
  Calendar,
  Edit3,
  Trash2,
  Sliders,
} from 'lucide-react';

export default function AdminLiveScoringPage() {
  const [searchParams] = useSearchParams();
  const matchParam = searchParams.get('match');

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(matchParam || '');
  const [matchData, setMatchData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);

  // Modals
  const [tossModalOpen, setTossModalOpen] = useState(false);
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossChoice, setTossChoice] = useState('BAT');
  const [selectedOverModal, setSelectedOverModal] = useState(null);

  // Edit Ball Modal State
  const [editingBall, setEditingBall] = useState(null);
  const [editRuns, setEditRuns] = useState(0);
  const [editExtraType, setEditExtraType] = useState('NONE');
  const [editExtraRuns, setEditExtraRuns] = useState(0);
  const [editIsWicket, setEditIsWicket] = useState(false);
  const [editWicketType, setEditWicketType] = useState('OUT');

  // Quick Score Edit Modal State
  const [quickScoreModalOpen, setQuickScoreModalOpen] = useState(false);
  const [quickRuns, setQuickRuns] = useState(0);
  const [quickWickets, setQuickWickets] = useState(0);
  const [quickOvers, setQuickOvers] = useState(0);
  const [quickBalls, setQuickBalls] = useState(0);
  const [quickTarget, setQuickTarget] = useState(0);

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

  // Load match details & deliveries
  const fetchCurrentMatch = async () => {
    if (!selectedMatchId) return;
    try {
      const res = await matchService.getById(selectedMatchId);
      if (res.success && res.match) {
        setMatchData(res.match);
        setDeliveries(res.allDeliveries || res.recentDeliveries || []);

        const m = res.match;
        if (!m.toss?.wonBy && m.teamA && m.teamB && m.status !== 'COMPLETED') {
          setTossWonBy(m.teamA._id);
          setTossModalOpen(true);
        }

        const currentInn = m.currentInnings === 2 ? m.innings2 : m.innings1;
        setQuickRuns(currentInn.runs || 0);
        setQuickWickets(currentInn.wickets || 0);
        setQuickOvers(currentInn.overs || 0);
        setQuickBalls(currentInn.balls || 0);
        setQuickTarget(m.innings2?.target || 0);
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
          <div className="max-w-md mx-auto px-4">
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
  const totalOversAllowed = matchData.tournament?.oversPerMatch || 5;

  const battingTeamName =
    inn.battingTeam === matchData.teamA?._id ? matchData.teamA?.name : matchData.teamB?.name;

  // Group deliveries for active innings by overNumber
  const innDeliveries = (deliveries || []).filter((d) => d.innings === currentInnNum);
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
        legalBalls: 0,
      };
    }
    oversMap[ov].balls.push(d);
    oversMap[ov].runs += d.totalRuns ?? ((d.runsBat || 0) + (d.extraRuns || 0));
    if (d.isWicket) oversMap[ov].wickets += 1;
    if (d.extraType && d.extraType !== 'NONE') oversMap[ov].extras += d.extraRuns || 1;
    if (d.isLegalDelivery) oversMap[ov].legalBalls += 1;
  });

  // Current active over data
  const currentOverIndex = inn.overs ?? 0;
  const currentOverData = oversMap[currentOverIndex] || {
    overNumber: currentOverIndex,
    balls: [],
    runs: 0,
    wickets: 0,
    extras: 0,
    legalBalls: inn.balls || 0,
  };

  // Completed overs list for history display
  const allOversList = Object.values(oversMap).sort((a, b) => a.overNumber - b.overNumber);

  // Check if 6 legal balls bowled in current over
  const isOverFull = currentOverData.legalBalls >= 6 || (inn.balls === 0 && inn.overs > 0);

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

  // Record Ball (Runs, Extras, Wicket) - Box Cricket Rules
  const handleRecordBall = async (runs = 0, extraType = 'NONE', isWicket = false, wicketType = 'OUT', extraRuns = 0) => {
    setRecording(true);
    setErrorMsg('');
    setAlertMsg('');

    try {
      const res = await scoringService.recordBall({
        matchId: matchData._id,
        runs,
        extraType,
        extraRuns,
        isWicket,
        wicketType: isWicket ? wicketType : 'NONE',
      });

      if (res.success) {
        if (res.isMatchComplete) {
          setAlertMsg(`MATCH FINISHED! ${res.winMargin}`);
        } else if (res.isOverComplete) {
          setAlertMsg(`Over Complete! 6 balls bowled in Over ${inn.overs + 1}.`);
        }
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording delivery');
    } finally {
      setRecording(false);
    }
  };

  // Next Over Action
  const handleNextOver = async () => {
    try {
      setRecording(true);
      setErrorMsg('');

      const completedOvData = oversMap[inn.overs] || {
        overNumber: inn.overs,
        runs: currentOverData.runs,
        wickets: currentOverData.wickets,
        balls: currentOverData.balls,
        legalBalls: currentOverData.legalBalls,
      };

      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'NEXT_OVER',
      });

      if (res.success) {
        setSelectedOverModal(completedOvData);
        setAlertMsg(`Over ${completedOvData.overNumber + 1} complete: ${completedOvData.runs} runs scored! Starting next over.`);
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error starting next over');
    } finally {
      setRecording(false);
    }
  };

  // Previous Over Action
  const handlePrevOver = async () => {
    if (inn.overs <= 0) return;
    if (!window.confirm(`Return back to Over ${inn.overs}?`)) return;

    try {
      setRecording(true);
      setErrorMsg('');

      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'PREV_OVER',
      });

      if (res.success) {
        setAlertMsg(`Returned to Over ${inn.overs} ↺`);
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error moving to previous over');
    } finally {
      setRecording(false);
    }
  };

  // Open Ball Edit Modal
  const openEditBallModal = (ball) => {
    setEditingBall(ball);
    setEditRuns(ball.runsBat || 0);
    setEditExtraType(ball.extraType || 'NONE');
    setEditExtraRuns(ball.extraRuns || 0);
    setEditIsWicket(!!ball.isWicket);
    setEditWicketType(ball.wicketType || 'OUT');
  };

  // Save Ball Edit
  const handleSaveEditedBall = async () => {
    if (!editingBall) return;
    try {
      setRecording(true);
      setErrorMsg('');

      const res = await scoringService.editBall({
        matchId: matchData._id,
        ballId: editingBall._id,
        action: 'UPDATE',
        runs: editRuns,
        extraType: editExtraType,
        extraRuns: editExtraRuns,
        isWicket: editIsWicket,
        wicketType: editIsWicket ? editWicketType : 'NONE',
      });

      if (res.success) {
        setEditingBall(null);
        setAlertMsg('Delivery corrected & score updated! ✏️');
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating delivery');
    } finally {
      setRecording(false);
    }
  };

  // Delete Ball
  const handleDeleteBall = async (ballId) => {
    if (!window.confirm('Delete this delivery completely? Match score will automatically recalculate.')) return;
    try {
      setRecording(true);
      setErrorMsg('');

      const res = await scoringService.deleteBall(matchData._id, ballId);
      if (res.success) {
        setEditingBall(null);
        setAlertMsg('Delivery deleted & score recalculated! 🗑️');
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error deleting delivery');
    } finally {
      setRecording(false);
    }
  };

  // Save Quick Score Manual Adjustment
  const handleSaveQuickScore = async () => {
    try {
      setRecording(true);
      setErrorMsg('');

      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'EDIT_SCORE',
        inningsNumber: currentInnNum,
        runs: quickRuns,
        wickets: quickWickets,
        overs: quickOvers,
        balls: quickBalls,
        target: quickTarget,
      });

      if (res.success) {
        setQuickScoreModalOpen(false);
        setAlertMsg('Score manual correction applied! ✏️');
        await fetchCurrentMatch();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating score');
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

  // Switch Innings
  const handleSwitchInnings = async () => {
    if (!window.confirm('Close 1st innings and start 2nd innings chasing target?')) return;
    try {
      const res = await scoringService.updateStatus({
        matchId: matchData._id,
        action: 'SWITCH_INNINGS',
      });
      if (res.success) {
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

  // Helper for ball badge styling
  const getBallBadge = (ball) => {
    if (ball.isWicket) {
      if (ball.wicketType === 'SIX_OUT' || ball.ballSummary === '6-OUT') {
        return { bg: 'bg-rose-600 text-white font-black', text: '6-OUT' };
      }
      return { bg: 'bg-red-500 text-white font-black', text: 'W' };
    }
    if (ball.extraType === 'WIDE') {
      if (ball.extraRuns === 4 || ball.ballSummary === 'Wd+4' || ball.totalRuns === 5) {
        return { bg: 'bg-amber-500 text-slate-950 font-black shadow-md', text: 'Wd+4' };
      }
      return { bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold', text: ball.ballSummary || 'Wd' };
    }
    if (ball.extraType === 'NO_BALL') {
      if (ball.extraRuns === 4 || ball.ballSummary === 'Nb+4' || ball.totalRuns === 5) {
        return { bg: 'bg-amber-500 text-slate-950 font-black shadow-md', text: 'Nb+4' };
      }
      return { bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold', text: ball.ballSummary || 'Nb' };
    }
    if (ball.extraType === 'BYE') {
      return { bg: 'bg-slate-800 text-slate-300 font-bold', text: `${ball.extraRuns || 1}B` };
    }
    if (ball.extraType === 'LEG_BYE') {
      return { bg: 'bg-slate-800 text-slate-300 font-bold', text: `${ball.extraRuns || 1}LB` };
    }
    if (ball.runsBat === 4) {
      return { bg: 'bg-lime-500 text-slate-950 font-black', text: '4' };
    }
    if (ball.runsBat === 0) {
      return { bg: 'bg-slate-800 text-slate-400 font-bold', text: '0' };
    }
    return { bg: 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold', text: String(ball.runsBat) };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 px-2 sm:px-0">
      {/* Match Selector & Control Strip */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <select
          value={selectedMatchId}
          onChange={(e) => setSelectedMatchId(e.target.value)}
          className="bg-transparent text-xs font-bold text-white focus:outline-none flex-1 truncate"
        >
          {matches.map((m) => (
            <option key={m._id} value={m._id} className="bg-slate-950">
              M#{m.matchNumber}: {m.teamAName} vs {m.teamBName} ({m.status})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            to="/admin/scores"
            title="View All Existing Match Scores"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-lime-400" /> All Scores
          </Link>

          <button
            onClick={() => setQuickScoreModalOpen(true)}
            title="Edit Match Score Directly"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-lime-400" /> Edit Score
          </button>

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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-lime-400" /> Undo
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
        {/* Stage & Status */}
        <div className="flex items-center justify-between text-xs mb-3 text-slate-400 font-bold">
          <span className="uppercase tracking-wider">
            {matchData.roundName} • {currentInnNum === 1 ? '1st Innings' : '2nd Innings Chasing'}
          </span>
          {matchData.status === 'LIVE' ? (
            <span className="text-red-400 flex items-center gap-1 uppercase font-extrabold text-[10px]">
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot"></span> LIVE MATCH
            </span>
          ) : (
            <span className="text-lime-400 text-[10px] uppercase font-bold">{matchData.status}</span>
          )}
        </div>

        {/* Big Score Display */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="text-xs uppercase font-extrabold text-lime-400">{battingTeamName || 'Batting Team'}</div>
            <div className="font-scoreboard text-5xl font-black text-white leading-none">
              {inn.runs} / <span className="text-lime-400">{inn.wickets}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase font-bold text-slate-400">OVERS</div>
            <div className="font-mono text-3xl font-black text-white">
              {inn.overs}.{inn.balls}
              <span className="text-sm font-sans text-slate-500 ml-1">/ {totalOversAllowed}</span>
            </div>
          </div>
        </div>

        {/* Target Banner (for 2nd innings) */}
        {currentInnNum === 2 && inn.target > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-bold mt-3">
            <span className="text-slate-300">Target: {inn.target}</span>
            <span className="text-amber-300">
              Need {Math.max(0, inn.target - inn.runs)} runs in{' '}
              {Math.max(0, totalOversAllowed * 6 - (inn.overs * 6 + inn.balls))} balls
            </span>
          </div>
        )}

        {/* Completed Winner Margin Banner */}
        {matchData.winMargin && (
          <div className="mt-3 p-3 rounded-xl bg-lime-500/20 border border-lime-500/50 text-center text-xs font-black text-lime-400">
            🏆 {matchData.winMargin}
          </div>
        )}
      </div>

      {/* CURRENT OVER BALL-BY-BALL ACCOUNTING CONSOLE */}
      {!isCompleted && (
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-lime-400 tracking-wider">
                  OVER {currentOverIndex + 1}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {currentOverData.legalBalls} / 6 Balls
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Current Over: <strong className="text-white font-mono">{currentOverData.runs} Runs</strong>
                {currentOverData.wickets > 0 && (
                  <span className="text-red-400 font-bold ml-1.5">• {currentOverData.wickets} Wicket{currentOverData.wickets > 1 ? 's' : ''}</span>
                )}
                {currentOverData.extras > 0 && (
                  <span className="text-amber-400 ml-1.5">• {currentOverData.extras} Extras</span>
                )}
              </div>
            </div>

            {/* PREV & NEXT OVER BUTTONS */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* PREV OVER BUTTON */}
              <button
                onClick={handlePrevOver}
                disabled={recording || inn.overs <= 0}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                  inn.overs <= 0
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800/50 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700 hover:text-white'
                }`}
                title="Go back to previous over"
              >
                <ChevronLeft className="w-4 h-4" /> Prev Over
              </button>

              {/* NEXT OVER BUTTON */}
              <button
                onClick={handleNextOver}
                disabled={recording}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                  isOverFull
                    ? 'bg-lime-500 text-slate-950 hover:bg-lime-400 animate-pulse'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700'
                }`}
                title="End this over and view its total runs"
              >
                Next Over <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ball Slots Strip for the Current Over (Click any ball to edit) */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
              <span>Over {currentOverIndex + 1} Deliveries (Tap any ball to edit):</span>
              <span className="text-lime-400/80 font-bold">Click ball to fix ✏️</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
              {currentOverData.balls.map((ball, idx) => {
                const badge = getBallBadge(ball);
                return (
                  <button
                    key={ball._id || idx}
                    type="button"
                    onClick={() => openEditBallModal(ball)}
                    className={`relative group w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-mono text-sm shadow-md transition-transform active:scale-90 hover:ring-2 hover:ring-lime-400 ${badge.bg}`}
                    title={`Ball ${idx + 1}: ${badge.text} - Tap to Edit / Delete`}
                  >
                    {badge.text}
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-slate-950/80 rounded-full text-[8px] flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100">
                      ✏️
                    </span>
                  </button>
                );
              })}

              {/* Remaining Empty Ball Slots in this 6-ball over */}
              {Array.from({ length: Math.max(0, 6 - currentOverData.legalBalls) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-10 h-10 rounded-2xl flex-shrink-0 border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 font-mono text-xs font-bold"
                  title={`Ball ${currentOverData.legalBalls + i + 1}`}
                >
                  {currentOverData.legalBalls + i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* BOX CRICKET TACTILE BALL SCORING BUTTONS */}
          <div className="pt-2 space-y-2.5">
            {/* Primary Runs & Wicket Grid: 0, 1, 2, 3, 4, 6(OUT), W */}
            <div className="grid grid-cols-4 gap-2.5">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={recording}
                  onClick={() => handleRecordBall(r, 'NONE', false)}
                  className="py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-mono text-2xl font-black text-white active:scale-95 transition-transform shadow-md"
                >
                  {r}
                </button>
              ))}

              {/* 4 (Boundary) - Max runs in Box Cricket */}
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(4, 'NONE', false)}
                className="py-3.5 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-mono text-2xl font-black active:scale-95 transition-transform shadow-md"
                title="Four (Boundary)"
              >
                4
              </button>

              {/* 6 = OUT (Box Cricket Rule: Hitting 6 is Wicket Out!) */}
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(0, 'NONE', true, 'SIX_OUT')}
                className="py-3.5 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-mono text-lg font-black active:scale-95 transition-transform shadow-md flex flex-col items-center justify-center leading-tight border border-rose-400/40"
                title="Hit 6 (Over Net) = Wicket Out!"
              >
                <span>6</span>
                <span className="text-[10px] font-sans font-black tracking-wider uppercase text-rose-200">OUT</span>
              </button>

              {/* Regular Wicket (Bowled / Caught / Run-out) */}
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(0, 'NONE', true, 'OUT')}
                className="py-3.5 col-span-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-mono text-xl font-black active:scale-95 transition-transform shadow-md flex items-center justify-center gap-1.5"
                title="Wicket Fall (Bowled, Caught, Run Out)"
              >
                <span>W</span>
                <span className="text-xs font-sans font-black tracking-wider uppercase">WICKET</span>
              </button>
            </div>

            {/* Extras Row (Including Wide + 4) */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(0, 'WIDE', false, 'NONE', 0)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-95"
                title="Wide (+1 run)"
              >
                +Wd
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(0, 'WIDE', false, 'NONE', 4)}
                className="py-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400 text-amber-300 font-black text-xs active:scale-95 shadow-sm"
                title="Wide + 4 Boundary (+5 runs total)"
              >
                Wd+4
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(0, 'NO_BALL', false, 'NONE', 0)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-95"
                title="No Ball (+1 run)"
              >
                +Nb
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(1, 'BYE', false)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95"
                title="1 Bye"
              >
                +1 B
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={() => handleRecordBall(1, 'LEG_BYE', false)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95"
                title="1 Leg Bye"
              >
                +1 Lb
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVER-BY-OVER HISTORY & RUN BREAKDOWN (CLICK ANY OVER OR BALL TO VIEW & EDIT) */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-lime-400" /> Overs Breakdown & History
            </h3>
            <span className="text-[11px] text-slate-400">Tap an over to view runs summary, or tap any ball pill to edit/delete</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            Innings {currentInnNum}
          </span>
        </div>

        {allOversList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-semibold">
            No deliveries recorded yet. Tap any scoring button to start Over 1!
          </div>
        ) : (
          <div className="space-y-2">
            {allOversList.map((ovData) => {
              const isCurrent = ovData.overNumber === currentOverIndex;
              return (
                <div
                  key={ovData.overNumber}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-lime-500/5 border-lime-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div
                    onClick={() => setSelectedOverModal(ovData)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black flex-shrink-0 ${
                      isCurrent ? 'bg-lime-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      O{ovData.overNumber + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-white">
                          Over {ovData.overNumber + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-500/20 text-lime-400 font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Ball pills preview - Clickable to edit */}
                      <div className="flex items-center gap-1 mt-1 overflow-x-hidden">
                        {ovData.balls.map((b, i) => {
                          const badge = getBallBadge(b);
                          return (
                            <span
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditBallModal(b);
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer hover:scale-110 active:scale-95 transition-transform ${badge.bg}`}
                              title="Click to edit or delete this ball"
                            >
                              {badge.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedOverModal(ovData)}
                    className="text-right flex items-center gap-2 flex-shrink-0 cursor-pointer"
                  >
                    <div>
                      <div className="font-mono text-base font-black text-lime-400">
                        {ovData.runs} <span className="text-[10px] font-sans font-bold text-slate-400">runs</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {ovData.wickets} wkt{ovData.wickets !== 1 ? 's' : ''} • {ovData.legalBalls} balls
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-slate-500 hover:text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Innings Switch & Match Completion Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {currentInnNum === 1 && !isCompleted && (
          <button
            onClick={handleSwitchInnings}
            className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white shadow-sm"
          >
            End 1st Innings → Start 2nd Innings
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

      {/* EDIT DELIVERY MODAL (FIX ACCIDENTAL INPUT MISTAKES) */}
      {editingBall && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider">
                  FIX DELIVERY MISTAKE
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-lime-400" /> Over {(editingBall.overNumber ?? 0) + 1} • Ball
                </h3>
              </div>
              <button
                onClick={() => setEditingBall(null)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Outcome:</span>
              <span className="font-mono font-black text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                {editingBall.ballSummary} ({editingBall.totalRuns || 0} runs)
              </span>
            </div>

            {/* Select New Outcome */}
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-2">
                Select Correct Outcome:
              </label>

              {/* Standard Runs */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[0, 1, 2, 3, 4].map((r) => {
                  const isSelected = !editIsWicket && editExtraType === 'NONE' && editRuns === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setEditRuns(r);
                        setEditExtraType('NONE');
                        setEditExtraRuns(0);
                        setEditIsWicket(false);
                      }}
                      className={`py-2 rounded-xl font-mono text-sm font-black border transition-all ${
                        isSelected
                          ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              {/* Wickets */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditRuns(0);
                    setEditExtraType('NONE');
                    setEditExtraRuns(0);
                    setEditIsWicket(true);
                    setEditWicketType('OUT');
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                    editIsWicket && editWicketType === 'OUT'
                      ? 'bg-red-600 text-white border-red-500 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  W (Wicket)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditRuns(0);
                    setEditExtraType('NONE');
                    setEditExtraRuns(0);
                    setEditIsWicket(true);
                    setEditWicketType('SIX_OUT');
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                    editIsWicket && editWicketType === 'SIX_OUT'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  6-OUT (Six is Out)
                </button>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditRuns(0);
                    setEditExtraType('WIDE');
                    setEditExtraRuns(0);
                    setEditIsWicket(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    editExtraType === 'WIDE' && editExtraRuns === 0
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-amber-300 border-amber-500/30'
                  }`}
                >
                  +Wd (+1)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditRuns(0);
                    setEditExtraType('WIDE');
                    setEditExtraRuns(4);
                    setEditIsWicket(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    editExtraType === 'WIDE' && editExtraRuns === 4
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-amber-300 border-amber-500/30'
                  }`}
                >
                  Wd+4 (+5)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditRuns(0);
                    setEditExtraType('NO_BALL');
                    setEditExtraRuns(0);
                    setEditIsWicket(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    editExtraType === 'NO_BALL'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-amber-300 border-amber-500/30'
                  }`}
                >
                  +Nb (+1)
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={recording}
                onClick={handleSaveEditedBall}
                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-md active:scale-95"
              >
                Save Correction & Recalculate 💾
              </button>

              <button
                type="button"
                disabled={recording}
                onClick={() => handleDeleteBall(editingBall._id)}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase text-red-400 hover:bg-red-950/40 border border-red-500/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete This Ball Entirely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SCORE MANUAL EDIT MODAL */}
      {quickScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider">
                  DIRECT SCORE OVERRIDE
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-lime-400" /> Edit Match Score
                </h3>
              </div>
              <button
                onClick={() => setQuickScoreModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Directly override score numbers in case of an urgent umpire or entry correction:
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Total Runs
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickRuns}
                    onChange={(e) => setQuickRuns(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Wickets
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={quickWickets}
                    onChange={(e) => setQuickWickets(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Completed Overs
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={quickOvers}
                    onChange={(e) => setQuickOvers(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Balls In Over
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={quickBalls}
                    onChange={(e) => setQuickBalls(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {currentInnNum === 2 && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Target Score
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickTarget}
                    onChange={(e) => setQuickTarget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={recording}
                onClick={handleSaveQuickScore}
                className="w-full py-3 mt-2 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-md active:scale-95"
              >
                Apply Score Correction ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVER SUMMARY MODAL (TRIGGERED ON NEXT OVER OR BY TAPPING ANY OVER) */}
      {selectedOverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider">
                  OVER SUMMARY BREAKDOWN
                </span>
                <h3 className="text-xl font-black text-white">
                  Over {selectedOverModal.overNumber + 1}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOverModal(null)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Big Run Highlight */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Runs Scored</span>
              <div className="font-scoreboard text-5xl font-black text-lime-400 my-1">
                {selectedOverModal.runs}
              </div>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-300">
                <span>🚨 {selectedOverModal.wickets} Wicket{selectedOverModal.wickets !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>🏏 {selectedOverModal.balls.length} Deliveries</span>
              </div>
            </div>

            {/* Delivery Sequence Detail - Tap any ball to edit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-400">
                  Ball by Ball (Tap to edit)
                </label>
                <span className="text-[10px] text-lime-400 font-bold">Tap to fix ✏️</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedOverModal.balls.map((b, idx) => {
                  const badge = getBallBadge(b);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedOverModal(null);
                        openEditBallModal(b);
                      }}
                      className="flex flex-col items-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-lime-400/60 flex-1 min-w-[50px] transition-colors cursor-pointer"
                      title="Tap to edit this ball"
                    >
                      <span className="text-[9px] font-bold text-slate-500 mb-1">B#{idx + 1}</span>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black ${badge.bg}`}>
                        {badge.text}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white mt-1">
                        +{b.totalRuns || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOverModal(null)}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-lime-500 text-slate-950 hover:bg-lime-400 transition-colors shadow-sm"
            >
              Continue Scoring 🏏
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}

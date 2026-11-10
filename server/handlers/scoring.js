import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export async function handleScoreBall(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const {
      matchId,
      runs = 0,
      extraType = 'NONE',
      extraRuns = 0,
      isWicket = false,
      wicketType = 'NONE',
      playerOutId = null,
      strikerId = null,
      nonStrikerId = null,
      bowlerId = null,
      newBatsmanId = null,
    } = req.body || {};

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID is required.',
      });
    }

    const match = await Match.findById(matchId).populate('tournament teamA teamB');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Match is already completed.' });
    }

    match.status = 'LIVE';

    const tournament = match.tournament;
    const maxOvers = tournament.oversPerMatch || 5;
    const playersPerTeam = tournament.playersPerTeam || 7;
    const maxWickets = playersPerTeam - 1;

    const currentInnNum = match.currentInnings || 1;
    const innings = currentInnNum === 1 ? match.innings1 : match.innings2;

    const isWide = extraType === 'WIDE';
    const isNoBall = extraType === 'NO_BALL';
    const isBye = extraType === 'BYE';
    const isLegBye = extraType === 'LEG_BYE';
    const isLegal = !isWide && !isNoBall;

    let batRuns = Number(runs);
    let extrasTotal = 0;

    if (isWide) {
      batRuns = 0;
      extrasTotal = 1 + Number(extraRuns);
      innings.extras.wide += extrasTotal;
    } else if (isNoBall) {
      extrasTotal = 1 + Number(extraRuns);
      innings.extras.noBall += extrasTotal;
    } else if (isBye) {
      extrasTotal = batRuns;
      batRuns = 0;
      innings.extras.bye += extrasTotal;
    } else if (isLegBye) {
      extrasTotal = batRuns;
      batRuns = 0;
      innings.extras.legBye += extrasTotal;
    }

    innings.extras.total += extrasTotal;
    const totalRunsThisBall = batRuns + extrasTotal;
    innings.runs += totalRunsThisBall;

    const deliveryOverNumber = innings.overs;
    let ballInOverNumber = innings.balls;

    if (isLegal) {
      ballInOverNumber += 1;
      innings.balls += 1;
      if (innings.balls >= 6) {
        innings.overs += 1;
        innings.balls = 0;
      }
    }

    let playerOutDoc = null;
    if (isWicket) {
      innings.wickets += 1;
      const targetOutId = playerOutId || strikerId;
      if (targetOutId) {
        try { playerOutDoc = await Player.findById(targetOutId); } catch (_) {}
      }
    }

    let strikerDoc = null;
    let nonStrikerDoc = null;
    let bowlerDoc = null;

    if (strikerId) {
      try { strikerDoc = await Player.findById(strikerId); } catch (_) {}
    }
    if (nonStrikerId) {
      try { nonStrikerDoc = await Player.findById(nonStrikerId); } catch (_) {}
    }
    if (bowlerId) {
      try { bowlerDoc = await Player.findById(bowlerId); } catch (_) {}
    }

    const strikerName = strikerDoc?.name || 'Batter';
    const nonStrikerName = nonStrikerDoc?.name || 'Non-Striker';
    const bowlerName = bowlerDoc?.name || 'Bowler';

    let ballSummary = String(batRuns);
    if (isWicket) {
      ballSummary = 'W';
      if (batRuns > 0) ballSummary = `W+${batRuns}`;
    } else if (isWide) {
      ballSummary = extrasTotal > 1 ? `${extrasTotal}Wd` : 'Wd';
    } else if (isNoBall) {
      ballSummary = batRuns > 0 ? `Nb+${batRuns}` : 'Nb';
    } else if (isBye) {
      ballSummary = `${extrasTotal}B`;
    } else if (isLegBye) {
      ballSummary = `${extrasTotal}LB`;
    }

    await BallDelivery.create({
      match: match._id,
      innings: currentInnNum,
      overNumber: deliveryOverNumber,
      ballInOver: ballInOverNumber,
      striker: { id: strikerDoc?._id || null, name: strikerName },
      nonStriker: { id: nonStrikerDoc?._id || null, name: nonStrikerName },
      bowler: { id: bowlerDoc?._id || null, name: bowlerName },
      runsBat: batRuns,
      extraRuns: extrasTotal,
      extraType,
      isLegalDelivery: isLegal,
      isWicket,
      wicketType: isWicket ? (wicketType || 'OUT') : 'NONE',
      playerOut: playerOutDoc ? { id: playerOutDoc._id, name: playerOutDoc.name } : null,
      ballSummary,
      totalRuns: totalRunsThisBall,
    });

    if (strikerDoc) {
      let strikerCard = match.battingCard.find((b) => b.player && b.player.toString() === strikerDoc._id.toString());
      if (!strikerCard) {
        match.battingCard.push({
          player: strikerDoc._id,
          playerName: strikerDoc.name,
          team: innings.battingTeam,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
          dismissal: 'not out',
          onStrike: true,
          isBatting: true,
        });
        strikerCard = match.battingCard[match.battingCard.length - 1];
      }

      if (!isWide) {
        strikerCard.balls += 1;
      }
      strikerCard.runs += batRuns;
      if (batRuns === 4) strikerCard.fours += 1;
      if (batRuns === 6) strikerCard.sixes += 1;
      strikerCard.strikeRate = strikerCard.balls > 0 ? Number(((strikerCard.runs / strikerCard.balls) * 100).toFixed(1)) : 0;

      if (isWicket && (!playerOutId || playerOutId.toString() === strikerDoc._id.toString())) {
        strikerCard.isOut = true;
        strikerCard.isBatting = false;
        strikerCard.onStrike = false;
        strikerCard.dismissal = `${(wicketType || 'out').toLowerCase()}${bowlerDoc ? ` b ${bowlerDoc.name}` : ''}`;
      }
    }

    if (nonStrikerDoc) {
      let nonStrikerCard = match.battingCard.find((b) => b.player && b.player.toString() === nonStrikerDoc._id.toString());
      if (!nonStrikerCard) {
        match.battingCard.push({
          player: nonStrikerDoc._id,
          playerName: nonStrikerDoc.name,
          team: innings.battingTeam,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
          dismissal: 'not out',
          onStrike: false,
          isBatting: true,
        });
        nonStrikerCard = match.battingCard[match.battingCard.length - 1];
      }

      if (isWicket && playerOutId && playerOutId.toString() === nonStrikerDoc._id.toString()) {
        nonStrikerCard.isOut = true;
        nonStrikerCard.isBatting = false;
        nonStrikerCard.onStrike = false;
        nonStrikerCard.dismissal = `${(wicketType || 'out').toLowerCase()}`;
      }
    }

    if (isWicket && newBatsmanId) {
      const newBatDoc = await Player.findById(newBatsmanId);
      if (newBatDoc) {
        match.battingCard.push({
          player: newBatDoc._id,
          playerName: newBatDoc.name,
          team: innings.battingTeam,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
          dismissal: 'not out',
          onStrike: true,
          isBatting: true,
        });
      }
    }

    if (bowlerDoc) {
      let bowlerCard = match.bowlingCard.find((b) => b.player && b.player.toString() === bowlerDoc._id.toString());
      if (!bowlerCard) {
        match.bowlingCard.push({
          player: bowlerDoc._id,
          playerName: bowlerDoc.name,
          team: innings.bowlingTeam,
          overs: 0,
          balls: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          economy: 0,
          isCurrentBowler: true,
        });
        bowlerCard = match.bowlingCard[match.bowlingCard.length - 1];
      }

      if (isLegal) {
        bowlerCard.balls += 1;
        if (bowlerCard.balls >= 6) {
          bowlerCard.overs += 1;
          bowlerCard.balls = 0;
        }
      }
      if (!isBye && !isLegBye) {
        bowlerCard.runsConceded += totalRunsThisBall;
      }
      if (isWicket && wicketType !== 'RUN_OUT') {
        bowlerCard.wickets += 1;
      }
      const totalBowlerOvers = bowlerCard.overs + bowlerCard.balls / 6;
      bowlerCard.economy = totalBowlerOvers > 0 ? Number((bowlerCard.runsConceded / totalBowlerOvers).toFixed(1)) : bowlerCard.runsConceded;
    }

    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;

    if (batRuns % 2 === 1 && strikerId && nonStrikerId) {
      nextStriker = nonStrikerId;
      nextNonStriker = strikerId;
    }

    const isOverComplete = isLegal && innings.balls === 0;
    if (isOverComplete && nextStriker && nextNonStriker) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    const isInnings1Finished =
      currentInnNum === 1 &&
      (innings.overs >= maxOvers || innings.wickets >= maxWickets);

    if (isInnings1Finished) {
      innings.completed = true;
      match.currentInnings = 2;
      const target = innings.runs + 1;
      match.innings2.target = target;
      match.innings2.battingTeam = innings.bowlingTeam;
      match.innings2.bowlingTeam = innings.battingTeam;
    }

    let isMatchComplete = false;
    let winnerTeamId = null;
    let loserTeamId = null;
    let winMargin = '';

    if (currentInnNum === 2) {
      const target = match.innings2.target || match.innings1.runs + 1;
      const chasingRuns = match.innings2.runs;

      if (chasingRuns >= target) {
        isMatchComplete = true;
        winnerTeamId = match.innings2.battingTeam;
        loserTeamId = match.innings2.bowlingTeam;
        const wicketsRemaining = playersPerTeam - 1 - match.innings2.wickets;
        const winTeamDoc = await Team.findById(winnerTeamId);
        winMargin = `${winTeamDoc.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'} 🔥`;
      } else if (match.innings2.overs >= maxOvers || match.innings2.wickets >= maxWickets) {
        match.innings2.completed = true;
        if (chasingRuns === target - 1) {
          match.status = 'TIED';
          winMargin = 'Match Tied! Super Over required ⚔️';
        } else {
          isMatchComplete = true;
          winnerTeamId = match.innings1.battingTeam;
          loserTeamId = match.innings1.bowlingTeam;
          const runDiff = match.innings1.runs - chasingRuns;
          const winTeamDoc = await Team.findById(winnerTeamId);
          winMargin = `${winTeamDoc.name} won by ${runDiff} run${runDiff === 1 ? '' : 's'} 🔥`;
        }
      }
    }

    if (isMatchComplete && winnerTeamId && loserTeamId) {
      match.status = 'COMPLETED';
      match.winner = winnerTeamId;
      match.loser = loserTeamId;
      match.winMargin = winMargin;

      const [winnerTeamDoc, loserTeamDoc] = await Promise.all([
        Team.findById(winnerTeamId),
        Team.findById(loserTeamId),
      ]);

      loserTeamDoc.status = 'ELIMINATED';
      await loserTeamDoc.save();

      if (match.nextMatchId) {
        const nextMatch = await Match.findById(match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === 'teamA') {
            nextMatch.teamA = winnerTeamDoc._id;
            nextMatch.teamAName = winnerTeamDoc.name;
          } else {
            nextMatch.teamB = winnerTeamDoc._id;
            nextMatch.teamBName = winnerTeamDoc.name;
          }
          await nextMatch.save();
        }
      } else {
        winnerTeamDoc.status = 'CHAMPION';
        loserTeamDoc.status = 'RUNNER_UP';
        await winnerTeamDoc.save();
        await loserTeamDoc.save();

        tournament.champion = winnerTeamDoc._id;
        tournament.runnerUp = loserTeamDoc._id;
        tournament.status = 'COMPLETED';
        await tournament.save();
      }
    }

    await match.save();

    return res.status(200).json({
      success: true,
      message: 'Ball recorded successfully',
      match,
      ballSummary,
      isOverComplete,
      nextStriker,
      nextNonStriker,
      isInnings1Finished,
      isMatchComplete,
      winMargin,
    });
  } catch (error) {
    console.error('Error recording ball delivery:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error recording ball delivery' });
  }
}

export async function handleScoreStatus(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const {
      matchId,
      action,
      tossWonBy,
      tossChoice,
      winnerId,
      loserId,
      winMargin,
    } = req.body || {};

    if (!matchId) {
      return res.status(400).json({ success: false, message: 'Match ID is required' });
    }

    const match = await Match.findById(matchId).populate('tournament teamA teamB');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (action === 'TOSS') {
      if (!tossWonBy || !tossChoice) {
        return res.status(400).json({ success: false, message: 'Toss winner and choice (BAT/BOWL) are required' });
      }

      match.toss = { wonBy: tossWonBy, choice: tossChoice };
      match.status = 'LIVE';

      const isTeamA = match.teamA._id.toString() === tossWonBy.toString();
      const battingFirst =
        tossChoice === 'BAT' ? (isTeamA ? match.teamA._id : match.teamB._id) : isTeamA ? match.teamB._id : match.teamA._id;
      const bowlingFirst = battingFirst.toString() === match.teamA._id.toString() ? match.teamB._id : match.teamA._id;

      match.innings1.battingTeam = battingFirst;
      match.innings1.bowlingTeam = bowlingFirst;
      match.currentInnings = 1;

      await match.save();

      return res.status(200).json({
        success: true,
        message: 'Toss recorded. Match is LIVE! 🏏',
        match,
      });
    }

    if (action === 'SWITCH_INNINGS') {
      match.innings1.completed = true;
      match.currentInnings = 2;
      match.innings2.target = (match.innings1.runs || 0) + 1;
      match.innings2.battingTeam = match.innings1.bowlingTeam;
      match.innings2.bowlingTeam = match.innings1.battingTeam;

      await match.save();

      return res.status(200).json({
        success: true,
        message: `Innings 1 closed. Target set to ${match.innings2.target} runs.`,
        match,
      });
    }

    if (action === 'COMPLETE_MATCH') {
      if (!winnerId || !loserId) {
        return res.status(400).json({ success: false, message: 'Winner and Loser team IDs are required' });
      }

      match.status = 'COMPLETED';
      match.winner = winnerId;
      match.loser = loserId;
      if (winMargin) match.winMargin = winMargin;

      const [winnerDoc, loserDoc] = await Promise.all([
        Team.findById(winnerId),
        Team.findById(loserId),
      ]);

      loserDoc.status = 'ELIMINATED';
      await loserDoc.save();

      if (match.nextMatchId) {
        const nextMatch = await Match.findById(match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === 'teamA') {
            nextMatch.teamA = winnerDoc._id;
            nextMatch.teamAName = winnerDoc.name;
          } else {
            nextMatch.teamB = winnerDoc._id;
            nextMatch.teamBName = winnerDoc.name;
          }
          await nextMatch.save();
        }
      } else {
        winnerDoc.status = 'CHAMPION';
        loserDoc.status = 'RUNNER_UP';
        await winnerDoc.save();
        await loserDoc.save();

        const tournament = match.tournament;
        tournament.champion = winnerDoc._id;
        tournament.runnerUp = loserDoc._id;
        tournament.status = 'COMPLETED';
        await tournament.save();
      }

      await match.save();

      return res.status(200).json({
        success: true,
        message: `Match completed! ${winnerDoc.name} advances! 🔥`,
        match,
      });
    }

    if (action === 'NEXT_OVER') {
      const currentInnNum = match.currentInnings || 1;
      const innings = currentInnNum === 1 ? match.innings1 : match.innings2;
      const tournament = match.tournament;
      const maxOvers = tournament?.oversPerMatch || 5;

      innings.overs += 1;
      innings.balls = 0;

      const isInnings1Finished = currentInnNum === 1 && innings.overs >= maxOvers;
      if (isInnings1Finished) {
        match.innings1.completed = true;
        match.currentInnings = 2;
        match.innings2.target = (match.innings1.runs || 0) + 1;
        match.innings2.battingTeam = match.innings1.bowlingTeam;
        match.innings2.bowlingTeam = match.innings1.battingTeam;
      } else if (currentInnNum === 2 && innings.overs >= maxOvers) {
        match.innings2.completed = true;
        match.status = 'COMPLETED';
        const chasingRuns = match.innings2.runs;
        const target = match.innings2.target || (match.innings1.runs || 0) + 1;
        if (chasingRuns >= target) {
          match.winner = match.innings2.battingTeam;
          match.loser = match.innings2.bowlingTeam;
          const winDoc = await Team.findById(match.winner);
          match.winMargin = `${winDoc?.name || 'Batting Team'} won the match! 🔥`;
        } else if (chasingRuns === target - 1) {
          match.status = 'TIED';
          match.winMargin = 'Match Tied! Super Over required ⚔️';
        } else {
          match.winner = match.innings1.battingTeam;
          match.loser = match.innings1.bowlingTeam;
          const winDoc = await Team.findById(match.winner);
          const marginRuns = target - 1 - chasingRuns;
          match.winMargin = `${winDoc?.name || 'Bowling Team'} won by ${marginRuns} run${marginRuns === 1 ? '' : 's'}! 🔥`;
        }
      }

      await match.save();

      return res.status(200).json({
        success: true,
        message: `Over completed. Starting Over ${innings.overs + 1}`,
        match,
      });
    }

    if (action === 'SUPER_OVER') {
      match.isSuperOver = true;
      match.status = 'LIVE';
      match.winMargin = 'Super Over in progress ⚔️';
      await match.save();

      return res.status(200).json({
        success: true,
        message: 'Super Over initiated!',
        match,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid scoring action' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error updating match status' });
  }
}

export async function handleScoreUndo(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { matchId } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ success: false, message: 'Match ID is required' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const lastBall = await BallDelivery.findOne({ match: match._id }).sort({ createdAt: -1 });
    if (!lastBall) {
      return res.status(400).json({ success: false, message: 'No balls to undo in this match' });
    }

    const currentInnNum = lastBall.innings;
    const innings = currentInnNum === 1 ? match.innings1 : match.innings2;

    const totalRunsBall = (lastBall.runsBat || 0) + (lastBall.extraRuns || 0);
    innings.runs = Math.max(0, innings.runs - totalRunsBall);

    if (lastBall.extraType === 'WIDE') {
      innings.extras.wide = Math.max(0, innings.extras.wide - lastBall.extraRuns);
    } else if (lastBall.extraType === 'NO_BALL') {
      innings.extras.noBall = Math.max(0, innings.extras.noBall - lastBall.extraRuns);
    } else if (lastBall.extraType === 'BYE') {
      innings.extras.bye = Math.max(0, innings.extras.bye - lastBall.extraRuns);
    } else if (lastBall.extraType === 'LEG_BYE') {
      innings.extras.legBye = Math.max(0, innings.extras.legBye - lastBall.extraRuns);
    }
    innings.extras.total = Math.max(0, innings.extras.total - lastBall.extraRuns);

    if (lastBall.isLegalDelivery) {
      if (innings.balls === 0 && innings.overs > 0) {
        innings.overs -= 1;
        innings.balls = 5;
      } else {
        innings.balls = Math.max(0, innings.balls - 1);
      }
    }

    if (lastBall.isWicket) {
      innings.wickets = Math.max(0, innings.wickets - 1);
    }

    const strikerCard = lastBall.striker?.id
      ? match.battingCard.find((b) => b.player && b.player.toString() === lastBall.striker.id.toString())
      : null;
    if (strikerCard) {
      strikerCard.runs = Math.max(0, strikerCard.runs - (lastBall.runsBat || 0));
      if (lastBall.extraType !== 'WIDE') {
        strikerCard.balls = Math.max(0, strikerCard.balls - 1);
      }
      if (lastBall.runsBat === 4) strikerCard.fours = Math.max(0, strikerCard.fours - 1);
      if (lastBall.runsBat === 6) strikerCard.sixes = Math.max(0, strikerCard.sixes - 1);
      strikerCard.strikeRate = strikerCard.balls > 0 ? Number(((strikerCard.runs / strikerCard.balls) * 100).toFixed(1)) : 0;

      if (lastBall.isWicket && (!lastBall.playerOut || lastBall.playerOut.id?.toString() === strikerCard.player.toString())) {
        strikerCard.isOut = false;
        strikerCard.dismissal = 'not out';
      }
    }

    const bowlerCard = lastBall.bowler?.id
      ? match.bowlingCard.find((b) => b.player && b.player.toString() === lastBall.bowler.id.toString())
      : null;
    if (bowlerCard) {
      if (lastBall.isLegalDelivery) {
        if (bowlerCard.balls === 0 && bowlerCard.overs > 0) {
          bowlerCard.overs -= 1;
          bowlerCard.balls = 5;
        } else {
          bowlerCard.balls = Math.max(0, bowlerCard.balls - 1);
        }
      }
      if (lastBall.extraType !== 'BYE' && lastBall.extraType !== 'LEG_BYE') {
        bowlerCard.runsConceded = Math.max(0, bowlerCard.runsConceded - totalRunsBall);
      }
      if (lastBall.isWicket && lastBall.wicketType !== 'RUN_OUT') {
        bowlerCard.wickets = Math.max(0, bowlerCard.wickets - 1);
      }
      const totalOvers = bowlerCard.overs + bowlerCard.balls / 6;
      bowlerCard.economy = totalOvers > 0 ? Number((bowlerCard.runsConceded / totalOvers).toFixed(1)) : bowlerCard.runsConceded;
    }

    if (match.status === 'COMPLETED' || match.status === 'TIED') {
      match.status = 'LIVE';
      match.winner = null;
      match.loser = null;
      match.winMargin = '';
    }

    await BallDelivery.findByIdAndDelete(lastBall._id);
    await match.save();

    return res.status(200).json({
      success: true,
      message: 'Last ball successfully undone ↺',
      match,
      undoneBall: lastBall,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error undoing ball delivery' });
  }
}

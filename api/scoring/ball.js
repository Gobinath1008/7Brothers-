import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
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
      strikerId,
      nonStrikerId,
      bowlerId,
      newBatsmanId = null,
    } = req.body || {};

    if (!matchId || !strikerId || !nonStrikerId || !bowlerId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID, Striker, Non-Striker, and Bowler are required.',
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
    const maxWickets = playersPerTeam - 1; // All out when wickets reach (players - 1)

    // Current innings reference
    const currentInnNum = match.currentInnings || 1;
    const innings = currentInnNum === 1 ? match.innings1 : match.innings2;

    // Delivery classifications
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

    // Ball & Over counts
    if (isLegal) {
      innings.balls += 1;
      if (innings.balls >= 6) {
        innings.overs += 1;
        innings.balls = 0;
      }
    }

    // Wicket handling
    let playerOutDoc = null;
    if (isWicket) {
      innings.wickets += 1;
      const targetOutId = playerOutId || strikerId;
      playerOutDoc = await Player.findById(targetOutId);
    }

    // Fetch players
    const [strikerDoc, nonStrikerDoc, bowlerDoc] = await Promise.all([
      Player.findById(strikerId),
      Player.findById(nonStrikerId),
      Player.findById(bowlerId),
    ]);

    // Create delivery summary string (e.g., "1", "4", "6", "W", "1Wd", "Nb+2")
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

    // Save BallDelivery document
    await BallDelivery.create({
      match: match._id,
      innings: currentInnNum,
      overNumber: innings.overs,
      ballInOver: innings.balls,
      striker: { id: strikerDoc._id, name: strikerDoc.name },
      nonStriker: { id: nonStrikerDoc._id, name: nonStrikerDoc.name },
      bowler: { id: bowlerDoc._id, name: bowlerDoc.name },
      runsBat: batRuns,
      extraRuns: extrasTotal,
      extraType,
      isLegalDelivery: isLegal,
      isWicket,
      wicketType: isWicket ? wicketType : 'NONE',
      playerOut: playerOutDoc ? { id: playerOutDoc._id, name: playerOutDoc.name } : null,
      ballSummary,
    });

    // Update Batting Card
    let strikerCard = match.battingCard.find((b) => b.player && b.player.toString() === strikerId.toString());
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

    if (isWicket && (!playerOutId || playerOutId.toString() === strikerId.toString())) {
      strikerCard.isOut = true;
      strikerCard.isBatting = false;
      strikerCard.onStrike = false;
      strikerCard.dismissal = `${wicketType.toLowerCase()} b ${bowlerDoc.name}`;
    }

    // Update Non-Striker card if needed
    let nonStrikerCard = match.battingCard.find((b) => b.player && b.player.toString() === nonStrikerId.toString());
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

    if (isWicket && playerOutId && playerOutId.toString() === nonStrikerId.toString()) {
      nonStrikerCard.isOut = true;
      nonStrikerCard.isBatting = false;
      nonStrikerCard.onStrike = false;
      nonStrikerCard.dismissal = `${wicketType.toLowerCase()}`;
    }

    // Add new batsman if provided
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

    // Update Bowling Card
    let bowlerCard = match.bowlingCard.find((b) => b.player && b.player.toString() === bowlerId.toString());
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
    // Wides, No-Balls and batsman runs count against bowler (byes and leg byes do not count against bowler)
    if (!isBye && !isLegBye) {
      bowlerCard.runsConceded += totalRunsThisBall;
    }
    if (isWicket && wicketType !== 'RUN_OUT') {
      bowlerCard.wickets += 1;
    }
    const totalBowlerOvers = bowlerCard.overs + bowlerCard.balls / 6;
    bowlerCard.economy = totalBowlerOvers > 0 ? Number((bowlerCard.runsConceded / totalBowlerOvers).toFixed(1)) : bowlerCard.runsConceded;

    // Strike Rotation
    // Odd runs on bat rotates strike
    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;

    if (batRuns % 2 === 1) {
      nextStriker = nonStrikerId;
      nextNonStriker = strikerId;
    }

    // Over completion: if legal ball caused over completion (balls === 0 and legal)
    const isOverComplete = isLegal && innings.balls === 0;
    if (isOverComplete) {
      // Ends change at the end of the over
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    // Check Innings End conditions
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

    // Check Innings 2 / Match End conditions
    let isMatchComplete = false;
    let winnerTeamId = null;
    let loserTeamId = null;
    let winMargin = '';

    if (currentInnNum === 2) {
      const target = match.innings2.target || match.innings1.runs + 1;
      const chasingRuns = match.innings2.runs;

      if (chasingRuns >= target) {
        // Team 2 won
        isMatchComplete = true;
        winnerTeamId = match.innings2.battingTeam;
        loserTeamId = match.innings2.bowlingTeam;
        const wicketsRemaining = playersPerTeam - 1 - match.innings2.wickets;
        const winTeamDoc = await Team.findById(winnerTeamId);
        winMargin = `${winTeamDoc.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'} 🔥`;
      } else if (match.innings2.overs >= maxOvers || match.innings2.wickets >= maxWickets) {
        // Innings 2 finished without reaching target
        match.innings2.completed = true;
        if (chasingRuns === target - 1) {
          // Match Tied!
          match.status = 'TIED';
          winMargin = 'Match Tied! Super Over required ⚔️';
        } else {
          // Team 1 won
          isMatchComplete = true;
          winnerTeamId = match.innings1.battingTeam;
          loserTeamId = match.innings1.bowlingTeam;
          const runDiff = match.innings1.runs - chasingRuns;
          const winTeamDoc = await Team.findById(winnerTeamId);
          winMargin = `${winTeamDoc.name} won by ${runDiff} run${runDiff === 1 ? '' : 's'} 🔥`;
        }
      }
    }

    // Process Match Completion & Automatic Knockout Advancement
    if (isMatchComplete && winnerTeamId && loserTeamId) {
      match.status = 'COMPLETED';
      match.winner = winnerTeamId;
      match.loser = loserTeamId;
      match.winMargin = winMargin;

      const [winnerTeamDoc, loserTeamDoc] = await Promise.all([
        Team.findById(winnerTeamId),
        Team.findById(loserTeamId),
      ]);

      // Loser eliminated immediately
      loserTeamDoc.status = 'ELIMINATED';
      await loserTeamDoc.save();

      // Advance winner to next round match if exists
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
        // If no next match, this was the Final!
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

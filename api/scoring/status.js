import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
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
      action, // 'TOSS', 'SWITCH_INNINGS', 'COMPLETE_MATCH', 'SUPER_OVER'
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

      // Knockout bracket advancement
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
        // Tournament Final Champion
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

import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';
import { generateKnockoutTree, linkKnockoutMatches } from '../../lib/bracket.js';

export async function handleMatches(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const { tournamentId, round, status } = req.query || {};

    const filter = {};
    if (tournamentId) filter.tournament = tournamentId;
    if (round) filter.round = Number(round);
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('tournament', 'name venue oversPerMatch status')
      .populate('teamA teamB winner loser')
      .sort({ round: 1, matchNumber: 1 });

    return res.status(200).json({ success: true, count: matches.length, matches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error fetching matches' });
  }
}

export async function handleMatchDetail(req, res, id) {
  await connectToDatabase();

  if (!id) {
    return res.status(400).json({ success: false, message: 'Match ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const match = await Match.findById(id)
        .populate('tournament')
        .populate('teamA teamB winner loser toss.wonBy');

      if (!match) {
        return res.status(404).json({ success: false, message: 'Match not found' });
      }

      let teamAPlayers = [];
      let teamBPlayers = [];

      if (match.teamA) {
        teamAPlayers = await Player.find({ team: match.teamA._id }).sort({ isCaptain: -1, name: 1 });
      }
      if (match.teamB) {
        teamBPlayers = await Player.find({ team: match.teamB._id }).sort({ isCaptain: -1, name: 1 });
      }

      const recentDeliveries = await BallDelivery.find({ match: match._id })
        .sort({ createdAt: -1 })
        .limit(24);

      return res.status(200).json({
        success: true,
        match,
        teamAPlayers,
        teamBPlayers,
        recentDeliveries,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching match' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const { venue, scheduledAt, status, teamA, teamB, teamAName, teamBName } = req.body || {};
      const match = await Match.findById(id);
      if (!match) {
        return res.status(404).json({ success: false, message: 'Match not found' });
      }

      if (venue !== undefined) match.venue = venue;
      if (scheduledAt !== undefined) match.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (status !== undefined) match.status = status;
      if (teamA !== undefined) match.teamA = teamA;
      if (teamB !== undefined) match.teamB = teamB;
      if (teamAName !== undefined) match.teamAName = teamAName;
      if (teamBName !== undefined) match.teamBName = teamBName;

      await match.save();

      return res.status(200).json({
        success: true,
        message: 'Match updated successfully',
        match,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error updating match' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export async function handleMatchesGenerate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { tournamentId, force = false } = req.body || {};

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.status === 'REGISTRATION_OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate fixtures while registration is open. Please close registration and confirm team list first.',
      });
    }

    if (!tournament.finalTeamsConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Admin must confirm the final team list before generating fixtures.',
      });
    }

    const ongoingMatches = await Match.countDocuments({
      tournament: tournament._id,
      status: { $in: ['LIVE', 'COMPLETED'] },
    });

    if (ongoingMatches > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: 'Matches have already started or finished. Cannot regenerate fixtures.',
      });
    }

    const teams = await Team.find({
      tournament: tournament._id,
      status: { $in: ['CONFIRMED', 'REGISTERED'] },
    }).select('_id name');

    if (teams.length < 2) {
      return res.status(400).json({
        success: false,
        message: `At least 2 teams are required to generate knockout fixtures. Currently found: ${teams.length}`,
      });
    }

    await Match.deleteMany({ tournament: tournament._id });

    const { matchesByRound, totalRounds, totalMatches } = generateKnockoutTree(
      teams,
      tournament._id,
      tournament.venue || 'Main Pitch',
      tournament.tournamentDate || new Date()
    );

    const createdMatchesByRound = {};
    const flatMatches = [];

    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    for (const r of rounds) {
      createdMatchesByRound[r] = [];
      for (const m of matchesByRound[r]) {
        const created = await Match.create(m);
        createdMatchesByRound[r].push(created);
        flatMatches.push(created);
      }
    }

    const links = linkKnockoutMatches(createdMatchesByRound);
    for (const link of links) {
      await Match.findByIdAndUpdate(link.matchId, {
        nextMatchId: link.nextMatchId,
        nextMatchSlot: link.nextMatchSlot,
      });
    }

    tournament.fixturesGenerated = true;
    tournament.status = 'FIXTURES_GENERATED';
    await tournament.save();

    const finalMatches = await Match.find({ tournament: tournament._id })
      .populate('teamA teamB winner loser')
      .sort({ round: 1, matchNumber: 1 });

    return res.status(200).json({
      success: true,
      message: `Successfully generated ${totalMatches} knockout matches across ${totalRounds} rounds! 🏏`,
      totalRounds,
      totalMatches,
      matches: finalMatches,
    });
  } catch (error) {
    console.error('Fixture generation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error generating fixtures' });
  }
}

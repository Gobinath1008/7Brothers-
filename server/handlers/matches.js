import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';
import { generateKnockoutTree, linkKnockoutMatches } from '../../lib/bracket.js';

export async function handleMatches(req, res) {
  await connectToDatabase();

  if (req.method === 'GET') {
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

  // POST: Manually create a single match fixture
  if (req.method === 'POST') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const {
        tournamentId,
        round = 1,
        roundName = 'Round 1',
        teamA,
        teamB,
        venue,
        scheduledAt,
      } = req.body || {};

      if (!tournamentId) {
        return res.status(400).json({ success: false, message: 'Tournament ID is required' });
      }

      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      let teamADoc = null;
      let teamBDoc = null;
      if (teamA) teamADoc = await Team.findById(teamA);
      if (teamB) teamBDoc = await Team.findById(teamB);

      const count = await Match.countDocuments({ tournament: tournament._id });
      const matchNumber = count + 1;

      const match = await Match.create({
        tournament: tournament._id,
        matchNumber,
        round: Number(round),
        roundName,
        teamA: teamADoc?._id || null,
        teamAName: teamADoc?.name || 'TBD',
        teamB: teamBDoc?._id || null,
        teamBName: teamBDoc?.name || 'TBD',
        venue: venue || tournament.venue || 'Main Pitch',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'UPCOMING',
      });

      return res.status(201).json({
        success: true,
        message: 'Match created successfully',
        match,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error creating match' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
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

      const allDeliveries = await BallDelivery.find({ match: match._id })
        .sort({ createdAt: 1 });

      const recentDeliveries = [...allDeliveries].reverse().slice(0, 30);

      return res.status(200).json({
        success: true,
        match,
        teamAPlayers,
        teamBPlayers,
        recentDeliveries,
        allDeliveries,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching match' });
    }
  }

  // PUT: Update match (Manual Team Fixing, Time, Venue, Status)
  if (req.method === 'PUT') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const { venue, scheduledAt, status, teamA, teamB, teamAName, teamBName, roundName } = req.body || {};
      const match = await Match.findById(id);
      if (!match) {
        return res.status(404).json({ success: false, message: 'Match not found' });
      }

      if (venue !== undefined) match.venue = venue;
      if (scheduledAt !== undefined) match.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (status !== undefined) match.status = status;
      if (roundName !== undefined) match.roundName = roundName;

      // Handle Manual Team Assignment
      if (teamA !== undefined) {
        match.teamA = teamA || null;
        if (teamA) {
          const tADoc = await Team.findById(teamA);
          match.teamAName = tADoc ? tADoc.name : teamAName || 'TBD';
        } else {
          match.teamAName = teamAName || 'TBD';
        }
      } else if (teamAName !== undefined) {
        match.teamAName = teamAName;
      }

      if (teamB !== undefined) {
        match.teamB = teamB || null;
        if (teamB) {
          const tBDoc = await Team.findById(teamB);
          match.teamBName = tBDoc ? tBDoc.name : teamBName || 'TBD';
        } else {
          match.teamBName = teamBName || 'TBD';
        }
      } else if (teamBName !== undefined) {
        match.teamBName = teamBName;
      }

      await match.save();

      const updatedMatch = await Match.findById(id)
        .populate('tournament')
        .populate('teamA teamB winner loser');

      return res.status(200).json({
        success: true,
        message: 'Match fixture updated successfully 🔥',
        match: updatedMatch,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error updating match' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// Generate Fixtures: Supports both AUTOMATIC (random) and MANUAL (custom pairings)
export async function handleMatchesGenerate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const {
      tournamentId,
      force = false,
      mode = 'AUTOMATIC', // 'AUTOMATIC' or 'MANUAL'
      customPairs = [], // Array of { teamAId, teamBId }
    } = req.body || {};

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
        message: 'Matches have already started or finished. Cannot regenerate fixtures without force reset.',
      });
    }

    const allTeams = await Team.find({
      tournament: tournament._id,
      status: { $in: ['CONFIRMED', 'REGISTERED'] },
    }).select('_id name');

    if (allTeams.length < 2) {
      return res.status(400).json({
        success: false,
        message: `At least 2 teams are required to generate knockout fixtures. Currently found: ${allTeams.length}`,
      });
    }

    let orderedTeams = [];
    const isManual = mode === 'MANUAL' && Array.isArray(customPairs) && customPairs.length > 0;

    if (isManual) {
      const teamMap = new Map();
      allTeams.forEach((t) => teamMap.set(t._id.toString(), t));
      const usedTeamIds = new Set();

      for (const pair of customPairs) {
        if (pair.teamAId && teamMap.has(pair.teamAId)) {
          orderedTeams.push(teamMap.get(pair.teamAId));
          usedTeamIds.add(pair.teamAId);
        }
        if (pair.teamBId && teamMap.has(pair.teamBId)) {
          orderedTeams.push(teamMap.get(pair.teamBId));
          usedTeamIds.add(pair.teamBId);
        }
      }

      // Append any remaining confirmed teams not included in manual pairs
      allTeams.forEach((t) => {
        if (!usedTeamIds.has(t._id.toString())) {
          orderedTeams.push(t);
        }
      });
    } else {
      orderedTeams = allTeams;
    }

    // Clean existing upcoming fixtures
    await Match.deleteMany({ tournament: tournament._id });

    // Generate Knockout Tree structure (shuffle = false when manual pairs are chosen)
    const { matchesByRound, totalRounds, totalMatches } = generateKnockoutTree(
      orderedTeams,
      tournament._id,
      tournament.venue || 'Main Pitch',
      tournament.tournamentDate || new Date(),
      !isManual // shuffle = true for automatic, false for manual
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
      message: isManual
        ? `Manual fixtures setup complete! Generated ${totalMatches} knockout matches across ${totalRounds} rounds. 🏏`
        : `Successfully auto-generated ${totalMatches} knockout matches across ${totalRounds} rounds! 🏏`,
      totalRounds,
      totalMatches,
      matches: finalMatches,
      mode: isManual ? 'MANUAL' : 'AUTOMATIC',
    });
  } catch (error) {
    console.error('Fixture generation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error generating fixtures' });
  }
}

import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import { authenticateAdmin } from '../../lib/auth.js';
import { generateKnockoutTree, linkKnockoutMatches } from '../../lib/bracket.js';

export default async function handler(req, res) {
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

    // Rule: Never generate fixtures while registration is open
    if (tournament.status === 'REGISTRATION_OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate fixtures while registration is open. Please close registration and confirm team list first.',
      });
    }

    // Rule: Admin must confirm the final team list before generating fixtures
    if (!tournament.finalTeamsConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Admin must confirm the final team list before generating fixtures.',
      });
    }

    // Check if matches have already started
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

    // Fetch confirmed teams only
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

    // Clean existing upcoming fixtures if regenerating
    await Match.deleteMany({ tournament: tournament._id });

    // Generate Knockout Tree structure
    const { matchesByRound, totalRounds, totalMatches } = generateKnockoutTree(
      teams,
      tournament._id,
      tournament.venue || 'Main Pitch',
      tournament.tournamentDate || new Date()
    );

    // Save matches round by round to get actual MongoDB _ids
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

    // Link nextMatchId and nextMatchSlot
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

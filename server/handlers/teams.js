import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import { authenticateAdmin } from '../../lib/auth.js';

export async function handleTeamsConfirm(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { tournamentId, confirmedTeamIds } = req.body || {};

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.status === 'REGISTRATION_OPEN') {
      tournament.status = 'REGISTRATION_CLOSED';
    }

    let teamFilter = { tournament: tournament._id };
    if (Array.isArray(confirmedTeamIds) && confirmedTeamIds.length > 0) {
      teamFilter._id = { $in: confirmedTeamIds };
    }

    await Team.updateMany(teamFilter, { status: 'CONFIRMED' });

    tournament.finalTeamsConfirmed = true;
    await tournament.save();

    const confirmedCount = await Team.countDocuments({ tournament: tournament._id, status: 'CONFIRMED' });

    return res.status(200).json({
      success: true,
      message: `Final team list confirmed with ${confirmedCount} teams. You can now generate knockout fixtures.`,
      confirmedCount,
      tournament,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error confirming team list' });
  }
}

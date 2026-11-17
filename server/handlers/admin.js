import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Tournament from '../../models/Tournament.js';
import { authenticateAdmin } from '../../lib/auth.js';

export async function handleAdminResetData(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { action, tournamentId, deleteTournaments = false } = req.body || {};

    // 1. DELETE MATCHES ONLY (All scorecards & fixtures)
    if (action === 'DELETE_MATCHES') {
      const matchFilter = tournamentId ? { tournament: tournamentId } : {};
      const matches = await Match.find(matchFilter).select('_id');
      const matchIds = matches.map((m) => m._id);

      const delBalls = await BallDelivery.deleteMany({ match: { $in: matchIds } });
      const delMatches = await Match.deleteMany(matchFilter);

      if (tournamentId) {
        await Tournament.findByIdAndUpdate(tournamentId, {
          $unset: { champion: 1, runnerUp: 1 },
        });
      } else {
        await Tournament.updateMany({}, {
          $unset: { champion: 1, runnerUp: 1 },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${delMatches.deletedCount} match fixtures and ${delBalls.deletedCount} ball deliveries.`,
      });
    }

    // 2. DELETE TEAMS ONLY (All registered teams, squads, and their fixtures)
    if (action === 'DELETE_TEAMS') {
      const teamFilter = tournamentId ? { tournament: tournamentId } : {};
      const teams = await Team.find(teamFilter).select('_id');
      const teamIds = teams.map((t) => t._id);

      const delPlayers = await Player.deleteMany({ team: { $in: teamIds } });
      const delTeams = await Team.deleteMany(teamFilter);

      // Cascading: Remove all matches & deliveries for these teams/tournament
      const matchFilter = tournamentId ? { tournament: tournamentId } : {};
      const matches = await Match.find(matchFilter).select('_id');
      const matchIds = matches.map((m) => m._id);

      await BallDelivery.deleteMany({ match: { $in: matchIds } });
      await Match.deleteMany(matchFilter);

      if (tournamentId) {
        await Tournament.findByIdAndUpdate(tournamentId, {
          $unset: { champion: 1, runnerUp: 1 },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${delTeams.deletedCount} teams, ${delPlayers.deletedCount} squad players, and related fixtures.`,
      });
    }

    // 3. WIPE ALL DATA (Matches, Deliveries, Teams, Players, and optionally Tournaments)
    if (action === 'WIPE_ALL') {
      const delBalls = await BallDelivery.deleteMany({});
      const delMatches = await Match.deleteMany({});
      const delPlayers = await Player.deleteMany({});
      const delTeams = await Team.deleteMany({});

      let delTournamentsCount = 0;
      if (deleteTournaments) {
        const delTourneys = await Tournament.deleteMany({});
        delTournamentsCount = delTourneys.deletedCount;
      } else {
        await Tournament.updateMany({}, {
          $unset: { champion: 1, runnerUp: 1 },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Complete reset successful: Cleared ${delMatches.deletedCount} matches, ${delBalls.deletedCount} balls, ${delTeams.deletedCount} teams, ${delPlayers.deletedCount} players${
          deleteTournaments ? `, and ${delTournamentsCount} tournaments` : ''
        }. Admin account preserved.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action. Expected DELETE_MATCHES, DELETE_TEAMS, or WIPE_ALL.',
    });
  } catch (error) {
    console.error('Error in handleAdminResetData:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error executing data reset',
    });
  }
}

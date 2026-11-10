import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  await connectToDatabase();

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Tournament identifier is required' });
  }

  // Find by ID or Slug
  const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const query = isObjectId ? { _id: id } : { slug: id };

  if (req.method === 'GET') {
    try {
      const tournament = await Tournament.findOne(query).populate('champion runnerUp');
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      // Check deadline on every request
      const now = new Date();
      if (tournament.status === 'REGISTRATION_OPEN' && new Date(tournament.regDeadline) < now) {
        tournament.status = 'REGISTRATION_CLOSED';
        await tournament.save();
      }

      const registeredTeamsCount = await Team.countDocuments({ tournament: tournament._id });
      const matchesCount = await Match.countDocuments({ tournament: tournament._id });
      const liveMatchesCount = await Match.countDocuments({ tournament: tournament._id, status: 'LIVE' });

      return res.status(200).json({
        success: true,
        tournament: {
          ...tournament.toObject(),
          registeredTeamsCount,
          matchesCount,
          liveMatchesCount,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching tournament' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const tournament = await Tournament.findOne(query);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      const {
        name,
        tournamentDate,
        regDeadline,
        venue,
        playersPerTeam,
        oversPerMatch,
        maxTeams,
        description,
        status,
        finalTeamsConfirmed,
      } = req.body || {};

      if (name) tournament.name = name;
      if (tournamentDate) tournament.tournamentDate = new Date(tournamentDate);
      if (regDeadline) tournament.regDeadline = new Date(regDeadline);
      if (venue) tournament.venue = venue;
      if (playersPerTeam !== undefined) tournament.playersPerTeam = Number(playersPerTeam);
      if (oversPerMatch !== undefined) tournament.oversPerMatch = Number(oversPerMatch);
      if (maxTeams !== undefined) tournament.maxTeams = Number(maxTeams);
      if (description !== undefined) tournament.description = description;
      if (status) tournament.status = status;
      if (finalTeamsConfirmed !== undefined) tournament.finalTeamsConfirmed = Boolean(finalTeamsConfirmed);

      await tournament.save();

      return res.status(200).json({
        success: true,
        message: 'Tournament updated successfully',
        tournament,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error updating tournament' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const tournament = await Tournament.findOne(query);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      const tId = tournament._id;
      // Cascade delete all related data
      await Team.deleteMany({ tournament: tId });
      await Player.deleteMany({ tournament: tId });
      const matches = await Match.find({ tournament: tId });
      const matchIds = matches.map((m) => m._id);
      await BallDelivery.deleteMany({ match: { $in: matchIds } });
      await Match.deleteMany({ tournament: tId });
      await Tournament.findByIdAndDelete(tId);

      return res.status(200).json({
        success: true,
        message: 'Tournament and all associated records deleted successfully',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error deleting tournament' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

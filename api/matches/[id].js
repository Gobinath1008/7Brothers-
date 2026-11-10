import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import Player from '../../models/Player.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  await connectToDatabase();

  const { id } = req.query;
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

      // Fetch team players for scoring lineups
      let teamAPlayers = [];
      let teamBPlayers = [];

      if (match.teamA) {
        teamAPlayers = await Player.find({ team: match.teamA._id }).sort({ isCaptain: -1, name: 1 });
      }
      if (match.teamB) {
        teamBPlayers = await Player.find({ team: match.teamB._id }).sort({ isCaptain: -1, name: 1 });
      }

      // Fetch recent 24 deliveries
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

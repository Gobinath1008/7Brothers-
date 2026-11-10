import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      // Auto-update any tournaments whose registration deadline has passed
      const now = new Date();
      await Tournament.updateMany(
        {
          status: 'REGISTRATION_OPEN',
          regDeadline: { $lt: now },
        },
        { status: 'REGISTRATION_CLOSED' }
      );

      const tournaments = await Tournament.find().sort({ createdAt: -1 }).populate('champion runnerUp');

      // Add team and match counts to each tournament
      const enhancedTournaments = await Promise.all(
        tournaments.map(async (t) => {
          const registeredTeamsCount = await Team.countDocuments({ tournament: t._id });
          const matchesCount = await Match.countDocuments({ tournament: t._id });
          const liveMatchesCount = await Match.countDocuments({ tournament: t._id, status: 'LIVE' });

          return {
            ...t.toObject(),
            registeredTeamsCount,
            matchesCount,
            liveMatchesCount,
          };
        })
      );

      return res.status(200).json({ success: true, tournaments: enhancedTournaments });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching tournaments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const {
        name,
        tournamentDate,
        regDeadline,
        venue,
        playersPerTeam = 7,
        oversPerMatch = 5,
        format = 'Knockout',
        maxTeams = 16,
        matchDuration = 45,
        description = '',
      } = req.body || {};

      if (!name || !tournamentDate || !regDeadline || !venue) {
        return res.status(400).json({
          success: false,
          message: 'Please provide Tournament Name, Date, Registration Deadline, and Venue.',
        });
      }

      // Validate dates
      const parsedRegDeadline = new Date(regDeadline);
      if (isNaN(parsedRegDeadline.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid registration closing date & time' });
      }

      const tournament = await Tournament.create({
        name,
        tournamentDate: new Date(tournamentDate),
        regDeadline: parsedRegDeadline,
        venue,
        playersPerTeam: Number(playersPerTeam),
        oversPerMatch: Number(oversPerMatch),
        format,
        maxTeams: Number(maxTeams),
        matchDuration: Number(matchDuration),
        description,
        status: 'REGISTRATION_OPEN',
      });

      return res.status(201).json({
        success: true,
        message: 'Tournament created successfully',
        tournament,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error creating tournament' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

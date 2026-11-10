import connectToDatabase from '../../lib/db.js';
import Tournament, { generateTournamentSlug } from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export async function handleTournaments(req, res) {
  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const now = new Date();
      await Tournament.updateMany(
        {
          status: 'REGISTRATION_OPEN',
          regDeadline: { $lt: now },
        },
        { status: 'REGISTRATION_CLOSED' }
      );

      const tournaments = await Tournament.find().sort({ createdAt: -1 }).populate('champion runnerUp');

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
        locationUrl = '',
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

      const parsedTournamentDate = new Date(tournamentDate);
      const parsedRegDeadline = new Date(regDeadline);

      if (isNaN(parsedTournamentDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid tournament date' });
      }

      if (isNaN(parsedRegDeadline.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid registration closing date & time' });
      }

      if (parsedRegDeadline >= parsedTournamentDate) {
        return res.status(400).json({
          success: false,
          message: 'Registration deadline must be before the tournament date and time.',
        });
      }

      const slug = generateTournamentSlug(name);

      const tournament = await Tournament.create({
        name: name.trim(),
        slug,
        tournamentDate: parsedTournamentDate,
        regDeadline: parsedRegDeadline,
        venue: venue.trim(),
        locationUrl: locationUrl.trim(),
        playersPerTeam: Number(playersPerTeam),
        oversPerMatch: Number(oversPerMatch),
        format,
        maxTeams: Number(maxTeams),
        matchDuration: Number(matchDuration),
        description: description ? description.trim() : '',
        status: 'REGISTRATION_OPEN',
      });

      return res.status(201).json({
        success: true,
        message: 'Tournament created successfully! 🔥',
        tournament,
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error creating tournament' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export async function handleTournamentDetail(req, res, id) {
  await connectToDatabase();

  if (!id) {
    return res.status(400).json({ success: false, message: 'Tournament identifier is required' });
  }

  const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const query = isObjectId ? { _id: id } : { slug: id };

  if (req.method === 'GET') {
    try {
      const tournament = await Tournament.findOne(query).populate('champion runnerUp');
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

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
        locationUrl,
        playersPerTeam,
        oversPerMatch,
        maxTeams,
        description,
        status,
        finalTeamsConfirmed,
      } = req.body || {};

      const newDate = tournamentDate ? new Date(tournamentDate) : tournament.tournamentDate;
      const newDeadline = regDeadline ? new Date(regDeadline) : tournament.regDeadline;

      if (newDeadline >= newDate) {
        return res.status(400).json({
          success: false,
          message: 'Registration deadline must be before the tournament date and time.',
        });
      }

      if (name) tournament.name = name;
      if (tournamentDate) tournament.tournamentDate = newDate;
      if (regDeadline) tournament.regDeadline = newDeadline;
      if (venue) tournament.venue = venue;
      if (locationUrl !== undefined) tournament.locationUrl = locationUrl.trim();
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

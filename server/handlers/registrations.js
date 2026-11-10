import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import { authenticateAdmin } from '../../lib/auth.js';

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

export async function handleRegistrations(req, res) {
  await connectToDatabase();

  // POST: Public Guest Team Registration (Only Team Name, Captain Name, Primary Mobile, Secondary Mobile)
  if (req.method === 'POST') {
    try {
      const {
        tournamentId,
        teamName,
        captainName,
        captainPhone,
        secondaryPhone = '',
        logo = '',
      } = req.body || {};

      if (!tournamentId || !teamName || !captainName || !captainPhone || !secondaryPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please provide Team Name, Captain Name, Primary Mobile Number, and Secondary Mobile Number.',
        });
      }

      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      const now = new Date();
      if (tournament.status !== 'REGISTRATION_OPEN' || new Date(tournament.regDeadline) < now) {
        if (tournament.status === 'REGISTRATION_OPEN') {
          tournament.status = 'REGISTRATION_CLOSED';
          await tournament.save();
        }
        return res.status(400).json({
          success: false,
          message: 'Registration for this tournament has closed.',
        });
      }

      const currentCount = await Team.countDocuments({ tournament: tournament._id });
      if (currentCount >= tournament.maxTeams) {
        return res.status(400).json({
          success: false,
          message: `Tournament has reached the maximum allowed limit of ${tournament.maxTeams} teams.`,
        });
      }

      const normalizedTeamName = teamName.trim().toLowerCase();
      const normalizedCaptainPhone = normalizePhone(captainPhone);
      const normalizedSecondaryPhone = normalizePhone(secondaryPhone);

      if (normalizedCaptainPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit primary mobile number for Captain.',
        });
      }

      if (normalizedSecondaryPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit secondary / alternate mobile number.',
        });
      }

      if (normalizedCaptainPhone === normalizedSecondaryPhone) {
        return res.status(400).json({
          success: false,
          message: 'Primary and secondary mobile numbers must be different.',
        });
      }

      const existingTeamName = await Team.findOne({
        tournament: tournament._id,
        normalizedName: normalizedTeamName,
      });
      if (existingTeamName) {
        return res.status(400).json({
          success: false,
          message: 'This team name is already registered. Please choose another name.',
        });
      }

      const existingPhone = await Team.findOne({
        tournament: tournament._id,
        $or: [
          { captainPhone: normalizedCaptainPhone },
          { secondaryPhone: normalizedCaptainPhone },
          { captainPhone: normalizedSecondaryPhone },
          { secondaryPhone: normalizedSecondaryPhone },
        ],
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'One of these mobile numbers is already registered for another team in this tournament.',
        });
      }

      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `REG-${Date.now().toString().slice(-6)}-${randomPart}`;

      const team = await Team.create({
        tournament: tournament._id,
        name: teamName.trim(),
        normalizedName: normalizedTeamName,
        captainName: captainName.trim(),
        captainPhone: normalizedCaptainPhone,
        secondaryPhone: normalizedSecondaryPhone,
        logo: logo.trim(),
        registrationId,
        status: 'REGISTERED',
      });

      // Auto-create Player squad entries with Captain as Player 1
      const requiredPlayers = tournament.playersPerTeam || 7;
      const playerDocs = [
        {
          tournament: tournament._id,
          team: team._id,
          name: captainName.trim(),
          phone: normalizedCaptainPhone,
          isCaptain: true,
        },
      ];

      for (let i = 2; i <= requiredPlayers; i++) {
        playerDocs.push({
          tournament: tournament._id,
          team: team._id,
          name: `${teamName.trim()} Player ${i}`,
          phone: '',
          isCaptain: false,
        });
      }

      await Player.insertMany(playerDocs);

      return res.status(201).json({
        success: true,
        message: 'Team registered successfully! 🔥',
        registrationId: team.registrationId,
        team: {
          id: team._id,
          name: team.name,
          captainName: team.captainName,
          captainPhone: team.captainPhone,
          secondaryPhone: team.secondaryPhone,
          registrationId: team.registrationId,
          tournamentName: tournament.name,
          playerCount: playerDocs.length,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Team name or mobile number is already registered in this tournament.',
        });
      }
      return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  // GET: Admin List Registrations (Protected)
  if (req.method === 'GET') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const { tournamentId, search } = req.query || {};

      const filter = {};
      if (tournamentId) {
        filter.tournament = tournamentId;
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { name: searchRegex },
          { captainName: searchRegex },
          { captainPhone: searchRegex },
          { secondaryPhone: searchRegex },
        ];
      }

      const teams = await Team.find(filter)
        .populate('tournament', 'name tournamentDate venue status regDeadline')
        .sort({ createdAt: -1 });

      const registrations = await Promise.all(
        teams.map(async (team) => {
          const players = await Player.find({ team: team._id }).sort({ isCaptain: -1, createdAt: 1 });
          return {
            ...team.toObject(),
            players,
          };
        })
      );

      return res.status(200).json({ success: true, count: registrations.length, registrations });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching registrations' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export async function handleRegistrationDetail(req, res, id) {
  await connectToDatabase();

  const adminUser = await authenticateAdmin(req, res);
  if (!adminUser) return;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Registration ID is required' });
  }

  const query = id.startsWith('REG-') ? { registrationId: id } : { _id: id };

  if (req.method === 'GET') {
    try {
      const team = await Team.findOne(query).populate('tournament');
      if (!team) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }

      const players = await Player.find({ team: team._id }).sort({ isCaptain: -1 });

      return res.status(200).json({
        success: true,
        registration: {
          ...team.toObject(),
          players,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error fetching registration' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, captainName, captainPhone, secondaryPhone, status, players } = req.body || {};
      const team = await Team.findOne(query);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }

      if (name) {
        team.name = name.trim();
        team.normalizedName = name.trim().toLowerCase();
      }
      if (captainName) team.captainName = captainName.trim();
      if (captainPhone) team.captainPhone = captainPhone.trim();
      if (secondaryPhone !== undefined) team.secondaryPhone = secondaryPhone.trim();
      if (status) team.status = status;

      await team.save();

      // If admin updated player names
      if (Array.isArray(players) && players.length > 0) {
        for (const p of players) {
          if (p._id && p.name) {
            await Player.findByIdAndUpdate(p._id, { name: p.name.trim(), phone: p.phone || '' });
          }
        }
      }

      const updatedPlayers = await Player.find({ team: team._id }).sort({ isCaptain: -1 });

      return res.status(200).json({
        success: true,
        message: 'Registration updated successfully',
        team: {
          ...team.toObject(),
          players: updatedPlayers,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error updating registration' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const team = await Team.findOne(query);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }

      await Player.deleteMany({ team: team._id });
      await Team.findByIdAndDelete(team._id);

      return res.status(200).json({
        success: true,
        message: 'Registration deleted successfully',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Error deleting registration' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

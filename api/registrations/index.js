import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import { authenticateAdmin } from '../../lib/auth.js';

// Normalize phone numbers (strips country codes like +91 if 12/13 digits, removes non-digits)
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

export default async function handler(req, res) {
  await connectToDatabase();

  // POST: Public Guest Team Registration
  if (req.method === 'POST') {
    try {
      const {
        tournamentId,
        teamName,
        captainName,
        captainPhone,
        logo = '',
        players = [],
      } = req.body || {};

      if (!tournamentId || !teamName || !captainName || !captainPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please provide Tournament, Team Name, Captain Name, and Captain Mobile Number.',
        });
      }

      // 1. Fetch Tournament & Verify Registration Status & Deadline
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

      // Check max teams limit
      const currentCount = await Team.countDocuments({ tournament: tournament._id });
      if (currentCount >= tournament.maxTeams) {
        return res.status(400).json({
          success: false,
          message: `Tournament has reached the maximum allowed limit of ${tournament.maxTeams} teams.`,
        });
      }

      // 2. Validate Player count
      const requiredPlayers = tournament.playersPerTeam || 7;
      if (!Array.isArray(players) || players.length !== requiredPlayers) {
        return res.status(400).json({
          success: false,
          message: `Exactly ${requiredPlayers} players are required for this tournament.`,
        });
      }

      const normalizedTeamName = teamName.trim().toLowerCase();
      const normalizedCaptainPhone = normalizePhone(captainPhone);

      if (normalizedCaptainPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit mobile number for Captain.',
        });
      }

      // 3. Duplicate checks within this tournament
      // Check duplicate Team Name
      const existingTeamName = await Team.findOne({
        tournament: tournament._id,
        normalizedName: normalizedTeamName,
      });
      if (existingTeamName) {
        return res.status(400).json({
          success: false,
          message: 'This team name is already registered. Please use another team name.',
        });
      }

      // Check duplicate Captain Phone
      const existingCaptain = await Team.findOne({
        tournament: tournament._id,
        captainPhone: normalizedCaptainPhone,
      });
      if (existingCaptain) {
        return res.status(400).json({
          success: false,
          message: 'This mobile number is already registered in this tournament.',
        });
      }

      // 4. Validate Players and check for duplicate phone numbers
      const normalizedPlayerPhones = new Set();
      const playersToCreate = [];

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (!p.name || !p.phone) {
          return res.status(400).json({
            success: false,
            message: `Player #${i + 1} name and mobile number are required.`,
          });
        }

        const pPhone = normalizePhone(p.phone);
        if (pPhone.length < 10) {
          return res.status(400).json({
            success: false,
            message: `Player #${i + 1} (${p.name}) has an invalid 10-digit mobile number.`,
          });
        }

        // Check duplicates within the same submission
        if (normalizedPlayerPhones.has(pPhone)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate phone number (${pPhone}) found within your team player list.`,
          });
        }
        normalizedPlayerPhones.add(pPhone);

        // Check if player is already registered in any team for this tournament
        const existingPlayer = await Player.findOne({
          tournament: tournament._id,
          phone: pPhone,
        });

        if (existingPlayer) {
          return res.status(400).json({
            success: false,
            message: `This mobile number is already registered in this tournament. (${pPhone} - ${p.name})`,
          });
        }

        playersToCreate.push({
          name: p.name.trim(),
          phone: pPhone,
          isCaptain: p.isCaptain || pPhone === normalizedCaptainPhone,
        });
      }

      // 5. Generate unique Registration ID
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `REG-${Date.now().toString().slice(-6)}-${randomPart}`;

      // 6. Save Team
      const team = await Team.create({
        tournament: tournament._id,
        name: teamName.trim(),
        normalizedName: normalizedTeamName,
        captainName: captainName.trim(),
        captainPhone: normalizedCaptainPhone,
        logo: logo.trim(),
        registrationId,
        status: 'REGISTERED',
      });

      // 7. Save Players associated with team
      const playerDocs = playersToCreate.map((p) => ({
        tournament: tournament._id,
        team: team._id,
        name: p.name,
        phone: p.phone,
        isCaptain: p.isCaptain,
      }));

      await Player.insertMany(playerDocs);

      return res.status(201).json({
        success: true,
        message: 'Team registered successfully! 🔥',
        registrationId: team.registrationId,
        team: {
          id: team._id,
          name: team.name,
          captainName: team.captainName,
          registrationId: team.registrationId,
          tournamentName: tournament.name,
          playerCount: playerDocs.length,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      // Catch MongoDB unique index violations
      if (error.code === 11000) {
        if (error.keyPattern?.normalizedName) {
          return res.status(400).json({
            success: false,
            message: 'This team name is already registered. Please use another team name.',
          });
        }
        if (error.keyPattern?.captainPhone || error.keyPattern?.phone) {
          return res.status(400).json({
            success: false,
            message: 'This mobile number is already registered in this tournament.',
          });
        }
      }
      return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  // GET: Admin List Registrations (Protected)
  if (req.method === 'GET') {
    try {
      const adminUser = await authenticateAdmin(req, res);
      if (!adminUser) return;

      const { tournamentId, search } = req.query;

      const filter = {};
      if (tournamentId) {
        filter.tournament = tournamentId;
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [{ name: searchRegex }, { captainName: searchRegex }, { captainPhone: searchRegex }];
      }

      const teams = await Team.find(filter)
        .populate('tournament', 'name tournamentDate venue status regDeadline')
        .sort({ createdAt: -1 });

      // Attach players to each team
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

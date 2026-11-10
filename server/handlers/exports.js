import connectToDatabase from '../../lib/db.js';
import Tournament from '../../models/Tournament.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import Match from '../../models/Match.js';
import { authenticateAdmin } from '../../lib/auth.js';

export async function handleExportsData(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { tournamentId, type = 'registrations' } = req.query || {};

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required' });
    }

    const tournament = await Tournament.findById(tournamentId).populate('champion runnerUp');
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (type === 'registrations') {
      const teams = await Team.find({ tournament: tournament._id }).sort({ createdAt: 1 });
      const fullTeams = await Promise.all(
        teams.map(async (t) => {
          const players = await Player.find({ team: t._id }).sort({ isCaptain: -1, name: 1 });
          return {
            registrationId: t.registrationId,
            teamName: t.name,
            captainName: t.captainName,
            captainPhone: t.captainPhone,
            status: t.status,
            createdAt: t.createdAt,
            playerCount: players.length,
            players: players.map((p) => ({
              name: p.name,
              phone: p.phone,
              isCaptain: p.isCaptain,
            })),
          };
        })
      );

      const totalPlayers = fullTeams.reduce((acc, t) => acc + t.playerCount, 0);

      return res.status(200).json({
        success: true,
        tournament: {
          id: tournament._id,
          name: tournament.name,
          tournamentDate: tournament.tournamentDate,
          venue: tournament.venue,
          playersPerTeam: tournament.playersPerTeam,
          oversPerMatch: tournament.oversPerMatch,
          status: tournament.status,
        },
        stats: {
          totalTeams: fullTeams.length,
          totalPlayers,
          generatedAt: new Date().toISOString(),
        },
        registrations: fullTeams,
      });
    }

    if (type === 'fixtures') {
      const matches = await Match.find({ tournament: tournament._id })
        .populate('teamA teamB winner loser')
        .sort({ round: 1, matchNumber: 1 });

      const formattedMatches = matches.map((m) => ({
        matchNumber: m.matchNumber,
        round: m.round,
        roundName: m.roundName,
        teamA: m.teamA ? m.teamA.name : m.teamAName,
        teamB: m.teamB ? m.teamB.name : m.teamBName,
        venue: m.venue || tournament.venue,
        scheduledAt: m.scheduledAt,
        status: m.status,
        winner: m.winner ? m.winner.name : (m.status === 'COMPLETED' ? 'Winner' : '-'),
        winMargin: m.winMargin || '-',
        innings1Score: m.innings1 ? `${m.innings1.runs}/${m.innings1.wickets} (${m.innings1.overs}.${m.innings1.balls} ov)` : '-',
        innings2Score: m.innings2 ? `${m.innings2.runs}/${m.innings2.wickets} (${m.innings2.overs}.${m.innings2.balls} ov)` : '-',
      }));

      return res.status(200).json({
        success: true,
        tournament: {
          id: tournament._id,
          name: tournament.name,
          tournamentDate: tournament.tournamentDate,
          venue: tournament.venue,
          status: tournament.status,
          champion: tournament.champion ? tournament.champion.name : null,
          runnerUp: tournament.runnerUp ? tournament.runnerUp.name : null,
        },
        stats: {
          totalMatches: formattedMatches.length,
          completedMatches: formattedMatches.filter((m) => m.status === 'COMPLETED').length,
          generatedAt: new Date().toISOString(),
        },
        fixtures: formattedMatches,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid export type' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Export error' });
  }
}

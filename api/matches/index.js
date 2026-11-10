import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import Tournament from '../../models/Tournament.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const { tournamentId, round, status } = req.query;

    const filter = {};
    if (tournamentId) filter.tournament = tournamentId;
    if (round) filter.round = Number(round);
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('tournament', 'name venue oversPerMatch status')
      .populate('teamA teamB winner loser')
      .sort({ round: 1, matchNumber: 1 });

    return res.status(200).json({ success: true, count: matches.length, matches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error fetching matches' });
  }
}

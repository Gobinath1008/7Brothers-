import connectToDatabase from '../../lib/db.js';
import Team from '../../models/Team.js';
import Player from '../../models/Player.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  await connectToDatabase();

  const adminUser = await authenticateAdmin(req, res);
  if (!adminUser) return;

  const { id } = req.query;
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
      const { name, captainName, captainPhone, status } = req.body || {};
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
      if (status) team.status = status;

      await team.save();

      return res.status(200).json({
        success: true,
        message: 'Registration updated successfully',
        team,
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

import connectToDatabase from '../../lib/db.js';
import Admin from '../../models/Admin.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    await connectToDatabase();
    const admin = await Admin.findById(adminUser.id).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username || 'admin',
        email: admin.email || 'admin@boxcricket.com',
        name: admin.name || 'Super Admin',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

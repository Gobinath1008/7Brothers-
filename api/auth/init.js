import connectToDatabase from '../../lib/db.js';
import Admin from '../../models/Admin.js';
import { ensureDefaultAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    const created = await ensureDefaultAdmin();
    const count = await Admin.countDocuments();

    return res.status(200).json({
      success: true,
      message: created ? 'Default admin initialized' : 'Admin already initialized',
      adminCount: count,
      defaultEmail: process.env.ADMIN_EMAIL || 'admin@boxcricket.com',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Initialization failed' });
  }
}

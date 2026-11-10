import connectToDatabase from '../../lib/db.js';
import Admin from '../../models/Admin.js';
import { signToken, ensureDefaultAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    await ensureDefaultAdmin();

    const { username, email, password } = req.body || {};
    const identifier = (username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    // Match by either username or email
    const admin = await Admin.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username || 'admin',
        email: admin.email || 'admin@boxcricket.com',
        name: admin.name || 'Super Admin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

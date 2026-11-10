import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import connectToDatabase from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_box_cricket_jwt_secret_key_2026';

export function signToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      username: admin.username || 'admin',
      email: admin.email || 'admin@boxcricket.com',
      name: admin.name || 'Super Admin',
      role: 'ADMIN',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware helper for Vercel Serverless Functions
 * Returns decoded admin or throws / responds with 401
 */
export async function authenticateAdmin(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Admin access only.' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Invalid or expired Admin token.' });
    return null;
  }

  return decoded;
}

/**
 * Auto-seeds initial admin or updates credentials if needed
 */
export async function ensureDefaultAdmin() {
  await connectToDatabase();
  const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const defaultEmail = (process.env.ADMIN_EMAIL || 'admin@boxcricket.com').toLowerCase().trim();
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin@123';

  let admin = await Admin.findOne({
    $or: [{ username: defaultUsername }, { email: defaultEmail }],
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    admin = await Admin.create({
      username: defaultUsername,
      email: defaultEmail,
      password: hashedPassword,
      name: 'Super Admin',
    });
    console.log(`✅ Default admin created: username=${defaultUsername}, password=${defaultPassword}`);
    return admin;
  } else {
    // If password does not match default, update it so user's specified credentials always work!
    const matches = await admin.comparePassword(defaultPassword);
    if (!matches) {
      admin.password = await bcrypt.hash(defaultPassword, 10);
      admin.username = defaultUsername;
      await admin.save();
      console.log(`✅ Default admin password synchronized: username=${defaultUsername}`);
    }
  }

  return admin;
}

import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth.js';

console.log('--- TESTING AUTH & JWT ---');

async function testAuth() {
  const dummyAdmin = {
    _id: '507f1f77bcf86cd799439011',
    email: 'admin@boxcricket.com',
    name: 'Super Admin',
  };

  const token = signToken(dummyAdmin);
  console.log('Token generated:', token.slice(0, 25) + '...');

  const verified = verifyToken(token);
  if (!verified || verified.email !== dummyAdmin.email || verified.role !== 'ADMIN') {
    throw new Error('JWT verification failed');
  }
  console.log('✅ JWT verification successful');

  const password = 'AdminCricket@2026';
  const hash = await bcrypt.hash(password, 10);
  const match = await bcrypt.compare(password, hash);
  const wrongMatch = await bcrypt.compare('WrongPassword', hash);

  if (!match || wrongMatch) {
    throw new Error('Password hash comparison failed');
  }
  console.log('✅ Bcrypt password hashing & comparison verified');
}

testAuth()
  .then(() => console.log('🎉 AUTH TESTS PASSED!'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

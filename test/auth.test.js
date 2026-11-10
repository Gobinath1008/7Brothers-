import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth.js';

console.log('--- TESTING AUTH & JWT WITH ADMIN / ADMIN@123 ---');

async function testAuth() {
  const dummyAdmin = {
    _id: '507f1f77bcf86cd799439011',
    username: 'admin',
    email: 'admin@boxcricket.com',
    name: 'Super Admin',
  };

  const token = signToken(dummyAdmin);
  console.log('Token generated:', token.slice(0, 25) + '...');

  const verified = verifyToken(token);
  if (!verified || verified.username !== 'admin' || verified.role !== 'ADMIN') {
    throw new Error('JWT verification failed');
  }
  console.log('✅ JWT verification successful with username "admin"');

  const password = 'admin@123';
  const hash = await bcrypt.hash(password, 10);
  const match = await bcrypt.compare(password, hash);
  const wrongMatch = await bcrypt.compare('wrongPassword', hash);

  if (!match || wrongMatch) {
    throw new Error('Password hash comparison failed');
  }
  console.log('✅ Password "admin@123" bcrypt verification passed!');
}

testAuth()
  .then(() => console.log('🎉 ALL AUTH TESTS PASSED!'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

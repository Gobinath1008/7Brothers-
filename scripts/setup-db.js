import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Tournament from '../models/Tournament.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import BallDelivery from '../models/BallDelivery.js';

dotenv.config();

async function setupDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in your .env file!');
    console.error('Please create a .env file with your MongoDB connection string:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/box_cricket?retryWrites=true&w=majority');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB database...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB successfully!');

  // Setup / Synchronize Admin User
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@boxcricket.com').toLowerCase().trim();

  let admin = await Admin.findOne({
    $or: [{ username: adminUsername }, { email: adminEmail }],
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  if (!admin) {
    admin = await Admin.create({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Admin',
    });
    console.log(`✅ Admin user "${adminUsername}" created in database!`);
  } else {
    admin.username = adminUsername;
    admin.password = hashedPassword;
    await admin.save();
    console.log(`✅ Existing admin password updated to match current credentials!`);
  }

  // Ensure all collection indexes
  console.log('🔄 Building database indexes...');
  await Promise.all([
    Admin.init(),
    Tournament.init(),
    Team.init(),
    Player.init(),
    Match.init(),
    BallDelivery.init(),
  ]);
  console.log('✅ All MongoDB collections & unique indexes verified!');

  console.log('\n==========================================');
  console.log('🎉 DATABASE SETUP & ADMIN USER READY!');
  console.log('==========================================');
  console.log('Admin login is strictly protected and will not be displayed to guests.');
  console.log('==========================================\n');

  await mongoose.disconnect();
}

setupDatabase().catch((err) => {
  console.error('Database setup failed:', err);
  process.exit(1);
});

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Automatically load .env, or fallback to .env.example if .env does not exist
if (!process.env.MONGODB_URI) {
  dotenv.config();
  if (!process.env.MONGODB_URI) {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      dotenv.config({ path: envExamplePath });
    }
  }
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless function invocations in production.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  let MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not defined. Serverless database calls will fail until configured.');
    throw new Error('Please define the MONGODB_URI environment variable in .env or Vercel dashboard');
  }

  // Ensure a database name is specified in the URI (e.g., /box_cricket) if not already set
  if (MONGODB_URI.includes('.mongodb.net/?') || MONGODB_URI.endsWith('.mongodb.net/')) {
    MONGODB_URI = MONGODB_URI.replace('.mongodb.net/?', '.mongodb.net/box_cricket?').replace(
      /\.mongodb\.net\/$/,
      '.mongodb.net/box_cricket'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ Connected to MongoDB Atlas cluster!');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;

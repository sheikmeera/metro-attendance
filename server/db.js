/**
 * db.js
 * Configures the MongoDB connection using Mongoose.
 */

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

let mongod = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      console.log('[DB] MONGO_URI missing. Starting inner memory server...');
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }

    if (uri) {
      console.log(`[DB] Attempting to connect to MongoDB (Masked: ${uri.substring(0, 20)}...)`);
    }

    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB via Mongoose.`);

  } catch (err) {
    console.error('[DB] MongoDB Connection Error:', err.message)
    process.exit(1)
  }
}

module.exports = { connectDB };

/**
 * db.js
 * Configures the MongoDB connection using Mongoose.
 */

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
require('dotenv').config()

let mongod = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      console.log('[DB] MONGO_URI missing. Starting inner memory server...');
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }

    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB via Mongoose.`);

  } catch (err) {
    console.error('[DB] MongoDB Connection Error:', err.message)
    process.exit(1)
  }
}

module.exports = { connectDB };

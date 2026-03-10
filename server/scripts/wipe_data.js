/**
 * server/scripts/wipe_data.js
 * Wipes all data in MongoDB and Cloudinary, preserving default admin.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cloudinary } = require('../utils/cloudinary');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Site = require('../models/Site');
const SiteAssignment = require('../models/SiteAssignment');
const bcrypt = require('bcryptjs');

async function wipeMongoDB() {
    console.log('🧹 Wiping MongoDB data...');
    try {
        await Attendance.deleteMany({});
        await Report.deleteMany({});
        await SiteAssignment.deleteMany({});
        await Site.deleteMany({});
        await Employee.deleteMany({});
        await Department.deleteMany({});
        await Admin.deleteMany({});
        console.log('✅ MongoDB collections cleared.');
    } catch (err) {
        console.error('❌ Error wiping MongoDB:', err.message);
        throw err;
    }
}

async function wipeCloudinary() {
    console.log('🧹 Wiping Cloudinary resources...');
    try {
        // Folders from cloudinary.js: metro_avatars, metro_reports
        const folders = ['metro_avatars', 'metro_reports'];
        for (const folder of folders) {
            console.log(`   Deleting all resources in folder: ${folder}`);
            // Note: delete_resources_by_prefix or delete_resources in a folder
            // Using delete_resources with prefix for simplicity
            await new Promise((resolve, reject) => {
                cloudinary.api.delete_resources_by_prefix(folder, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            });

            // Delete folder itself if needed (only works if empty)
            try {
                await new Promise((resolve, reject) => {
                    cloudinary.api.delete_folder(folder, (error, result) => {
                        if (error) resolve(); // Ignore error if folder not empty or not found
                        else resolve(result);
                    });
                });
            } catch (e) {
                // Folder might not be deletable if resources still pending or other issues
                console.log(`   Note: Could not delete folder ${folder} (might not be empty or already gone)`);
            }
        }
        console.log('✅ Cloudinary resources cleared.');
    } catch (err) {
        console.error('❌ Error wiping Cloudinary:', err.message);
        // Don't throw if Cloudinary fails, we still want to finish MongoDB part
    }
}

async function autoSeed() {
    console.log('🌱 Re-seeding default admin and departments...');
    try {
        const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@metro.com';
        const hash = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10);

        await Admin.create({
            name: process.env.INITIAL_ADMIN_NAME || 'Administrator',
            email: adminEmail,
            password_hash: hash
        });
        console.log(`   ✓ Admin created: ${adminEmail}`);

        const defaultDepts = ['Wiring', 'Installation', 'Maintenance', 'Management', 'Electrical', 'Civil'];
        for (const dept of defaultDepts) {
            await Department.create({ name: dept });
        }
        console.log('   ✓ Default departments seeded.');
    } catch (err) {
        console.error('❌ Auto-seed failed:', err.message);
        throw err;
    }
}

async function run() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI is missing in .env');

        await mongoose.connect(uri);
        console.log('🔗 Connected to MongoDB.');

        await wipeMongoDB();
        await wipeCloudinary();
        await autoSeed();

        console.log('\n✨ Data wipe and re-seed successful!');
        process.exit(0);
    } catch (err) {
        console.error('\n💥 Critical Error during wipe:', err);
        process.exit(1);
    }
}

run();

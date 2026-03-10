/**
 * server/scripts/verify_wipe.js
 * Verifies that the MongoDB collections are empty except for default admin and departments.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Site = require('../models/Site');
const SiteAssignment = require('../models/SiteAssignment');

async function verify() {
    try {
        const uri = process.env.MONGO_URI;
        await mongoose.connect(uri);
        console.log('🔗 Connected to MongoDB for verification.');

        const counts = {
            attendance: await Attendance.countDocuments(),
            reports: await Report.countDocuments(),
            siteAssignments: await SiteAssignment.countDocuments(),
            sites: await Site.countDocuments(),
            employees: await Employee.countDocuments(),
            departments: await Department.countDocuments(),
            admins: await Admin.countDocuments(),
        };

        console.log('\n📊 Collection Counts:');
        Object.entries(counts).forEach(([coll, count]) => {
            console.log(`   - ${coll}: ${count}`);
        });

        const status = {
            dataWiped: counts.attendance === 0 && counts.reports === 0 && counts.siteAssignments === 0 && counts.sites === 0 && counts.employees === 0,
            adminReady: counts.admins === 1,
            deptsReady: counts.departments > 0
        };

        if (status.dataWiped && status.adminReady && status.deptsReady) {
            console.log('\n✅ Verification PASSED: All operational data wiped, admin and departments re-seeded.');

            const admin = await Admin.findOne({});
            console.log(`   Default Admin email: ${admin.email}`);
        } else {
            console.log('\n❌ Verification FAILED: Some unexpected documents remain or re-seeding failed.');
        }

        process.exit(0);
    } catch (err) {
        console.error('\n💥 Error during verification:', err);
        process.exit(1);
    }
}

verify();

/**
 * services/backupService.js
 * Orchestrates nightly PDF generation and backup.
 */
const fs = require('fs');
const path = require('path');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Site = require('../models/Site');
const Report = require('../models/Report');
const { generateDailyLog, generateSiteLog } = require('./pdfService');
const { uploadToDrive } = require('./googleDriveService');

const BACKUP_BASE = path.join(__dirname, '../backups');

/**
 * Ensures a directory exists for a given date
 * @returns {string} The path to the folder
 */
function ensureBackupDir(date) {
    const [year, month, day] = date.split('-');
    const dir = path.join(BACKUP_BASE, year, month, day);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Helper to manually build the "JOIN" since our data spans multiple document collections with string references
async function buildAggregatedRecords(baseRecords) {
    return Promise.all(baseRecords.map(async (a) => {
        const emp = await Employee.findOne({ id: a.employee_id }, 'name department role phone lean');
        const site = a.site_id ? await Site.findById(a.site_id, 'site_name lean') : null;

        const report = await Report.findOne({
            employee_id: a.employee_id,
            site_id: a.site_id,
            report_time: {
                $gte: new Date(a.date),
                $lt: new Date(new Date(a.date).getTime() + 24 * 60 * 60 * 1000)
            }
        }).lean();

        return {
            ...a,
            employee_name: emp ? emp.name : null,
            department: emp ? emp.department : null,
            role: emp ? emp.role : null,
            phone: emp ? emp.phone : null,
            site_name: site ? site.site_name : null,
            photo_url: report ? report.photo_url : null,
            notes: report ? report.notes : null,
            report_lat: report ? report.latitude : null,
            report_lng: report ? report.longitude : null,
            verified: report ? report.verified : 0
        };
    }));
}

async function performNightlyBackup() {
    console.log('[Backup] Starting nightly backup process...');

    // Calculate "Yesterday" in IST (UTC+5.5)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const yesterdayDate = new Date(istNow);
    yesterdayDate.setDate(istNow.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const dir = ensureBackupDir(yesterday);
    const monthYear = yesterday.substring(0, 7); // YYYY-MM

    try {
        // 1. Generate Daily Log for Yesterday
        const attendances = await Attendance.find({ date: yesterday }).sort({ time: 1 }).lean();
        const dailyRecords = await buildAggregatedRecords(attendances);

        if (dailyRecords.length > 0) {
            const dailyFilename = `daily_attendance_${yesterday}.pdf`;
            const dailyPath = path.join(dir, dailyFilename);
            const dailyStream = fs.createWriteStream(dailyPath);
            await generateDailyLog(dailyStream, yesterday, dailyRecords);
            console.log(`[Backup] Daily log saved: ${dailyFilename}`);

            // Structured Drive path: Daily_Backups/2026/03/06
            const drivePath = `Daily_Backups/${yesterday.replace(/-/g, '/')}`;
            await uploadToDrive(dailyPath, dailyFilename, drivePath);
        }

        // 2. Generate Monthly Reports for all Employees
        const nextDay = new Date(yesterdayDate);
        nextDay.setDate(yesterdayDate.getDate() + 1);
        const isLastDayOfMonth = nextDay.getDate() === 1;

        if (isLastDayOfMonth) {
            console.log(`[Backup] Last day of month detected (${yesterday}). Generating monthly reports...`);
            const employees = await Employee.find({ status: 'active' }).lean();

            for (const emp of employees) {
                // Find attendance for the month (starts with YYYY-MM)
                const monthAttendances = await Attendance.find({
                    employee_id: emp.id,
                    date: { $regex: `^${monthYear}` }
                }).sort({ date: 1, time: 1 }).lean();

                const records = await buildAggregatedRecords(monthAttendances);

                if (records.length > 0) {
                    const monthlyFilename = `monthly_report_${emp.name.replace(/\s/g, '_')}_${monthYear}.pdf`;
                    const monthlyPath = path.join(dir, monthlyFilename);
                    const monthlyStream = fs.createWriteStream(monthlyPath);
                    await require('./pdfService').generateMonthlyEmployeeLog(monthlyStream, emp.name, monthYear, records, emp);
                    console.log(`[Backup] Monthly report saved: ${monthlyFilename}`);

                    // Structured Drive path: Monthly_Reports/2026/03
                    const monthlyDrivePath = `Monthly_Reports/${monthYear.replace(/-/g, '/')}`;
                    await uploadToDrive(monthlyPath, monthlyFilename, monthlyDrivePath);
                }
            }
        }

        // 3. Generate Logs for Sites closed Yesterday
        // Search for sites closed between yesterday 00:00:00 and yesterday 23:59:59
        const yStart = new Date(yesterday);
        const yEnd = new Date(yesterday);
        yEnd.setDate(yEnd.getDate() + 1);

        const closedYesterday = await Site.find({
            status: 'closed',
            completed_at: { $gte: yStart, $lt: yEnd }
        }).lean();

        for (const site of closedYesterday) {
            const siteAttendances = await Attendance.find({ site_id: site._id }).sort({ date: -1, time: 1 }).lean();
            const records = await buildAggregatedRecords(siteAttendances);

            const siteFilename = `closed_site_${site.site_name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            const sitePath = path.join(dir, siteFilename);
            const siteStream = fs.createWriteStream(sitePath);
            await generateSiteLog(siteStream, site.site_name, records, site);
            console.log(`[Backup] Closed site log saved: ${siteFilename}`);

            // Suitable Drive folder: Closed_Sites_Backups
            await uploadToDrive(sitePath, siteFilename, 'Closed_Sites_Backups');
        }

        console.log('[Backup] Scheduled backup tasks completed successfully.');
    } catch (err) {
        console.error('[Backup] Error during nightly backup:', err);
    }
}

module.exports = { performNightlyBackup };

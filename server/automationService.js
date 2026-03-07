const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { generateDailyLog, generateSiteLog, generateEmployeeLog } = require('./services/pdfService');
const { getDriveService, syncDirectory } = require('./services/driveService');

const Attendance = require('./models/Attendance');
const Employee = require('./models/Employee');
const Site = require('./models/Site');
const Report = require('./models/Report');

const BACKUP_DIR = path.join(__dirname, 'backups');

/**
 * Ensures a directory exists (recursive)
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Gets path components for current date: YYYY/MM
 */
function getDatePath() {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    return { yyyy, mm };
}

/**
 * Automates DB file backup
 */
async function backupDatabase() {
    // MongoDB Atlas is automatically backed up.
    // Keeping this function for signature compatibility in routes, but logging the status change.
    console.log('[Automation] Backup triggered. Note: MongoDB Atlas handles backups automatically. Skipping local copy.');
    return null;
}

/**
 * Syncs the entire backup folder to Google Drive
 */
async function syncToDrive() {
    const drive = await getDriveService();
    if (!drive) return;

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        console.warn('[Drive] GOOGLE_DRIVE_FOLDER_ID missing in .env. Sync skipped.');
        return;
    }

    console.log('[Automation] Starting Google Drive sync...');
    try {
        await syncDirectory(drive, BACKUP_DIR, folderId);
        console.log('[Automation] Drive sync successful.');
    } catch (err) {
        console.error('[Automation] Drive sync failed:', err.message);
    }
}

// Helper to assemble full records (similar to pdfController)
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
            report_lng: report ? report.longitude : null
        };
    }));
}

/**
 * Generates all organized PDFs for the current state
 */
async function generateAllReportsBatch() {
    const { yyyy, mm } = getDatePath();
    const baseDir = path.join(BACKUP_DIR, yyyy, mm);

    const empDir = path.join(baseDir, 'employees');
    const siteDir = path.join(baseDir, 'sites');
    const dailyDir = path.join(baseDir, 'daily');

    ensureDir(empDir);
    ensureDir(siteDir);
    ensureDir(dailyDir);

    const today = new Date().toISOString().split('T')[0];

    // 1. Daily Log
    const dailyPath = path.join(dailyDir, `daily_${today}.pdf`);
    const dailyStream = fs.createWriteStream(dailyPath);

    const todayAttendances = await Attendance.find({ date: today }).sort({ time: 1 }).lean();
    const dailyRecords = await buildAggregatedRecords(todayAttendances);
    await generateDailyLog(dailyStream, today, dailyRecords);

    // 2. Site Logs (Active site reports)
    const sites = await Site.find({ status: 'active' }).lean();
    for (const site of sites) {
        const sPath = path.join(siteDir, `site_${site.site_name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        const sStream = fs.createWriteStream(sPath);

        const siteAttendances = await Attendance.find({ site_id: site._id }).sort({ date: -1, time: 1 }).lean();
        const sRecords = await buildAggregatedRecords(siteAttendances);

        await generateSiteLog(sStream, site.site_name, sRecords, site);
    }

    // 3. Employee Logs (Active employees)
    const employees = await Employee.find({ status: 'active', role: 'employee' }).lean();
    for (const emp of employees) {
        const ePath = path.join(empDir, `${emp.name.replace(/\s/g, '_')}_${emp.id}.pdf`);
        const eStream = fs.createWriteStream(ePath);

        const empAttendances = await Attendance.find({ employee_id: emp.id }).sort({ date: -1 }).lean();
        const eRecords = await buildAggregatedRecords(empAttendances);

        await generateEmployeeLog(eStream, emp.name, eRecords, emp);
    }

    console.log(`[Automation] Batch PDF generation complete for ${today}`);

    // Trigger Sync after batch
    await syncToDrive();
}

/**
 * Initializes schedules
 */
function initAutomation() {
    // DB Backup: Every day at 1:00 AM
    cron.schedule('0 1 * * *', () => {
        console.log('[Automation] Running scheduled DB backup logger...');
        backupDatabase(); // Won't do local copy anymore, but will log.
    });

    // PDF Batch: Every day at 11:50 PM
    cron.schedule('50 23 * * *', () => {
        console.log('[Automation] Running scheduled PDF batch generation...');
        generateAllReportsBatch();
    });

    console.log('[Automation] Cron jobs initialized.');
}

module.exports = { initAutomation, backupDatabase, generateAllReportsBatch, syncToDrive };

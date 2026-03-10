const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const {
    generateDailyLog,
    generateSiteLog,
    generateEmployeeLog,
    generateMonthlyEmployeeLog,
    generateMonthlySummaryLog
} = require('./services/pdfService');
const { getDriveService, syncDirectory } = require('./services/driveService');
const { uploadToDrive } = require('./services/googleDriveService');

const Attendance = require('./models/Attendance');
const Employee = require('./models/Employee');
const Site = require('./models/Site');
const Report = require('./models/Report');

const BACKUP_DIR = path.join(__dirname, 'backups');

/**
 * Ensures a directory exists for a given date
 */
function ensureBackupDir(date) {
    const [year, month, day] = date.split('-');
    const dir = path.join(BACKUP_DIR, year, month, day);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * Helper to assemble full records (similar to pdfController)
 */
async function buildAggregatedRecords(baseRecords) {
    const mongoose = require('mongoose');
    return Promise.all(baseRecords.map(async (a) => {
        const emp = await Employee.findOne({ id: a.employee_id }, 'name department role phone').lean();

        let site = null;
        if (a.site_id && mongoose.Types.ObjectId.isValid(a.site_id)) {
            site = await Site.findById(a.site_id, 'site_name').lean();
        }

        // Try to find matching report for photo/gps fallback
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
            site_name: site ? site.site_name : (a.site_name || null),
            photo_url: a.photo_url || (report ? report.photo_url : null),
            notes: a.notes || (report ? report.notes : null),
            report_lat: a.latitude || (report ? report.latitude : null),
            report_lng: a.longitude || (report ? report.longitude : null)
        };
    }));
}

/**
 * Consolidate Nightly Automation Sequence (Scheduled for 2:00 AM IST)
 */
async function performNightlyAutomation() {
    console.log('[Automation] Starting consolidated nightly sequence...');

    // 1. Determine "Yesterday" in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const yesterdayDate = new Date(istNow);
    yesterdayDate.setDate(istNow.getDate() - 1);

    const yesterday = yesterdayDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthYear = yesterday.substring(0, 7); // YYYY-MM
    const dir = ensureBackupDir(yesterday);

    try {
        // --- TASK A: Daily Attendance Log ---
        console.log(`[Automation] Generating Daily Log for ${yesterday}...`);
        const dailyAttendances = await Attendance.find({ date: yesterday }).sort({ time: 1 }).lean();
        const dailyRecords = await buildAggregatedRecords(dailyAttendances);

        if (dailyRecords.length > 0) {
            const dailyFilename = `daily_attendance_${yesterday}.pdf`;
            const dailyPath = path.join(dir, dailyFilename);
            const dailyStream = fs.createWriteStream(dailyPath);
            await generateDailyLog(dailyStream, yesterday, dailyRecords);
            await uploadToDrive(dailyPath, dailyFilename, `Daily_Backups/${yesterday.replace(/-/g, '/')}`);
        }

        // --- TASK B: Sitewise Closure Logs (Only night it closes) ---
        console.log(`[Automation] Checking for sites closed on ${yesterday}...`);
        const yStart = new Date(yesterday);
        const yEnd = new Date(yesterday);
        yEnd.setDate(yEnd.getDate() + 1);

        const closedYesterday = await Site.find({
            status: 'closed',
            completed_at: { $gte: yStart, $lt: yEnd }
        }).lean();

        for (const site of closedYesterday) {
            console.log(`[Automation] Generating closure log for Site: ${site.site_name}`);
            const siteAttendances = await Attendance.find({ site_id: site._id }).sort({ date: -1, time: 1 }).lean();
            const sRecords = await buildAggregatedRecords(siteAttendances);

            const siteFilename = `closed_site_${site.site_name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            const sitePath = path.join(dir, siteFilename);
            const siteStream = fs.createWriteStream(sitePath);
            await generateSiteLog(siteStream, site.site_name, sRecords, site);
            await uploadToDrive(sitePath, siteFilename, 'Closed_Sites_Backups');
        }

        // --- TASK C: Month-End Batch (1st of Month) ---
        const nextDay = new Date(yesterdayDate);
        nextDay.setDate(yesterdayDate.getDate() + 1);
        const isFirstOfMonth = nextDay.getDate() === 1;

        if (isFirstOfMonth) {
            console.log(`[Automation] Month-end detected (${monthYear}). Generating individual & summary logs...`);

            // 1. Individual Employee Logs for the Month
            const employees = await Employee.find({ status: 'active', role: 'employee' }).lean();
            const summaryEmpData = [];

            for (const emp of employees) {
                const monthAttendances = await Attendance.find({
                    employee_id: emp.id,
                    date: { $regex: `^${monthYear}` }
                }).sort({ date: 1 }).lean();

                const eRecords = await buildAggregatedRecords(monthAttendances);

                // Track stats for the summary report
                const uniqueDays = new Set(monthAttendances.map(a => a.date)).size;
                summaryEmpData.push({
                    id: emp.id,
                    name: emp.name,
                    department: emp.department,
                    uniqueDays,
                    totalReports: monthAttendances.length,
                    avatar: emp.avatar
                });

                if (eRecords.length > 0) {
                    const eFilename = `monthly_report_${emp.name.replace(/\s/g, '_')}_${monthYear}.pdf`;
                    const ePath = path.join(dir, eFilename);
                    const eStream = fs.createWriteStream(ePath);
                    await generateMonthlyEmployeeLog(eStream, emp.name, monthYear, eRecords, emp);
                    await uploadToDrive(ePath, eFilename, `Monthly_Reports/Employees/${monthYear.replace(/-/g, '/')}`);
                }
            }

            // 2. Monthly Summary Log (Executive Detail)
            const monthSites = await Site.find({
                $or: [
                    { status: 'active' },
                    { completed_at: { $regex: `^${monthYear}` } }
                ]
            }).lean();

            const stats = {
                totalReports: await Attendance.countDocuments({ date: { $regex: `^${monthYear}` } }),
                activeSites: await Site.countDocuments({ status: 'active' }),
                closedSites: await Site.countDocuments({ status: 'closed', completed_at: { $regex: `^${monthYear}` } })
            };

            const summaryFilename = `monthly_full_summary_${monthYear}.pdf`;
            const summaryPath = path.join(dir, summaryFilename);
            const summaryStream = fs.createWriteStream(summaryPath);
            await generateMonthlySummaryLog(summaryStream, monthYear, {
                sites: monthSites,
                employees: summaryEmpData,
                stats
            });
            await uploadToDrive(summaryPath, summaryFilename, `Monthly_Reports/Summaries/${monthYear.replace(/-/g, '/')}`);
        }

        // --- TASK D: Final Sync ---
        await syncDirectory(await getDriveService(), BACKUP_DIR, process.env.GOOGLE_DRIVE_FOLDER_ID);

        console.log('[Automation] Consolidated sequence completed successfully.');
    } catch (err) {
        console.error('[Automation] Critical failure in nightly sequence:', err);
    }
}

/**
 * Sends reminders to employees who haven't reported yet today
 */
async function sendDailyReminders() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const employees = await Employee.find({ status: 'active', role: 'employee' }).lean();
        const reportedIds = await Attendance.find({ date: today }).distinct('employee_id');
        const reportedSet = new Set(reportedIds);
        const missing = employees.filter(emp => !reportedSet.has(emp.id));

        const Notification = require('./controllers/notificationController');
        for (const emp of missing) {
            await Notification.sendToUser(emp.id, {
                title: 'Report Reminder ⏰',
                body: "Don't forget to submit your report from the site today!",
                icon: '/pwa-192x192.png',
                data: { url: '/report' }
            });
        }
    } catch (err) {
        console.error('[Automation] Reminder process failed:', err);
    }
}

/**
 * Initializes schedules
 */
function initAutomation() {
    // Consolidated Backup: 2:00 AM IST
    cron.schedule('0 2 * * *', () => {
        performNightlyAutomation();
    }, { timezone: "Asia/Kolkata" });

    // Daily Reminder: 8:00 AM IST
    cron.schedule('0 8 * * *', () => {
        sendDailyReminders();
    }, { timezone: "Asia/Kolkata" });

    console.log('[Automation] Cron jobs initialized (Backup: 02:00 IST, Reminders: 08:00 IST).');
}

module.exports = { initAutomation, performNightlyAutomation };

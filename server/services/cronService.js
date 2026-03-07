/**
 * services/cronService.js
 * Schedules the nightly backup task.
 */
const cron = require('node-cron');
const { performNightlyBackup } = require('./backupService');

function initCron() {
    // Schedule at 2:05 AM every morning
    cron.schedule('05 02 * * *', () => {
        console.log('[Cron] Triggering nightly backup (previous day + month-end + site closures)...');
        performNightlyBackup();
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log('[Cron] Backup service initialized (Scheduled for 02:05 IST).');
}

module.exports = { initCron };

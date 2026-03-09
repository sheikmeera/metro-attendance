/**
 * services/pdfService.js — Metro Electricals — v2 (Robust Overhaul)
 * 
 * DESIGN PRINCIPLES (v2):
 * 1. Parallel Pre-fetching: All external assets (photos, map tiles) are fetched in parallel BEFORE doc start.
 * 2. Fail-Safe: Any network failure or invalid image results in a graceful placeholder, never a crash.
 * 3. Strict Synchronization: All async operations are completed before the PDF stream is closed.
 * 4. Serverless Ready: Uses /tmp for all temporary storage.
 */
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Configuration ──────────────────────────────────────────────
const UPLOADS_DIR = os.tmpdir();
const LOGO_PATH = (() => {
    const cwd = process.cwd();
    const candidates = [
        path.join(__dirname, '../../public/logo.jpeg'),
        path.join(__dirname, '../public/logo.jpeg'),
        path.join(__dirname, '../logo.jpeg'),
        path.join(cwd, 'public/logo.jpeg'),
        path.join(cwd, 'server/public/logo.jpeg'),
        path.join(cwd, 'server/logo.jpeg'),
        path.join(cwd, 'logo.jpeg'),
        path.join(__dirname, '../../public/logo.png'),
        path.join(__dirname, '../public/logo.png'),
        path.join(cwd, 'public/logo.png'),
    ];
    return candidates.find(p => fs.existsSync(p)) || '';
})();

const AMBER = '#f59e0b', DARK = '#0f172a', NAVY = '#1e293b', TEXT = '#0f172a';
const MUTED = '#64748b', BORDER = '#e2e8f0', LIGHT = '#f8fafc', WHITE = '#ffffff';
const GREEN = '#10b981', RED = '#ef4444';
const PW = 595.28, PH = 841.89, ML = 32, MR = 32, CW = PW - ML - MR, BOT = 48;

// ── Asset Fetching (v2 Parallel Engine) ─────────────────────────

async function downloadAsset(url, type = 'photo') {
    if (!url || url === '👤' || !url.startsWith?.('http')) return null;
    const prefix = type === 'tile' ? '.tile_' : '.remote_';
    const tmp = path.join(UPLOADS_DIR, `${prefix}${Date.now()}_${Math.random().toString(36).slice(2)}${type === 'tile' ? '.png' : '.jpg'}`);

    try {
        const res = await fetch(url, {
            headers: type === 'tile' ? { 'User-Agent': 'MetroElectricals/2.0' } : {},
            timeout: 5000
        });
        if (!res.ok) return null;
        const buffer = await res.buffer();
        fs.writeFileSync(tmp, buffer);
        return tmp;
    } catch (err) {
        console.error(`[PDFv2] Failed to download ${type}:`, url, err.message);
        return null;
    }
}

function getTileUrl(lat, lng, zoom = 15) {
    if (!lat || !lng) return null;
    const lr = parseFloat(lat) * Math.PI / 180;
    const n = 1 << zoom;
    const tx = Math.floor((parseFloat(lng) + 180) / 360 * n);
    const ty = Math.floor((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n);
    return `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
}

/**
 * Pre-fetches all external assets in parallel for a set of records.
 * Returns a map of URL -> Local Path.
 */
async function preFetchAssets(records, extra = []) {
    const urls = new Set();
    records.forEach(r => {
        if (r.photo_url) urls.add({ url: r.photo_url, type: 'photo' });
        if (r.avatar) urls.add({ url: r.avatar, type: 'photo' });
        if (r.report_lat && r.report_lng) {
            urls.add({ url: getTileUrl(r.report_lat, r.report_lng), type: 'tile' });
        }
    });
    extra.forEach(u => u && urls.add({ url: u, type: 'photo' }));

    const assetEntries = Array.from(urls);
    const results = await Promise.all(assetEntries.map(entry => downloadAsset(entry.url, entry.type)));

    const assetMap = {};
    assetEntries.forEach((entry, i) => {
        if (results[i]) assetMap[entry.url] = results[i];
    });
    return assetMap;
}

function cleanupAssets(assetMap) {
    Object.values(assetMap).forEach(p => {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { }
    });
}

// ── Layout Helpers (v2) ─────────────────────────────────────────

function v2_pageHeader(doc, title, sub) {
    const H = 88;
    doc.rect(0, 0, PW, H).fill(DARK);
    doc.rect(0, H, PW, 3).fill(AMBER);
    if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
        try { doc.image(LOGO_PATH, ML, 10, { fit: [64, 64] }); } catch { }
    }
    const tx = ML + 72;
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(9).text('METRO ELECTRICALS', tx, 18);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15).text(title, tx, 34, { width: PW - tx - MR });
    if (sub) doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(sub, tx, 58, { width: PW - tx - MR });
    return H + 13;
}

function v2_pageHeaderRepeat(doc) {
    const H = 44;
    doc.rect(0, 0, PW, H).fill(DARK);
    doc.rect(0, H, PW, 2).fill(AMBER);
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8).text('METRO ELECTRICALS  —  Continued', ML, 16, { width: CW });
    return H + 12;
}

function v2_heading(doc, label, y) {
    if (y + 40 > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); }
    doc.rect(ML, y, CW, 24).fill(NAVY);
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8.5).text(label.toUpperCase(), ML + 8, y + 8, { width: CW - 16 });
    return y + 30;
}

async function v2_profileCard(doc, rows, y, assetMap) {
    const ROW_H = 22, PAD = 10;
    const textRows = rows.filter(r => !r.isAvatar);
    const avatarRow = rows.find(r => r.isAvatar);
    const totalH = Math.max(PAD + textRows.length * ROW_H + PAD, avatarRow?.value ? PAD + 70 + PAD : 0);

    if (y + totalH + 10 > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); }
    doc.fillColor(LIGHT).strokeColor(BORDER).rect(ML, y, CW, totalH).fillAndStroke();
    doc.fillColor(AMBER).rect(ML, y, 3, totalH).fill();

    textRows.forEach((row, i) => {
        const ry = y + PAD + i * ROW_H;
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text((row.label + ':').toUpperCase(), ML + 10, ry + 5, { width: 110 });
        doc.fillColor(TEXT).font('Helvetica').fontSize(8.5).text(String(row.value ?? '—'), ML + 126, ry + 5, { width: CW - 136 });
    });

    if (avatarRow?.value && assetMap[avatarRow.value]) {
        try {
            const s = 64;
            doc.image(assetMap[avatarRow.value], ML + CW - s - 10, y + PAD, { width: s, height: s, fit: [s, s] });
        } catch { }
    }
    return y + totalH + 15;
}

async function v2_logCard(doc, rec, detailRows, y, index, assetMap) {
    const CARD_H = 250, HEADER_H = 28, R = 6;
    if (y + CARD_H + 20 > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); }

    doc.save();
    doc.roundedRect(ML, y, CW, HEADER_H, R).clip().rect(ML, y, CW, HEADER_H).fill(DARK).restore();

    // Badge
    doc.save().roundedRect(ML + 8, y + 5, 24, 18, 4).fill(AMBER).restore();
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8).text(`#${index + 1}`, ML + 8, y + 10, { width: 24, align: 'center' });

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text(`${rec.employee_name || '—'}  ·  ${rec.employee_id || '—'}`, ML + 40, y + 9);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(`${rec.date} . ${rec.time}`, ML + CW - 192, y + 10, { width: 180, align: 'right' });

    const bodyY = y + HEADER_H, bodyH = CARD_H - HEADER_H;
    doc.save().fillColor(WHITE).strokeColor(BORDER).roundedRect(ML, bodyY, CW, bodyH, R).fillAndStroke().restore();

    const photoX = ML + 10, photoY = bodyY + 10, photoW = (CW - 30) / 2, photoH = bodyH - 20;
    doc.save().roundedRect(photoX, photoY, photoW, photoH, 6).clip();
    const photoPath = assetMap[rec.photo_url];
    if (photoPath) {
        try { doc.image(photoPath, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' }); }
        catch { doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9'); }
    } else {
        doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9');
    }
    doc.restore();

    // Details Right
    const dx = photoX + photoW + 20, dw = photoW;
    let dy = bodyY + 10;
    detailRows.forEach(row => {
        if (!row.value || row.value === '—') return;
        doc.circle(dx - 5, dy + 4, 1.5).fill(AMBER);
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.5).text(row.label.toUpperCase(), dx, dy);
        dy += 9;
        const val = String(row.value);
        doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8).text(val, dx, dy, { width: dw - 10 });
        dy += doc.heightOfString(val, { width: dw - 10, fontSize: 8 }) + 6;
    });

    // Map Slot
    const mx = dx, my = bodyY + bodyH - 70, mw = dw - 10, mh = 45;
    doc.save().roundedRect(mx, my, mw, mh, 4).clip();
    const tileUrl = getTileUrl(rec.report_lat, rec.report_lng);
    const tilePath = assetMap[tileUrl];
    if (tilePath) {
        try { doc.image(tilePath, mx, my, { width: mw, height: mh, fit: [mw, mh] }); }
        catch { doc.rect(mx, my, mw, mh).fill('#f1f5f9'); }
    } else {
        doc.rect(mx, my, mw, mh).fill('#f1f5f9');
    }
    doc.restore();
    if (rec.report_lat) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(6).text(`GPS: ${parseFloat(rec.report_lat).toFixed(5)}, ${parseFloat(rec.report_lng).toFixed(5)}`, mx, my + mh + 2);
    }

    return y + CARD_H + 15;
}

function v2_summaryTable(doc, cols, rows, startY) {
    let y = startY;
    const TH = 26, RH = 22, GAP = 4;
    const drawTH = (atY) => {
        doc.rect(ML, atY, CW, TH).fill(NAVY);
        let x = ML + 8;
        doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8);
        cols.forEach(c => { doc.text(c.label, x, atY + 9, { width: c.w - 8 }); x += c.w; });
        return atY + TH + GAP;
    };
    y = drawTH(y);
    rows.forEach(row => {
        if (y + RH > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); y = drawTH(y); }
        doc.fillColor(WHITE).strokeColor(BORDER).rect(ML, y, CW, RH).fillAndStroke();
        let x = ML + 8;
        doc.fillColor(TEXT).font('Helvetica').fontSize(8);
        row.forEach((val, i) => { doc.text(String(val ?? '—'), x, y + 7, { width: cols[i].w - 8 }); x += cols[i].w; });
        y += RH + GAP;
    });
    return y + 10;
}

// ── Exported Functions (v2) ────────────────────────────────────

function formatGB(date) {
    return new Date(date).toLocaleString('en-GB', { hour12: false }).replace(',', '');
}

exports.generateDailyLog = async (output, date, records) => {
    const assetMap = await preFetchAssets(records);
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        if (output.setHeader) {
            output.setHeader('Content-Type', 'application/pdf');
            output.setHeader('Content-Disposition', `attachment; filename="daily_${date}.pdf"`);
        }
        doc.pipe(output);
        let y = v2_pageHeader(doc, `Daily Attendance: ${date}`, `Generated: ${formatGB(new Date())} . ${records.length} records`);

        y = v2_heading(doc, 'Attendance Summary', y);
        const cols = [{ label: 'EMPLOYEE', w: 140 }, { label: 'ID', w: 70 }, { label: 'DEPT', w: 100 }, { label: 'SITE', w: 120 }, { label: 'TIME', w: 50 }, { label: 'STATUS', w: 50 }];
        y = v2_summaryTable(doc, cols, records.map(r => [r.employee_name, r.employee_id, r.department, r.site_name, r.time, r.status]), y);

        doc.addPage();
        y = v2_pageHeader(doc, `Logs: ${date}`, 'Photos & Coordinates');
        for (let i = 0; i < records.length; i++) {
            y = await v2_logCard(doc, records[i], [
                { label: 'Site', value: records[i].site_name },
                { label: 'Status', value: records[i].status },
                { label: 'Notes', value: records[i].notes }
            ], y, i, assetMap);
        }
        doc.end();
    } finally { cleanupAssets(assetMap); }
};

exports.generateEmployeeLog = async (output, employeeName, records, empData = {}) => {
    const assetMap = await preFetchAssets(records, [empData.avatar]);
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        if (output.setHeader) {
            output.setHeader('Content-Type', 'application/pdf');
            output.setHeader('Content-Disposition', `attachment; filename="emp_${employeeName.replace(/\s/g, '_')}.pdf"`);
        }
        doc.pipe(output);
        let y = v2_pageHeader(doc, `Employee Report: ${employeeName}`, `Generated: ${formatGB(new Date())}`);

        y = v2_heading(doc, 'Profile', y);
        y = await v2_profileCard(doc, [
            { label: 'Name', value: empData.name || employeeName },
            { label: 'ID', value: empData.id || records[0]?.employee_id },
            { label: 'Dept', value: empData.department },
            { label: 'Status', value: empData.status || 'active' },
            { label: 'avatar', value: empData.avatar || records[0]?.avatar, isAvatar: true }
        ], y, assetMap);

        y = v2_heading(doc, 'Activity History', y);
        for (let i = 0; i < records.length; i++) {
            y = await v2_logCard(doc, records[i], [
                { label: 'Date', value: records[i].date },
                { label: 'Site', value: records[i].site_name },
                { label: 'Status', value: records[i].status },
                { label: 'Notes', value: records[i].notes }
            ], y, i, assetMap);
        }
        doc.end();
    } finally { cleanupAssets(assetMap); }
};

exports.generateSiteLog = async (output, siteName, records, siteData = {}) => {
    const assetMap = await preFetchAssets(records);
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        if (output.setHeader) {
            output.setHeader('Content-Type', 'application/pdf');
            output.setHeader('Content-Disposition', `attachment; filename="site_${siteName.replace(/\s/g, '_')}.pdf"`);
        }
        doc.pipe(output);
        let y = v2_pageHeader(doc, `Site Report: ${siteName}`, `Generated: ${formatGB(new Date())} . ${records.length} logs`);

        y = v2_heading(doc, 'Site Details', y);
        y = await v2_profileCard(doc, [
            { label: 'Site', value: siteData.site_name || siteName },
            { label: 'Client', value: siteData.client_name },
            { label: 'Location', value: siteData.location_name },
            { label: 'Status', value: siteData.status }
        ], y, assetMap);

        y = v2_heading(doc, 'Attendance Log', y);
        for (let i = 0; i < records.length; i++) {
            y = await v2_logCard(doc, records[i], [
                { label: 'Employee', value: records[i].employee_name },
                { label: 'Date', value: records[i].date },
                { label: 'Time', value: records[i].time },
                { label: 'Notes', value: records[i].notes }
            ], y, i, assetMap);
        }
        doc.end();
    } finally { cleanupAssets(assetMap); }
};

exports.generateMonthlyEmployeeLog = async (output, employeeName, monthYear, records, empData = {}) => {
    const assetMap = await preFetchAssets(records, [empData.avatar]);
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        if (output.setHeader) {
            output.setHeader('Content-Type', 'application/pdf');
            output.setHeader('Content-Disposition', `attachment; filename="monthly_${employeeName.replace(/\s/g, '_')}_${monthYear}.pdf"`);
        }
        doc.pipe(output);
        let y = v2_pageHeader(doc, `Monthly Report: ${employeeName}`, `Period: ${monthYear} . Generated: ${formatGB(new Date())}`);

        y = v2_heading(doc, 'Profile', y);
        y = await v2_profileCard(doc, [
            { label: 'Name', value: empData.name || employeeName },
            { label: 'ID', value: empData.id || records[0]?.employee_id },
            { label: 'Dept', value: empData.department },
            { label: 'avatar', value: empData.avatar || records[0]?.avatar, isAvatar: true }
        ], y, assetMap);

        y = v2_heading(doc, 'Daily Logs', y);
        for (let i = 0; i < records.length; i++) {
            y = await v2_logCard(doc, records[i], [
                { label: 'Date', value: records[i].date },
                { label: 'Site', value: records[i].site_name },
                { label: 'Time', value: records[i].time },
                { label: 'Status', value: records[i].status }
            ], y, i, assetMap);
        }
        doc.end();
    } finally { cleanupAssets(assetMap); }
};

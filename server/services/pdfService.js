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

async function v2_logCard(doc, rec, y, x, width, index, assetMap) {
    const CARD_H = 180, HEADER_H = 28, R = 6;

    // Card Container
    doc.save();
    // Header
    doc.roundedRect(x, y, width, HEADER_H, R).clip().rect(x, y, width, HEADER_H).fill(DARK).restore();

    // Badge
    doc.save().roundedRect(x + 8, y + 5, 24, 18, 4).fill(AMBER).restore();
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5).text(`#${index + 1}`, x + 8, y + 10, { width: 24, align: 'center' });

    // Employee Name & ID
    const nameText = `${rec.employee_name || '—'}  ·  ${rec.employee_id || '—'}`;
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text(nameText, x + 40, y + 9, { width: width - 110 });

    // Date & Time (Top Right)
    const dateTime = `${rec.date || ''}  ${rec.time || ''}`;
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5).text(dateTime, x + width - 105, y + 10, { width: 100, align: 'right' });

    // Body
    const bodyY = y + HEADER_H, bodyH = CARD_H - HEADER_H;
    doc.save().fillColor(WHITE).strokeColor(BORDER).roundedRect(x, bodyY, width, bodyH, R).fillAndStroke().restore();

    // Photo (Left side of Body)
    const photoW = (width * 0.45), photoH = bodyH - 20;
    const photoX = x + 10, photoY = bodyY + 10;
    doc.save().roundedRect(photoX, photoY, photoW, photoH, 8).clip();
    const photoPath = assetMap[rec.photo_url];
    if (photoPath) {
        try { doc.image(photoPath, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' }); }
        catch { doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9'); }
    } else {
        doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9');
    }
    doc.restore();

    // Vertical Divider (Dotted line effect)
    const dividerX = photoX + photoW + 10;
    doc.save();
    doc.dash(1, { space: 2 }).strokeColor(BORDER).moveTo(dividerX, bodyY + 10).lineTo(dividerX, bodyY + bodyH - 10).stroke();
    doc.restore();

    // Details (Right side of Body)
    const detailsX = dividerX + 10, detailsW = width - (detailsX - x) - 10;
    let dy = bodyY + 10;

    const drawDetail = (label, value, isStatus = false) => {
        if (!value || value === '—') return;

        // Bullet
        doc.circle(detailsX - 5, dy + 4, 1.5).fill(AMBER);

        // Label
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6).text(label.toUpperCase(), detailsX, dy);
        dy += 8;

        // Value
        if (isStatus && value.toUpperCase() === 'PRESENT') {
            doc.save().roundedRect(detailsX, dy - 2, 50, 12, 3).fill(GREEN).restore();
            doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7).text(value.toUpperCase(), detailsX, dy + 0.5, { width: 50, align: 'center' });
            dy += 16;
        } else {
            doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8).text(String(value), detailsX, dy, { width: detailsW });
            dy += doc.heightOfString(String(value), { width: detailsW, fontSize: 8 }) + 6;
        }
    };

    drawDetail('Site', rec.site_name);
    drawDetail('Date & Time', `${rec.date} · ${rec.time}`);
    drawDetail('Status', rec.status || 'PRESENT', true);
    drawDetail('Notes', rec.notes);

    // Map Snapshot (Bottom Right)
    const mapW = detailsW, mapH = 35;
    const mapX = detailsX, mapY = bodyY + bodyH - 55;
    doc.save().roundedRect(mapX, mapY, mapW, mapH, 4).clip();
    const tileUrl = getTileUrl(rec.report_lat, rec.report_lng);
    const tilePath = assetMap[tileUrl];
    if (tilePath) {
        try { doc.image(tilePath, mapX, mapY, { width: mapW, height: mapH, fit: [mapW, mapH] }); }
        catch { doc.rect(mapX, mapY, mapW, mapH).fill('#f1f5f9'); }
    } else {
        doc.rect(mapX, mapY, mapW, mapH).fill('#f1f5f9');
    }
    doc.restore();

    // GPS Text
    if (rec.report_lat) {
        const gpsText = `Ø-ÚÍ ${parseFloat(rec.report_lat).toFixed(5)}, ${parseFloat(rec.report_lng).toFixed(5)} · OpenStreetMap`;
        doc.fillColor(MUTED).font('Helvetica').fontSize(5.5).text(gpsText, mapX, mapY + mapH + 3, { width: mapW, align: 'left' });
    }

    return CARD_H;
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
    if (y + TH + RH > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); }
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

async function renderGridLogs(doc, records, assetMap, startY, headerFn) {
    const CARD_W = (CW - 15) / 2;
    const CARD_H = 180;
    const GAP = 15;
    let y = startY;

    for (let i = 0; i < records.length; i++) {
        const col = i % 2;
        const x = ML + col * (CARD_W + GAP);

        // Check for page break (on new row start or if both columns overflow)
        if (col === 0 && (y + CARD_H + 20 > PH - BOT)) {
            doc.addPage();
            y = headerFn(doc);
        }

        await v2_logCard(doc, records[i], y, x, CARD_W, i, assetMap);

        // Move Y only after second column
        if (col === 1 || i === records.length - 1) {
            y += CARD_H + GAP;
        }
    }
    return y;
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
        await renderGridLogs(doc, records, assetMap, y, v2_pageHeaderRepeat);

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
        await renderGridLogs(doc, records, assetMap, y, v2_pageHeaderRepeat);

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
        await renderGridLogs(doc, records, assetMap, y, v2_pageHeaderRepeat);

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
        await renderGridLogs(doc, records, assetMap, y, v2_pageHeaderRepeat);

        doc.end();
    } finally { cleanupAssets(assetMap); }
};

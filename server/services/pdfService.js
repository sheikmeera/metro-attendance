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
    const CARD_H = 220, HEADER_H = 30, R = 8;
    const PAD = 12;

    // Card Container
    doc.save()
        .roundedRect(x, y, width, CARD_H, R)
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .stroke()
        .restore();

    // Header
    doc.save()
        .roundedRect(x, y, width, HEADER_H, R)
        .clip()
        .rect(x, y, width, HEADER_H)
        .fill(DARK)
        .restore();

    // Badge
    doc.save().roundedRect(x + 10, y + 6, 26, 18, 4).fill(AMBER).restore();
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text(`#${index + 1}`, x + 10, y + 11, { width: 26, align: 'center' });

    // ID & Name
    const nameText = `${rec.employee_name || '—'}  (${rec.employee_id || '—'})`;
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text(nameText, x + 45, y + 10, { width: width - 180 });

    // Date & Time (Top Right)
    const dateTime = `${rec.date || ''}  ${rec.time || ''}`;
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8.5).text(dateTime, x + width - 130, y + 11, { width: 120, align: 'right' });

    // Body Area
    const bodyY = y + HEADER_H + PAD;
    const photoW = (width * 0.32), photoH = CARD_H - HEADER_H - (PAD * 2);
    const photoX = x + PAD;

    // Photo
    doc.save().roundedRect(photoX, bodyY, photoW, photoH, 8).clip();
    const photoPath = assetMap[rec.photo_url];
    if (photoPath) {
        try { doc.image(photoPath, photoX, bodyY, { fit: [photoW, photoH], align: 'center', valign: 'center' }); }
        catch { doc.rect(photoX, bodyY, photoW, photoH).fill('#f1f5f9'); }
    } else {
        doc.rect(photoX, bodyY, photoW, photoH).fill('#f1f5f9');
    }
    doc.restore();

    // Content area (Middle)
    const contentX = photoX + photoW + PAD;
    const contentW = (width * 0.3);
    let dy = bodyY;

    const drawDetail = (label, value, isStatus = false) => {
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.5).text(label.toUpperCase(), contentX, dy);
        dy += 9;
        if (isStatus && value?.toUpperCase() === 'PRESENT') {
            doc.save().roundedRect(contentX, dy - 1, 44, 11, 3).fill(GREEN).restore();
            doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text(value.toUpperCase(), contentX, dy + 0.5, { width: 44, align: 'center' });
            dy += 15;
        } else {
            doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8.5).text(String(value || '—'), contentX, dy, { width: contentW });
            dy += doc.heightOfString(String(value || '—'), { width: contentW, fontSize: 8.5 }) + 7;
        }
    };

    drawDetail('Employee Dept', rec.department);
    drawDetail('Site / Project', rec.site_name);
    drawDetail('Status Key', rec.status || 'PRESENT', true);
    if (rec.notes) drawDetail('Supervisor Notes', rec.notes);

    // Map & GPS (Right)
    const mapX = contentX + contentW + PAD;
    const mapW = width - (mapX - x) - PAD;
    const mapH = CARD_H - HEADER_H - (PAD * 2) - 30;

    // Map Snapshot
    doc.save().roundedRect(mapX, bodyY, mapW, mapH, 6).clip();
    const tileUrl = getTileUrl(rec.report_lat, rec.report_lng);
    const tilePath = assetMap[tileUrl];
    if (tilePath) {
        try {
            doc.image(tilePath, mapX, bodyY, { width: mapW, height: mapH });
            // Draw marker in center (tiles are 256x256, we fit them)
            // Since we use getTileUrl zoom 15, we assume the point is inside the tile.
            const markerX = mapX + (mapW / 2);
            const markerY = bodyY + (mapH / 2);
            doc.circle(markerX, markerY, 5).fill(RED);
            doc.circle(markerX, markerY, 6).lineWidth(1.5).strokeColor(WHITE).stroke();
        }
        catch { doc.rect(mapX, bodyY, mapW, mapH).fill('#f1f5f9'); }
    } else {
        doc.rect(mapX, bodyY, mapW, mapH).fill('#f1f5f9');
    }
    doc.restore();

    // GPS Details
    if (rec.report_lat) {
        let gy = bodyY + mapH + 6;
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(6.5).text('GPS GEOTAG', mapX, gy);
        gy += 9;
        const latLong = `${parseFloat(rec.report_lat).toFixed(6)}, ${parseFloat(rec.report_lng).toFixed(6)}`;
        doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(latLong, mapX, gy);
        gy += 11;
        doc.fillColor(MUTED).font('Helvetica').fontSize(5.5).text('METRO GEOTAG VERIFIED', mapX, gy, { width: mapW });
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
    const CARD_W = CW;
    const CARD_H = 200;
    const GAP = 20;
    let y = startY;

    for (let i = 0; i < records.length; i++) {
        // Check for page break
        if (y + CARD_H + 30 > PH - BOT) {
            doc.addPage();
            y = headerFn(doc);
        }

        await v2_logCard(doc, records[i], y, ML, CARD_W, i, assetMap);
        y += CARD_H + GAP;
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

exports.generateMonthlySummaryLog = async (output, monthYear, data) => {
    const { sites, employees, stats } = data;
    // Pre-fetch employee avatars for the summary if any
    const avatars = employees.map(e => e.avatar).filter(Boolean);
    const assetMap = await preFetchAssets([], avatars);

    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        if (output.setHeader) {
            output.setHeader('Content-Type', 'application/pdf');
            output.setHeader('Content-Disposition', `attachment; filename="monthly_summary_${monthYear}.pdf"`);
        }
        doc.pipe(output);

        let y = v2_pageHeader(doc, `Monthly Summary: ${monthYear}`, `Metro Electricals & Engineering — Executive Report`);

        // ── Metrics Row ──────────────────────────────────────────
        y = v2_heading(doc, 'Monthly Key Metrics', y);
        const metrics = [
            { label: 'Total Reports', value: stats.totalReports },
            { label: 'Active Sites', value: stats.activeSites },
            { label: 'Closed Sites', value: stats.closedSites },
            { label: 'Employee Count', value: employees.length }
        ];

        doc.fillColor(LIGHT).rect(ML, y, CW, 50).fill();
        let mx = ML + 20;
        metrics.forEach(m => {
            doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text(m.label.toUpperCase(), mx, y + 12);
            doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(16).text(String(m.value), mx, y + 24);
            mx += CW / 4;
        });
        y += 65;

        // ── Sites List ───────────────────────────────────────────
        y = v2_heading(doc, 'Sites Handled This Month', y);
        const siteCols = [{ label: 'SITE NAME', w: 180 }, { label: 'CLIENT', w: 150 }, { label: 'STATUS', w: 100 }, { label: 'DATE', w: 100 }];
        const siteRows = sites.map(s => [
            s.site_name,
            s.client_name || '—',
            s.status?.toUpperCase(),
            s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-GB') : (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '—')
        ]);
        y = v2_summaryTable(doc, siteCols, siteRows, y);

        // ── Employee Performance ─────────────────────────────────
        if (y + 100 > PH - BOT) { doc.addPage(); y = v2_pageHeaderRepeat(doc); }
        y = v2_heading(doc, 'Employee Attendance & Engagement', y);
        const empCols = [{ label: 'EMPLOYEE', w: 170 }, { label: 'ID', w: 80 }, { label: 'DEPT', w: 110 }, { label: 'DAYS PRESENT', w: 80 }, { label: 'TOTAL LOGS', w: 80 }];
        const empRows = employees.map(e => [
            e.name,
            e.id,
            e.department || '—',
            e.uniqueDays,
            e.totalReports
        ]);
        y = v2_summaryTable(doc, empCols, empRows, y);

        // Footer note
        doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.5).text('This report is automatically generated by the Metro Attendance System.', ML, PH - 35, { width: CW, align: 'center' });

        doc.end();
    } finally { cleanupAssets(assetMap); }
};

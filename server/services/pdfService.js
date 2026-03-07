/**
 * services/pdfService.js — Metro Electricals
 *
 * DESIGN: Dark-header brand page, amber accent, clean white cards.
 * Each attendance LOG CARD = image (50% width left) + detail grid (right).
 * OSM map tile embedded per card when GPS available.
 * Strict manual Y-tracking to prevent misalignment.
 */
const PDFDocument = require('pdfkit')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const { translateText } = require('../utils/translateHelper')

// ── Paths ─────────────────────────────────────────────────────
const LOGO_PATH = (() => {
    const candidates = [
        path.join(__dirname, '../../public/logo.jpeg'),
        path.join(__dirname, '../logo.jpeg'),
        path.join(__dirname, '../../public/logo.png'),
        path.join(__dirname, '../logo.png'),
    ]
    return candidates.find(p => fs.existsSync(p)) || ''
})()
const UPLOADS_DIR = path.join(__dirname, '../uploads')

// ── Palette ───────────────────────────────────────────────────
const AMBER = '#f59e0b'
const DARK = '#0f172a'
const NAVY = '#1e293b'
const TEXT = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'
const LIGHT = '#f8fafc'
const WHITE = '#ffffff'
const GREEN = '#10b981'
const RED = '#ef4444'

// ── Page dimensions (A4) ──────────────────────────────────────
const PW = 595.28
const PH = 841.89
const ML = 32        // left margin
const MR = 32        // right margin
const CW = PW - ML - MR   // 531 pt content width
const BOT = 48        // bottom safe zone

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

function resolvePhoto(raw, tempFiles) {
    if (!raw || raw === '👤') return null

    // Handle Cloudinary / Remote URLs
    if (raw.startsWith?.('http')) {
        const tmp = path.join(UPLOADS_DIR, `.remote_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)
        try {
            execSync(`curl -s -L "${raw}" -o "${tmp}"`, { timeout: 10000 })
            if (fs.existsSync(tmp)) {
                if (tempFiles) tempFiles.push(tmp)
                return tmp
            }
        } catch (err) {
            console.error('[PDF] Failed to download remote image:', raw, err.message)
            return null
        }
    }

    if (raw.startsWith?.('/uploads')) {
        const abs = path.join(__dirname, '..', raw.replace(/^\/uploads/, 'uploads'))
        if (fs.existsSync(abs)) return abs
    }
    const alt = path.join(UPLOADS_DIR, path.basename(raw))
    if (fs.existsSync(alt)) return alt
    return null
}

function fetchTile(lat, lng, zoom = 15) {
    if (!lat || !lng) return null
    const tmp = path.join(UPLOADS_DIR, `.tile_${Date.now()}.png`)
    try {
        const lr = parseFloat(lat) * Math.PI / 180
        const n = 1 << zoom
        const tx = Math.floor((parseFloat(lng) + 180) / 360 * n)
        const ty = Math.floor((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n)
        const url = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`
        execSync(`curl -s -L -A "MetroElectricals/1.0" "${url}" -o "${tmp}"`, { timeout: 8000 })
        return fs.existsSync(tmp) ? tmp : null
    } catch { rmTile(tmp); return null }
}

function rmTile(p) { if (p) try { fs.unlinkSync(p) } catch { } }

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT HELPERS
// ═══════════════════════════════════════════════════════════════════

function pageHeader(doc, title, sub) {
    const H = 88
    doc.rect(0, 0, PW, H).fill(DARK)
    doc.rect(0, H, PW, 3).fill(AMBER)

    if (fs.existsSync(LOGO_PATH)) {
        try { doc.image(LOGO_PATH, ML, 10, { fit: [64, 64] }) } catch (e) { console.error('Logo embed failed:', e.message) }
    }
    const tx = ML + 72
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(9)
        .text('METRO ELECTRICALS', tx, 18)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
        .text(title, tx, 34, { width: PW - tx - MR })
    if (sub) doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(sub, tx, 58, { width: PW - tx - MR })

    return H + 3 + 10
}

function heading(doc, label, y) {
    if (y + 26 > PH - BOT) { doc.addPage(); y = pageHeaderRepeat(doc) }
    doc.rect(ML, y, CW, 24).fill(NAVY)
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8.5)
        .text(label.toUpperCase(), ML + 8, y + 8, { width: CW - 16, lineBreak: false })
    return y + 24 + 6
}

function pageHeaderRepeat(doc) {
    const H = 44
    doc.rect(0, 0, PW, H).fill(DARK)
    doc.rect(0, H, PW, 2).fill(AMBER)
    doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8)
        .text('METRO ELECTRICALS  —  Continued', ML, 16, { width: CW })
    return H + 2 + 10
}

function profileCard(doc, rows, y, tempFiles) {
    const ROW_H = 22
    const PAD = 10
    const textRows = rows.filter(r => !r.isAvatar)
    const avatarRow = rows.find(r => r.isAvatar)
    const totalH = Math.max(PAD + textRows.length * ROW_H + PAD, avatarRow ? PAD + 70 + PAD : 0)
    if (y + totalH + 8 > PH - BOT) { doc.addPage(); y = pageHeaderRepeat(doc) }

    doc.fillColor(LIGHT).strokeColor(BORDER).rect(ML, y, CW, totalH).fillAndStroke()
    doc.fillColor(AMBER).rect(ML, y, 3, totalH).fill()

    textRows.forEach((row, i) => {
        const ry = y + PAD + i * ROW_H
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5)
            .text((row.label + ':').toUpperCase(), ML + 10, ry + 5, { width: 110, lineBreak: false })
        doc.fillColor(TEXT).font('Helvetica').fontSize(8.5)
            .text(String(row.value ?? '—'), ML + 126, ry + 5, { width: CW - 136 - 80, lineBreak: false })
    })

    if (avatarRow && avatarRow.value) {
        const photo = resolvePhoto(avatarRow.value, tempFiles)
        if (photo) {
            try {
                const s = 64
                const ax = ML + CW - s - 10, ay = y + PAD
                doc.image(photo, ax, ay, { width: s, height: s, fit: [s, s] })
                doc.rect(ax, ay, s, s).strokeColor(BORDER).lineWidth(0.5).stroke()
            } catch (e) { console.error('Avatar embed failed:', e.message) }
        }
    }
    return y + totalH + 10
}

function logCard(doc, rec, detailRows, y, index, options = {}) {
    const CARD_H = 250
    const HEADER_H = 28
    const R = 6

    if (y + CARD_H + 20 > PH - BOT) { doc.addPage(); y = pageHeaderRepeat(doc) }

    // Header
    doc.save()
    doc.roundedRect(ML, y, CW, HEADER_H, R).clip()
    doc.rect(ML, y, CW, HEADER_H).fill(DARK)
    doc.restore()

    const badgeW = 24, badgeH = 18
    doc.save()
    doc.roundedRect(ML + 8, y + (HEADER_H - badgeH) / 2, badgeW, badgeH, 4).fill(AMBER)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
        .text(`#${index + 1}`, ML + 8, y + (HEADER_H - badgeH) / 2 + 5, { width: badgeW, align: 'center' })
    doc.restore()

    const headerTitle = options.title || `${rec.employee_name || '—'}  ·  ${rec.employee_id || '—'}`
    const headerSub = options.sub || `${rec.date} . ${rec.time}`

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
        .text(headerTitle, ML + badgeW + 20, y + 9)

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(headerSub, ML + CW - 180 - 12, y + 10, { width: 180, align: 'right' })

    // Body
    const bodyY = y + HEADER_H
    const bodyH = CARD_H - HEADER_H
    doc.save()
    doc.fillColor(WHITE).strokeColor(BORDER).roundedRect(ML, bodyY, CW, bodyH, R).fillAndStroke()
    doc.restore()

    // 2-Column Split
    const COL_W = (CW - 30) / 2
    const photoX = ML + 10, photoY = bodyY + 10, photoW = COL_W, photoH = bodyH - 20
    const photoPath = resolvePhoto(rec.photo_url, options.tempFiles)
    const hasPhoto = photoPath && photoPath !== '👤'

    // Content Left: Photo
    doc.save()
    doc.roundedRect(photoX, photoY, photoW, photoH, 6).clip()
    if (hasPhoto) {
        try { doc.image(photoPath, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' }) }
        catch { doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9') }
    } else {
        doc.rect(photoX, photoY, photoW, photoH).fill('#f1f5f9')
    }
    doc.restore()
    doc.roundedRect(photoX, photoY, photoW, photoH, 6).strokeColor(BORDER).lineWidth(0.5).stroke()

    // Separator
    const sepX = photoX + photoW + 10
    doc.save()
    doc.dash(1, { space: 2 })
    doc.moveTo(sepX, bodyY + 10).lineTo(sepX, bodyY + bodyH - 10).strokeColor(BORDER).stroke()
    doc.restore()

    // Content Right
    const detailX = sepX + 10, detailW = COL_W
    let currentY = bodyY + 10

    detailRows.forEach((row) => {
        if (!row.value || row.value === '—') return
        if (currentY > bodyY + bodyH - 75) return // Collision check
        doc.circle(detailX, currentY + 4, 1.5).fill(AMBER)
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.5).text(row.label.toUpperCase(), detailX + 8, currentY)
        currentY += 8
        const val = String(row.value)
        if (row.label.toLowerCase() === 'status') {
            const isPresent = val.toUpperCase() === 'PRESENT' || val.toUpperCase() === 'AUTO'
            const pillColor = isPresent ? GREEN : AMBER
            doc.save()
            doc.roundedRect(detailX + 8, currentY - 1, 45, 12, 3).fill(pillColor)
            doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(6.5).text(val.toUpperCase(), detailX + 8, currentY + 2, { width: 45, align: 'center' })
            doc.restore()
            currentY += 16
        } else {
            doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8).text(val, detailX + 8, currentY, { width: detailW - 10 })
            currentY += doc.heightOfString(val, { width: detailW - 10, font: 'Helvetica-Bold', fontSize: 8 }) + 6
        }
    })

    // Map box
    const mapW = detailW - 10, mapH = 45, mapX = detailX + 5, mapY = bodyY + bodyH - mapH - 24
    doc.save()
    doc.roundedRect(mapX, mapY, mapW, mapH, 6).clip()
    if (rec.report_lat && rec.report_lng) {
        const tile = fetchTile(rec.report_lat, rec.report_lng, 15)
        if (tile) {
            try {
                const latRad = parseFloat(rec.report_lat) * Math.PI / 180
                const nZoom = 1 << 15
                const exactX = (parseFloat(rec.report_lng) + 180) / 360 * nZoom
                const exactY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * nZoom
                const fracX = exactX - Math.floor(exactX), fracY = exactY - Math.floor(exactY)
                const renderSize = 256
                doc.image(tile, mapX + (mapW / 2) - (fracX * renderSize), mapY + (mapH / 2) - (fracY * renderSize), { width: renderSize })
                doc.circle(mapX + mapW / 2, mapY + mapH / 2, 3).fill(RED)
                doc.circle(mapX + mapW / 2, mapY + mapH / 2, 1).fill(WHITE)
            } catch { }
            rmTile(tile)
        } else { doc.rect(mapX, mapY, mapW, mapH).fill('#f1f5f9') }
    } else {
        doc.rect(mapX, mapY, mapW, mapH).fill('#f1f5f9')
        doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('NO GPS DATA', mapX, mapY + 20, { width: mapW, align: 'center' })
    }
    doc.restore()
    doc.roundedRect(mapX, mapY, mapW, mapH, 6).strokeColor(BORDER).lineWidth(0.5).stroke()

    if (rec.report_lat && rec.report_lng) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(6)
            .text(`GPS: ${parseFloat(rec.report_lat).toFixed(5)}, ${parseFloat(rec.report_lng).toFixed(5)} . OSM`, mapX, mapY + mapH + 3, { width: mapW, align: 'center' })
    }

    return y + CARD_H + 15
}

function summaryTable(doc, cols, rows, startY) {
    let y = startY
    const TH = 26, RH = 24, GAP = 6
    const drawTH = (atY) => {
        doc.rect(ML, atY, CW, TH).fill(NAVY)
        let x = ML + 8
        doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(8)
        cols.forEach(c => { doc.text(c.label, x, atY + 9, { width: c.w - 8, lineBreak: false }); x += c.w })
        return atY + TH + GAP
    }
    y = drawTH(y)
    rows.forEach((row, i) => {
        if (y + RH > PH - BOT) { doc.addPage(); y = pageHeaderRepeat(doc); y = drawTH(y) }
        doc.fillColor(WHITE).strokeColor('#cbd5e1').rect(ML, y, CW, RH).fillAndStroke()
        let x = ML + 8
        doc.fillColor(TEXT).font('Helvetica').fontSize(8.5)
        row.forEach((val, j) => {
            doc.text(String(val ?? '—'), x, y + 7, { width: cols[j].w - 8, lineBreak: false })
            x += cols[j].w
        })
        y += RH + GAP
    })
    return y + 8
}

function generateEmployeeLog(output, employeeName, records, empData = {}, lang = 'en') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempFiles = []
            if (lang !== 'en') {
                employeeName = await translateText(employeeName, lang);
                if (empData.name) empData.name = await translateText(empData.name, lang);
                if (empData.department) empData.department = await translateText(empData.department, lang);
                await Promise.all(records.map(async r => {
                    if (r.site_name) r.site_name = await translateText(r.site_name, lang);
                    if (r.notes) r.notes = await translateText(r.notes, lang);
                }));
            }
            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
            if (output.setHeader) {
                output.setHeader('Content-Type', 'application/pdf')
                output.setHeader('Content-Disposition', `attachment; filename="metro_emp_${employeeName.replace(/\s/g, '_')}.pdf"`)
            }
            doc.pipe(output)
            let y = pageHeader(doc, `Employee Report: ${employeeName}`, `Generated: ${new Date().toLocaleString('en-IN')} . ${records.length} record(s)`)
            y = heading(doc, 'Employee Profile', y)
            y = profileCard(doc, [
                { label: 'Full Name', value: empData.name || employeeName },
                { label: 'Employee ID', value: empData.id || records[0]?.employee_id },
                { label: 'Department', value: empData.department },
                { label: 'Status', value: empData.status || 'active' },
                { label: 'avatar', value: empData.avatar || records[0]?.avatar, isAvatar: true },
            ], y, tempFiles)
            if (records.length === 0) {
                doc.fillColor(MUTED).fontSize(10).text('No attendance records found.', ML, y)
                doc.end(); resolve(); return
            }
            y = heading(doc, `Attendance Logs — ${records.length} record(s)`, y)
            records.forEach((r, i) => {
                y = logCard(doc, r, [
                    { label: 'EMPLOYEE', value: `${r.employee_name} (${r.employee_id})` },
                    { label: 'SITE', value: r.site_name || '—' },
                    { label: 'DATE & TIME', value: `${r.date} . ${r.time}` },
                    { label: 'STATUS', value: r.status?.toUpperCase() },
                    { label: 'NOTES', value: r.notes || '—' },
                ], y, i, { title: r.site_name || '—', sub: `${r.date} . ${r.time}`, tempFiles })
            })
            doc.on('end', () => { tempFiles.forEach(f => rmTile(f)); resolve() });
            doc.on('error', (err) => reject(err));
            doc.end()
        } catch (err) { reject(err); }
    });
}

function generateSiteLog(output, siteName, records, siteData = {}, lang = 'en') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempFiles = []
            if (lang !== 'en') {
                siteName = await translateText(siteName, lang);
                if (siteData.site_name) siteData.site_name = await translateText(siteData.site_name, lang);
                if (siteData.client_name) siteData.client_name = await translateText(siteData.client_name, lang);
                if (siteData.location_name) siteData.location_name = await translateText(siteData.location_name, lang);
                if (siteData.work_details) siteData.work_details = await translateText(siteData.work_details, lang);
                await Promise.all(records.map(async r => {
                    if (r.employee_name) r.employee_name = await translateText(r.employee_name, lang);
                    if (r.department) r.department = await translateText(r.department, lang);
                    if (r.notes) r.notes = await translateText(r.notes, lang);
                }));
            }
            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
            if (output.setHeader) {
                output.setHeader('Content-Type', 'application/pdf')
                output.setHeader('Content-Disposition', `attachment; filename="metro_site_${siteName.replace(/[^a-z0-9]/gi, '_')}.pdf"`)
            }
            doc.pipe(output)
            let y = pageHeader(doc, `Site Report: ${siteName}`, `Generated: ${new Date().toLocaleString('en-IN')} . ${records.length} record(s)`)
            y = heading(doc, 'Site Profile', y)
            y = profileCard(doc, [
                { label: 'Site Name', value: siteData.site_name || siteName },
                { label: 'Client', value: siteData.client_name },
                { label: 'Location', value: siteData.location_name },
                { label: 'Work Details', value: siteData.work_details },
                { label: 'Status', value: siteData.status },
                { label: 'Created', value: siteData.created_at ? new Date(siteData.created_at).toLocaleDateString('en-IN') : '—' },
            ], y, tempFiles)
            if (records.length === 0) {
                doc.fillColor(MUTED).fontSize(10).text('No records.', ML, y)
                doc.end(); resolve(); return
            }
            const empDays = {}
            records.forEach(r => {
                if (!empDays[r.employee_id]) empDays[r.employee_id] = { name: r.employee_name, dept: r.department, days: new Set() }
                empDays[r.employee_id].days.add(r.date)
            })
            const summaryRows = Object.keys(empDays).map(id => [empDays[id].name, id, empDays[id].dept || '—', empDays[id].days.size.toString() + ' Day(s)'])
            y = heading(doc, `Employee Summary — ${summaryRows.length} Employee(s)`, y + 12)
            y = summaryTable(doc, [{ label: 'EMPLOYEE', w: 180 }, { label: 'ID', w: 100 }, { label: 'DEPARTMENT', w: 150 }, { label: 'DAYS REPORTED', w: 100 }], summaryRows, y)
            y = heading(doc, `Detailed Logs — ${records.length} record(s)`, y + 16)
            y = summaryTable(doc, [{ label: 'EMPLOYEE', w: 130 }, { label: 'ID', w: 65 }, { label: 'DEPT', w: 90 }, { label: 'DATE', w: 90 }, { label: 'TIME', w: 60 }, { label: 'STATUS', w: 65 }], records.map(r => [r.employee_name, r.employee_id, r.department || '—', r.date, r.time, r.status]), y)
            doc.addPage(); y = pageHeader(doc, `Site Report: ${siteName} — Logs`, `Attendance log for ${siteName}`); y = heading(doc, 'Attendance Photo & Location Cards', y + 8)
            records.forEach((r, i) => {
                y = logCard(doc, r, [
                    { label: 'EMPLOYEE', value: `${r.employee_name} (${r.employee_id})` },
                    { label: 'SITE', value: r.site_name || '—' },
                    { label: 'DATE & TIME', value: `${r.date} . ${r.time}` },
                    { label: 'STATUS', value: r.status?.toUpperCase() },
                    { label: 'NOTES', value: r.notes || '—' },
                ], y, i, { title: `${r.employee_name} (${r.employee_id})`, sub: `${r.date} . ${r.time}`, tempFiles })
            })
            doc.on('end', () => { tempFiles.forEach(f => rmTile(f)); resolve() });
            doc.on('error', (err) => reject(err));
            doc.end()
        } catch (err) { reject(err); }
    });
}

function generateDailyLog(output, date, records, lang = 'en') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempFiles = []
            if (lang !== 'en') {
                await Promise.all(records.map(async r => {
                    if (r.employee_name) r.employee_name = await translateText(r.employee_name, lang);
                    if (r.department) r.department = await translateText(r.department, lang);
                    if (r.site_name) r.site_name = await translateText(r.site_name, lang);
                    if (r.notes) r.notes = await translateText(r.notes, lang);
                }));
            }
            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
            if (output.setHeader) {
                output.setHeader('Content-Type', 'application/pdf')
                output.setHeader('Content-Disposition', `attachment; filename="metro_daily_${date}.pdf"`)
            }
            doc.pipe(output)
            let y = pageHeader(doc, `Daily Attendance: ${date}`, `Generated: ${new Date().toLocaleString('en-IN')} . ${records.length} record(s)`)
            if (records.length === 0) {
                doc.fillColor(MUTED).fontSize(11).text('No records for this date.', ML, y + 20)
                doc.end(); resolve(); return
            }
            y = heading(doc, `Summary — ${records.length} record(s)`, y)
            y = summaryTable(doc, [{ label: 'EMPLOYEE', w: 120 }, { label: 'ID', w: 65 }, { label: 'DEPT', w: 85 }, { label: 'SITE', w: 110 }, { label: 'TIME', w: 60 }, { label: 'STATUS', w: 60 }], records.map(r => [r.employee_name, r.employee_id, r.department || '—', r.site_name || '—', r.time, r.status]), y)
            doc.addPage(); y = pageHeader(doc, `Daily Logs: ${date} — Details`, `Attendance logs with photos and GPS for ${date}`); y = heading(doc, 'Attendance Photo & Location Cards', y + 8)
            records.forEach((r, i) => {
                y = logCard(doc, r, [
                    { label: 'EMPLOYEE', value: `${r.employee_name} (${r.employee_id})` },
                    { label: 'SITE', value: r.site_name || '—' },
                    { label: 'DATE & TIME', value: `${r.date} . ${r.time}` },
                    { label: 'STATUS', value: r.status?.toUpperCase() },
                    { label: 'NOTES', value: r.notes || '—' },
                ], y, i, { title: `${r.employee_name} (${r.employee_id})`, sub: r.time, tempFiles })
            })
            doc.on('end', () => { tempFiles.forEach(f => rmTile(f)); resolve() });
            doc.on('error', (err) => reject(err));
            doc.end()
        } catch (err) { reject(err); }
    });
}

function generateMonthlyEmployeeLog(output, employeeName, monthYear, records, empData = {}, lang = 'en') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempFiles = []
            if (lang !== 'en') {
                employeeName = await translateText(employeeName, lang);
                if (empData.name) empData.name = await translateText(empData.name, lang);
                if (empData.department) empData.department = await translateText(empData.department, lang);
                await Promise.all(records.map(async r => {
                    if (r.site_name) r.site_name = await translateText(r.site_name, lang);
                    if (r.notes) r.notes = await translateText(r.notes, lang);
                }));
            }
            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
            if (output.setHeader) {
                output.setHeader('Content-Type', 'application/pdf')
                output.setHeader('Content-Disposition', `attachment; filename="metro_monthly_${employeeName.replace(/\s/g, '_')}_${monthYear}.pdf"`)
            }
            doc.pipe(output)
            let y = pageHeader(doc, `Monthly Employee Report: ${employeeName}`, `Period: ${monthYear} . Generated: ${new Date().toLocaleString('en-IN')} . ${records.length || 0} record(s)`)
            y = heading(doc, 'Employee Profile', y)
            y = profileCard(doc, [{ label: 'Full Name', value: empData.name || employeeName }, { label: 'Employee ID', value: empData.id || records[0]?.employee_id }, { label: 'Department', value: empData.department }, { label: 'Status', value: empData.status || 'active' }, { label: 'avatar', value: empData.avatar || records[0]?.avatar, isAvatar: true }], y, tempFiles)
            if (records.length === 0) {
                doc.fillColor(MUTED).fontSize(10).text('No attendance records found for this month.', ML, y)
                doc.end(); resolve(); return
            }
            y = heading(doc, `Monthly Attendance Summary — ${records.length} record(s)`, y)
            y = summaryTable(doc, [{ label: 'DATE', w: 80 }, { label: 'SITE', w: 150 }, { label: 'TIME', w: 100 }, { label: 'STATUS', w: 100 }, { label: 'VERIFIED', w: 100 }], records.map(r => [r.date, r.site_name || '—', r.time, r.status, r.verified ? 'YES' : 'NO']), y)
            doc.addPage(); y = pageHeader(doc, `Monthly Details: ${employeeName}`, `Detailed logs for ${monthYear}`); y = heading(doc, 'Daily Inspection Logs', y + 8)
            records.forEach((r, i) => {
                y = logCard(doc, r, [
                    { label: 'EMPLOYEE', value: `${r.employee_name} (${r.employee_id})` },
                    { label: 'SITE', value: r.site_name || '—' },
                    { label: 'DATE & TIME', value: `${r.date} . ${r.time}` },
                    { label: 'STATUS', value: r.status?.toUpperCase() },
                    { label: 'NOTES', value: r.notes || '—' },
                ], y, i, { title: r.site_name || '—', sub: `${r.date} . ${r.time}`, tempFiles })
            })
            doc.on('end', () => { tempFiles.forEach(f => rmTile(f)); resolve() });
            doc.on('error', (err) => reject(err));
            doc.end()
        } catch (err) { reject(err); }
    });
}

module.exports = { generateDailyLog, generateSiteLog, generateEmployeeLog, generateMonthlyEmployeeLog }

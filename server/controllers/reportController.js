/**
 * controllers/reportController.js — Employee site reporting
 * Handles GPS validation + photo upload + attendance auto-marking
 */
const Report = require('../models/Report')
const Site = require('../models/Site')
const Attendance = require('../models/Attendance')
const Employee = require('../models/Employee')
const SiteAssignment = require('../models/SiteAssignment')

// Haversine formula — returns distance in meters between two GPS coords
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000 // Earth radius in meters
    const toRad = d => (d * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// POST /api/employee/report   (multipart/form-data with optional photo)
exports.submitReport = async (req, res) => {
    try {
        const { site_id, latitude, longitude, notes } = req.body
        const employee_id = req.user.id

        if (!site_id) return res.status(400).json({ error: 'site_id is required.' })

        // Verify employee is assigned to this site
        const assignment = await SiteAssignment.findOne({ site_id, employee_id })
        if (!assignment) {
            return res.status(403).json({ error: 'You are not assigned to this site.' })
        }

        const site = await Site.findOne({ _id: site_id, status: 'active' })
        if (!site) return res.status(404).json({ error: 'Site not found or is closed.' })

        let photo_url = null
        if (req.file) {
            if (req.file.path.startsWith('http')) {
                photo_url = req.file.path
            } else {
                photo_url = `/uploads/${req.file.filename}`
            }
        }

        // Use IST-aware date (UTC+5:30) for accurate day boundaries in India
        const now = new Date()
        const istOffset = 5.5 * 60 * 60 * 1000
        const istDate = new Date(now.getTime() + istOffset)

        const date = istDate.toISOString().split('T')[0]
        const time = istDate.toISOString().split('T')[1].slice(0, 5) // HH:MM in IST

        console.log(`[Report] Submission attempt: Emp=${employee_id}, Site=${site_id}`);

        // Removed existing report check to allow multiple reporting
        /*
                const existingReport = await Report.findOne({
                    employee_id,
                    site_id,
                    report_time: {
                        $gte: new Date(date),
                        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
                    }
                })
        
                if (existingReport) {
                    return res.status(409).json({ error: 'reporting done', alreadyReported: true })
                }
        */

        // Save report
        const newReport = await Report.create({
            employee_id,
            site_id,
            photo_url,
            latitude: latitude || null,
            longitude: longitude || null,
            notes: notes || null,
            report_time: istDate
        })

        // Create attendance log for this submission (Always create to show in history)
        await Attendance.create({
            employee_id,
            site_id,
            date,
            time,
            status: 'present',
            photo_url,
            latitude: latitude || null,
            longitude: longitude || null
        })

        console.log(`[Report] Success: id=${newReport.id}, photo=${photo_url}`);
        res.status(201).json({ success: true, reportId: newReport.id, message: 'Report submitted and attendance marked.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/employee/report-history
exports.myHistory = async (req, res) => {
    try {
        const reports = await Report.find({ employee_id: req.user.id })
            .sort({ report_time: -1 })
            .limit(50)
            .populate('site_id', 'site_name')
            .lean()

        // Fetch employee to attach avatar to reports
        const emp = await Employee.findOne({ id: req.user.id }, 'name avatar').lean()

        const formatted = reports.map(r => ({
            ...r,
            id: r._id,
            site_name: r.site_id ? r.site_id.site_name : null,
            site_id: r.site_id ? r.site_id._id : null,
            employee_name: emp ? emp.name : null,
            avatar: emp ? emp.avatar : null
        }))

        res.json(formatted)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /api/admin/report/:id/verify — toggle verified flag
exports.verifyReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
        if (!report) return res.status(404).json({ error: 'Report not found.' })

        report.verified = report.verified ? 0 : 1
        await report.save()

        res.json({ success: true, verified: report.verified })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/admin/reports
exports.getAllReports = async (req, res) => {
    try {
        const { employee_id, site_id, date } = req.query
        let query = {}

        if (employee_id) query.employee_id = employee_id
        if (site_id) query.site_id = site_id

        if (date) {
            const startDate = new Date(date)
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 1)

            query.report_time = {
                $gte: startDate,
                $lt: endDate
            }
        }

        const reports = await Report.find(query)
            .sort({ report_time: -1 })
            .populate('site_id', 'site_name')
            .lean()

        // Populate employee data manually
        const populated = await Promise.all(reports.map(async (r) => {
            const emp = await Employee.findOne({ id: r.employee_id }, 'name avatar').lean()
            return {
                ...r,
                id: r._id,
                site_name: r.site_id ? r.site_id.site_name : null,
                site_id: r.site_id ? r.site_id._id : null,
                employee_name: emp ? emp.name : null,
                avatar: emp ? emp.avatar : null
            }
        }))

        res.json(populated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

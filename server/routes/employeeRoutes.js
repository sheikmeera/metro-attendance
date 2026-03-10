/**
 * routes/employeeRoutes.js — Employee-facing endpoints
 */
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const auth = require('../middleware/auth')
const repCtrl = require('../controllers/reportController')

const Employee = require('../models/Employee')
const Site = require('../models/Site')
const SiteAssignment = require('../models/SiteAssignment')
const Attendance = require('../models/Attendance')
const Report = require('../models/Report')

const { reportStorage } = require('../utils/cloudinary')

// Multer + Cloudinary — save uploaded photos to cloud
const upload = multer({
    storage: reportStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true)
        else cb(new Error('Only image files are allowed'))
    },
})

router.use(auth)

// GET /api/employee/sites  — assigned sites for logged-in employee
router.get('/sites', async (req, res) => {
    try {
        const assignments = await SiteAssignment.find({ employee_id: req.user.id })
            .populate('site_id')
            .lean()

        const sites = assignments.map(a => {
            if (!a.site_id) return null;
            return {
                id: a.site_id._id,
                site_name: a.site_id.site_name,
                location_name: a.site_id.location_name,
                client_name: a.site_id.client_name,
                work_details: a.site_id.work_details,
                status: a.site_id.status,
                assigned_at: a.assigned_at
            }
        }).filter(Boolean).sort((a, b) => a.status.localeCompare(b.status) || a.site_name.localeCompare(b.site_name))

        res.json(sites)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// POST /api/employee/report  — submit a report with optional photo
router.post('/report', upload.single('photo'), repCtrl.submitReport)

// GET /api/employee/report-history
router.get('/report-history', repCtrl.myHistory)

// GET /api/employee/attendance  — personal attendance records
router.get('/attendance', async (req, res) => {
    try {
        const { days = 30 } = req.query
        const backDate = new Date()
        backDate.setDate(backDate.getDate() - parseInt(days))

        const [records, emp] = await Promise.all([
            Attendance.find({ employee_id: req.user.id, created_at: { $gte: backDate } })
                .sort({ date: -1 })
                .populate('site_id', 'site_name')
                .lean(),
            Employee.findOne({ id: req.user.id }, 'name avatar').lean()
        ])

        const formatted = records.map(r => ({
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
})

// GET /api/employee/dashboard  — today's status + summary
router.get('/dashboard', async (req, res) => {
    try {
        // Use IST-aware date (UTC+5:30)
        const now = new Date()
        const istOffset = 5.5 * 60 * 60 * 1000
        const istDate = new Date(now.getTime() + istOffset)
        const today = istDate.toISOString().split('T')[0]

        const todayAttRaw = await Attendance.findOne({ employee_id: req.user.id, date: today })
            .populate('site_id', 'site_name')
            .lean()

        // lean() skips toJSON virtuals — add id manually
        const todayAttendance = todayAttRaw
            ? { ...todayAttRaw, id: todayAttRaw._id, site_name: todayAttRaw.site_id?.site_name || null }
            : null

        const assignments = await SiteAssignment.find({ employee_id: req.user.id })
            .populate('site_id', 'site_name location_name status client_name')
            .lean()

        const assignedSites = assignments.map(a => {
            if (!a.site_id) return null
            return {
                id: a.site_id._id,
                site_name: a.site_id.site_name,
                location_name: a.site_id.location_name,
                client_name: a.site_id.client_name,
                status: a.site_id.status
            }
        }).filter(Boolean)

        const backDate = new Date()
        backDate.setDate(backDate.getDate() - 30)

        const [reportsThisMonth, presentThisMonth] = await Promise.all([
            Report.countDocuments({ employee_id: req.user.id, report_time: { $gte: backDate } }),
            Attendance.distinct('date', { employee_id: req.user.id, created_at: { $gte: backDate } })
        ])

        res.json({ todayAttendance, assignedSites, reportsThisMonth, presentThisMonth: presentThisMonth.length })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router

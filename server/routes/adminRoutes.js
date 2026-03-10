/**
 * routes/adminRoutes.js — All admin-only routes
 */
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const auth = require('../middleware/auth')

// Controllers
const empCtrl = require('../controllers/employeeController')
const siteCtrl = require('../controllers/siteController')
const attCtrl = require('../controllers/attendanceController')
const repCtrl = require('../controllers/reportController')
const pdfCtrl = require('../controllers/pdfController')

// Admin only guard
router.use(auth)
router.use((req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' })
    next()
})

const { avatarStorage } = require('../utils/cloudinary')
const uploadAvatar = multer({ storage: avatarStorage })

// ── Employee Routes ──────────────────────────────────────
router.get('/employees', empCtrl.getAll)
router.get('/employees/:id', empCtrl.getOne)
router.post('/employee', uploadAvatar.single('avatar'), empCtrl.create)
router.put('/employee/:id', uploadAvatar.single('avatar'), empCtrl.update)
router.delete('/employee/:id', empCtrl.deactivate)
router.post('/employee/:id/activate', empCtrl.activate)

// ── Site Routes ───────────────────────────────────────────
router.get('/sites', siteCtrl.getAll)
router.get('/sites/:id', siteCtrl.getOne)
router.post('/site', siteCtrl.create)
router.put('/site/:id', siteCtrl.update)
router.put('/site/:id/close', siteCtrl.closeSite)
router.post('/site/assign', siteCtrl.assignEmployee)
router.delete('/site/:siteId/unassign/:empId', siteCtrl.unassignEmployee)

// ── Attendance Routes ─────────────────────────────────────
router.get('/attendance', attCtrl.getAll)
router.get('/attendance/stats', attCtrl.getStats)
router.post('/attendance/manual', attCtrl.manualMark)
router.delete('/attendance/reset', attCtrl.resetAttendance)

// ── Report Routes ─────────────────────────────────────────
router.get('/reports', repCtrl.getAllReports)
router.put('/report/:id/verify', repCtrl.verifyReport)router.delete('/report/:id', repCtrl.deleteReport)
// ── PDF Log Routes ────────────────────────────────────────
router.get('/logs/daily', pdfCtrl.dailyLog)
router.get('/logs/site', pdfCtrl.siteLog)
router.get('/logs/employee', pdfCtrl.employeeLog)

// ── Department Routes ─────────────────────────────────────
const deptCtrl = require('../controllers/departmentController')
router.get('/departments', deptCtrl.getAll)
router.post('/department', deptCtrl.create)
router.delete('/department/:id', deptCtrl.remove)

// ── Automation Routes ─────────────────────────────────────
const automation = require('../automationService')
router.post('/automation/sync', async (req, res) => {
    try {
        await automation.backupDatabase()
        await automation.generateAllReportsBatch()
        res.json({ message: 'Backup and Sync initiated successfully.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router

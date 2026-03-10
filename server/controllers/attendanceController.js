/**
 * controllers/attendanceController.js
 */
const Attendance = require('../models/Attendance')
const Employee = require('../models/Employee')
const Site = require('../models/Site')

// GET /api/admin/attendance?date=YYYY-MM-DD&employee_id=EMP001&site_id=1
exports.getAll = async (req, res) => {
    try {
        const { date, employee_id, site_id } = req.query
        let query = {}

        if (date) query.date = date
        if (employee_id) query.employee_id = employee_id
        if (site_id) query.site_id = site_id

        const records = await Attendance.find(query)
            .sort({ date: -1, time: -1 })
            .populate('site_id', 'site_name')
            .lean() // Plain JavaScript objects

        // Populate employee manually since 'employee_id' in Attendance references the string 'id' from Employee, not ObjectId
        const populatedRecords = await Promise.all(records.map(async (record) => {
            const emp = await Employee.findOne({ id: record.employee_id }, 'name avatar department').lean()
            return {
                ...record,
                id: record._id,
                employee_name: emp ? emp.name : null,
                avatar: emp ? emp.avatar : null,
                department: emp ? emp.department : null,
                site_name: record.site_id ? record.site_id.site_name : null,
                site_id: record.site_id ? record.site_id._id : null
            }
        }))

        res.json(populatedRecords)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/admin/attendance/manual — manual mark
exports.manualMark = async (req, res) => {
    try {
        const { employee_id, site_id, date, time, notes } = req.body
        if (!employee_id || !date || !time) {
            return res.status(400).json({ error: 'employee_id, date, and time are required.' })
        }

        const existing = await Attendance.findOne({ employee_id, date })
        if (existing) return res.status(409).json({ error: 'Attendance already exists for this employee on this date.' })

        const newRecord = await Attendance.create({
            employee_id,
            site_id: site_id || null,
            date,
            time,
            status: 'manual',
            notes: notes || null
        })

        res.status(201).json({ success: true, id: newRecord.id })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/admin/attendance/stats?date=YYYY-MM-DD
exports.getStats = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0]

        const totalEmps = await Employee.countDocuments({ status: 'active', role: 'employee' })
        const present = (await Attendance.distinct('employee_id', { date })).length
        const manual = (await Attendance.distinct('employee_id', { date, status: 'manual' })).length
        const activeSites = await Site.countDocuments({ status: 'active' })

        // Report logic
        const Report = require('../models/Report')
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        const reportsToday = await Report.countDocuments({
            report_time: {
                $gte: new Date(date),
                $lt: nextDay
            }
        })

        res.json({
            total_employees: totalEmps,
            present_today: present,
            absent_today: Math.max(0, totalEmps - present),
            manual_today: manual,
            active_sites: activeSites,
            reports_today: reportsToday,
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
// DELETE /api/admin/attendance/reset
exports.resetAttendance = async (req, res) => {
    try {
        const { employee_id, site_id, date } = req.query
        if (!employee_id || !date) {
            return res.status(400).json({ error: 'employee_id and date are required.' })
        }

        // 1. Delete matching Reports for this day/site
        const Report = require('../models/Report')

        let reportQuery = {
            employee_id, report_time: {
                $gte: new Date(date),
                $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
            }
        }
        if (site_id) reportQuery.site_id = site_id

        await Report.deleteMany(reportQuery)

        // 2. Delete matching Attendance record
        let attQuery = { employee_id, date }
        if (site_id) attQuery.site_id = site_id

        await Attendance.deleteMany(attQuery)

        res.json({ success: true, message: 'Reporting reset successfully. Employee can report again.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

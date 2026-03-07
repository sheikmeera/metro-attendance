/**
 * controllers/pdfController.js — PDF log download endpoints
 */
const Attendance = require('../models/Attendance')
const Employee = require('../models/Employee')
const Site = require('../models/Site')
const Report = require('../models/Report')
const { generateDailyLog, generateSiteLog, generateEmployeeLog } = require('../services/pdfService')

// Helper to manually build the "JOIN" since our data spans multiple document collections with string references
async function buildAggregatedRecords(baseRecords) {
  return Promise.all(baseRecords.map(async (a) => {
    // Fetch Employee
    const emp = await Employee.findOne({ id: a.employee_id }, 'name department role phone lean')
    // Fetch Site (if exists)
    const site = a.site_id ? await Site.findById(a.site_id, 'site_name lean') : null

    // Fetch matching Report for that day to get photo/gps
    const report = await Report.findOne({
      employee_id: a.employee_id,
      site_id: a.site_id,
      report_time: {
        $gte: new Date(a.date),
        $lt: new Date(new Date(a.date).getTime() + 24 * 60 * 60 * 1000)
      }
    }).lean()

    return {
      ...a,
      employee_name: emp ? emp.name : null,
      department: emp ? emp.department : null,
      role: emp ? emp.role : null,
      phone: emp ? emp.phone : null,
      site_name: site ? site.site_name : null,
      photo_url: report ? report.photo_url : null,
      notes: report ? report.notes : null,
      report_lat: report ? report.latitude : null,
      report_lng: report ? report.longitude : null
    }
  }))
}

// GET /api/admin/logs/daily?date=YYYY-MM-DD
exports.dailyLog = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]
    const lang = req.query.lang || 'en'

    const attendances = await Attendance.find({ date }).sort({ time: 1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateDailyLog(res, date, records, lang)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/logs/site?site_id=1&date=YYYY-MM-DD
exports.siteLog = async (req, res) => {
  try {
    const { site_id, date, lang = 'en' } = req.query
    if (!site_id) return res.status(400).json({ error: 'site_id is required.' })

    const siteData = await Site.findById(site_id).lean() || {}
    const query = { site_id }
    if (date) query.date = date

    const attendances = await Attendance.find(query).sort({ date: -1, time: 1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateSiteLog(res, siteData.site_name || `Site ${site_id}`, records, siteData, lang)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/logs/employee?employee_id=MET001&date=YYYY-MM-DD
exports.employeeLog = async (req, res) => {
  try {
    const { employee_id, date, lang = 'en' } = req.query
    if (!employee_id) return res.status(400).json({ error: 'employee_id is required.' })

    const empData = await Employee.findOne({ id: employee_id }).lean() || {}
    const query = { employee_id }
    if (date) query.date = date

    const attendances = await Attendance.find(query).sort({ date: -1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateEmployeeLog(res, empData.name || employee_id, records, empData, lang)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

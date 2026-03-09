/**
 * controllers/pdfController.js — PDF log download endpoints
 */
const mongoose = require('mongoose')
const Attendance = require('../models/Attendance')
const Employee = require('../models/Employee')
const Site = require('../models/Site')
const Report = require('../models/Report')
const { generateDailyLog, generateSiteLog, generateEmployeeLog } = require('../services/pdfService')

// Helper to manually build the "JOIN" since our data spans multiple document collections with string references
async function buildAggregatedRecords(baseRecords) {
  if (!baseRecords || baseRecords.length === 0) return []

  // Collect unique IDs
  const empIds = [...new Set(baseRecords.map(a => a.employee_id).filter(Boolean))]
  const siteIds = [...new Set(baseRecords.map(a => a.site_id).filter(id => id && mongoose.Types.ObjectId.isValid(id)))]
  const dates = [...new Set(baseRecords.map(a => a.date).filter(Boolean))]

  // Bulk fetch Employees
  const employees = await Employee.find({ id: { $in: empIds } }, 'id name department role phone').lean()
  const empMap = {}
  employees.forEach(emp => { empMap[emp.id] = emp })

  // Bulk fetch Sites
  const sites = await Site.find({ _id: { $in: siteIds } }, 'site_name').lean()
  const siteMap = {}
  sites.forEach(site => { siteMap[site._id.toString()] = site })

  // Bulk fetch Reports (for the involved employees and dates)
  // To avoid fetching the whole db, we construct a time query that covers min/max
  const reportMap = {}
  if (dates.length > 0) {
    // Find min and max dates
    const dateObjs = dates.map(d => new Date(d))
    const minDate = new Date(Math.min(...dateObjs))
    const maxDate = new Date(Math.max(...dateObjs))
    maxDate.setDate(maxDate.getDate() + 1) // include the whole last day

    const reports = await Report.find({
      employee_id: { $in: empIds },
      report_time: { $gte: minDate, $lt: maxDate }
    }).lean()

    reports.forEach(r => {
      // Group by employee_id + site_id + Date (YYYY-MM-DD string)
      const rDate = new Date(r.report_time)
      if (isNaN(rDate.getTime())) return
      const istOffset = 5.5 * 60 * 60 * 1000
      const istDate = new Date(rDate.getTime() + istOffset)
      const dateStr = istDate.toISOString().split('T')[0]
      const siteKey = r.site_id ? r.site_id.toString() : 'null'
      const key = `${r.employee_id}_${siteKey}_${dateStr}`
      reportMap[key] = r // Will overwrite if multiple, which is fine (we want at least one photo)
    })
  }

  return baseRecords.map((a) => {
    const emp = empMap[a.employee_id]
    const site = siteMap[a.site_id ? a.site_id.toString() : '']

    let photo_url = a.photo_url
    let notes = a.notes
    let report_lat = a.latitude
    let report_lng = a.longitude

    if (!photo_url) {
      const siteKey = a.site_id ? a.site_id.toString() : 'null'
      const key = `${a.employee_id}_${siteKey}_${a.date}`
      const report = reportMap[key]
      if (report) {
        photo_url = report.photo_url
        notes = report.notes
        report_lat = report.latitude
        report_lng = report.longitude
      }
    }

    return {
      ...a,
      employee_name: emp ? emp.name : null,
      department: emp ? emp.department : null,
      role: emp ? emp.role : null,
      phone: emp ? emp.phone : null,
      site_name: site ? site.site_name : (a.site_name || null),
      photo_url,
      notes,
      report_lat,
      report_lng
    }
  })
}

// GET /api/admin/logs/daily?date=YYYY-MM-DD
exports.dailyLog = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]

    const attendances = await Attendance.find({ date }).sort({ time: 1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateDailyLog(res, date, records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/logs/site?site_id=1&date=YYYY-MM-DD
exports.siteLog = async (req, res) => {
  try {
    const { site_id, date } = req.query
    if (!site_id) return res.status(400).json({ error: 'site_id is required.' })

    let siteData = {}
    if (mongoose.Types.ObjectId.isValid(site_id)) {
      siteData = await Site.findById(site_id).lean() || {}
    }
    const query = { site_id }
    if (date) query.date = date

    const attendances = await Attendance.find(query).sort({ date: -1, time: 1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateSiteLog(res, siteData.site_name || `Site ${site_id}`, records, siteData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/logs/employee?employee_id=MET001&date=YYYY-MM-DD
exports.employeeLog = async (req, res) => {
  try {
    const { employee_id, date } = req.query
    if (!employee_id) return res.status(400).json({ error: 'employee_id is required.' })

    const empData = await Employee.findOne({ id: employee_id }).lean() || {}
    const query = { employee_id }
    if (date) query.date = date

    const attendances = await Attendance.find(query).sort({ date: -1 }).lean()
    const records = await buildAggregatedRecords(attendances)

    await generateEmployeeLog(res, empData.name || employee_id, records, empData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/**
 * controllers/siteController.js — Admin site management
 */
const Site = require('../models/Site')
const SiteAssignment = require('../models/SiteAssignment')
const Employee = require('../models/Employee')

// GET /api/admin/sites
exports.getAll = async (req, res) => {
    try {
        const sites = await Site.find().sort({ created_at: -1 }).lean()

        // Count employees per site
        const counts = await SiteAssignment.aggregate([
            { $group: { _id: '$site_id', count: { $sum: 1 } } }
        ])

        const countMap = counts.reduce((acc, curr) => ({ ...acc, [curr._id.toString()]: curr.count }), {})

        const result = sites.map(s => ({
            ...s,
            id: s._id,
            employee_count: countMap[s._id.toString()] || 0
        }))

        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/admin/sites/:id  (with assigned employees)
exports.getOne = async (req, res) => {
    try {
        const site = await Site.findById(req.params.id).lean()
        if (!site) return res.status(404).json({ error: 'Site not found.' })

        const assignments = await SiteAssignment.find({ site_id: site._id }).lean()

        // Manual populate because Employee id logic is custom string
        const employees = await Promise.all(assignments.map(async (assign) => {
            const emp = await Employee.findOne({ id: assign.employee_id }).lean()
            if (!emp) return null
            return {
                id: emp.id,
                name: emp.name,
                department: emp.department,
                avatar: emp.avatar,
                status: emp.status,
                assigned_at: assign.assigned_at
            }
        }))

        res.json({ ...site, id: site._id, employees: employees.filter(Boolean) })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/admin/site
exports.create = async (req, res) => {
    try {
        const { site_name, location_name, client_name, work_details } = req.body
        if (!site_name) return res.status(400).json({ error: 'site_name is required.' })

        const newSite = await Site.create({
            site_name,
            location_name: location_name || null,
            client_name: client_name || null,
            work_details: work_details || null
        })

        res.status(201).json({ success: true, id: newSite.id })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /api/admin/site/:id
exports.update = async (req, res) => {
    try {
        const { site_name, location_name, client_name, work_details } = req.body
        const site = await Site.findById(req.params.id)
        if (!site) return res.status(404).json({ error: 'Site not found.' })

        if (site_name) site.site_name = site_name
        if (location_name !== undefined) site.location_name = location_name || null
        if (client_name !== undefined) site.client_name = client_name || null
        if (work_details !== undefined) site.work_details = work_details || null

        await site.save()
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /api/admin/site/:id/close
exports.closeSite = async (req, res) => {
    try {
        const site = await Site.findById(req.params.id)
        if (!site) return res.status(404).json({ error: 'Site not found.' })
        if (site.status === 'closed') return res.status(400).json({ error: 'Site already closed.' })

        site.status = 'closed'
        site.completed_at = new Date()
        await site.save()

        res.json({ success: true, message: 'Site closed.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/admin/site/assign  — assign an employee to a site
exports.assignEmployee = async (req, res) => {
    try {
        const { site_id, employee_id } = req.body
        if (!site_id || !employee_id) return res.status(400).json({ error: 'site_id and employee_id required.' })

        const existing = await SiteAssignment.findOne({ site_id, employee_id })
        if (existing) return res.status(409).json({ error: 'Employee already assigned to this site.' })

        await SiteAssignment.create({ site_id, employee_id })
        res.status(201).json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// DELETE /api/admin/site/:siteId/unassign/:empId
exports.unassignEmployee = async (req, res) => {
    try {
        await SiteAssignment.findOneAndDelete({ site_id: req.params.siteId, employee_id: req.params.empId })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

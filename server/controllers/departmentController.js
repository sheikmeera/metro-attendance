/**
 * controllers/departmentController.js
 */
const Department = require('../models/Department')
const Employee = require('../models/Employee')

exports.getAll = async (req, res) => {
    try {
        const depts = await Department.find().sort({ name: 1 })

        // Count active employees per department
        const counts = await Employee.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ])

        const countMap = counts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})

        const result = depts.map(d => ({
            id: d.id,
            name: d.name,
            created_at: d.created_at,
            employee_count: countMap[d.name] || 0
        }))

        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.create = async (req, res) => {
    try {
        const { name } = req.body
        if (!name || !name.trim()) return res.status(400).json({ error: 'Department name is required.' })

        const existing = await Department.findOne({ name: name.trim() })
        if (existing) return res.status(409).json({ error: 'Department already exists.' })

        const newDept = await Department.create({ name: name.trim() })
        res.status(201).json({ success: true, id: newDept.id, name: newDept.name })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.remove = async (req, res) => {
    try {
        const dept = await Department.findById(req.params.id)
        if (!dept) return res.status(404).json({ error: 'Department not found.' })

        await Department.findByIdAndDelete(req.params.id)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

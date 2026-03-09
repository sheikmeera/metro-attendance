/**
 * controllers/employeeController.js — Admin employee management
 */
const bcrypt = require('bcryptjs')
const Employee = require('../models/Employee')

// GET /api/admin/employees
exports.getAll = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ name: 1 })
        res.json(employees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/admin/employees/:id
exports.getOne = async (req, res) => {
    try {
        const emp = await Employee.findOne({ id: req.params.id })
        if (!emp) return res.status(404).json({ error: 'Employee not found.' })
        res.json(emp)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Auto-generate next employee ID: MET001, MET002, ...
async function generateEmployeeId() {
    const lastEmp = await Employee.findOne({ id: /^MET/ }).sort({ id: -1 })
    if (!lastEmp) return 'MET001'

    const num = parseInt(lastEmp.id.replace('MET', ''), 10)
    return `MET${String(num + 1).padStart(3, '0')}`
}

// POST /api/admin/employee
exports.create = async (req, res) => {
    try {
        const { name, phone, email, pin, department } = req.body
        if (!name || !pin) return res.status(400).json({ error: 'name and pin are required.' })

        const newId = await generateEmployeeId()
        const hash = bcrypt.hashSync(pin, 10)

        // Use uploaded file path (Cloudinary URL or formatted local path)
        let avatarPath = '👤'
        if (req.file) {
            avatarPath = req.file.path
        }

        await Employee.create({
            id: newId,
            name,
            phone: phone || null,
            email: email || null,
            password_hash: hash,
            department: department || null,
            avatar: avatarPath
        })

        res.status(201).json({ success: true, id: newId, message: `Employee ${newId} created.` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /api/admin/employee/:id
exports.update = async (req, res) => {
    try {
        const { name, phone, email, department, pin } = req.body

        const emp = await Employee.findOne({ id: req.params.id })
        if (!emp) return res.status(404).json({ error: 'Employee not found.' })

        if (pin) {
            emp.password_hash = bcrypt.hashSync(pin, 10)
        }

        if (req.file) {
            emp.avatar = req.file.path
        }

        if (name) emp.name = name
        if (phone !== undefined) emp.phone = phone || null
        if (email !== undefined) emp.email = email || null
        if (department !== undefined) emp.department = department || null

        await emp.save()

        res.json({ success: true, message: 'Employee updated.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// DELETE /api/admin/employee/:id  (soft delete — set status = inactive)
exports.deactivate = async (req, res) => {
    try {
        const emp = await Employee.findOne({ id: req.params.id })
        if (!emp) return res.status(404).json({ error: 'Employee not found.' })

        emp.status = 'inactive'
        await emp.save()
        res.json({ success: true, message: 'Employee deactivated.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/admin/employee/:id/activate
exports.activate = async (req, res) => {
    try {
        const emp = await Employee.findOne({ id: req.params.id })
        if (!emp) return res.status(404).json({ error: 'Employee not found.' })

        emp.status = 'active'
        await emp.save()
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

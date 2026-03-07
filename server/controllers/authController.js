/**
 * controllers/authController.js
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')
const Employee = require('../models/Employee')

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required.' })
        }

        let user = null
        let role = null

        // Try admin first (login by email)
        const admin = await Admin.findOne({ email: identifier.toLowerCase().trim() })
        if (admin && bcrypt.compareSync(password, admin.password_hash)) {
            user = admin
            role = 'admin'
        }

        // Try employee (login by employee ID, password = PIN)
        if (!user) {
            const emp = await Employee.findOne({ id: identifier.toUpperCase().trim(), status: 'active' })
            if (emp && bcrypt.compareSync(password, emp.password_hash)) {
                user = emp
                role = emp.role || 'employee'
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials. Please try again.' })
        }

        const payload = {
            id: user.id || user._id, // Ensure id is a string
            name: user.name,
            role,
            department: user.department || null,
            avatar: user.avatar || '👤',
            email: user.email || null,
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        })

        return res.json({ token, user: payload })
    } catch (err) {
        console.error('Login error:', err)
        return res.status(500).json({ error: 'Server error during login.' })
    }
}


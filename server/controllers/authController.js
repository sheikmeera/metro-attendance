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
            console.log('[Auth] Login attempt failed: Missing identifier/password')
            return res.status(400).json({ error: 'Identifier and password are required.' })
        }

        console.log(`[Auth] Attempting login for: ${identifier}`)

        let user = null
        let role = null

        // Try admin first (login by email)
        const admin = await Admin.findOne({ email: identifier.toLowerCase().trim() })
        if (admin && bcrypt.compareSync(password, admin.password_hash)) {
            user = admin
            role = 'admin'
        }

        // Try employee (login by employee ID, Email, or Phone, password = PIN)
        if (!user) {
            const cleanId = identifier.trim()
            const emp = await Employee.findOne({
                $or: [
                    { id: cleanId.toUpperCase() },
                    { email: cleanId.toLowerCase() },
                    { phone: cleanId }
                ],
                status: 'active'
            })
            if (emp && bcrypt.compareSync(password, emp.password_hash)) {
                user = emp
                role = emp.role || 'employee'
            }
        }

        if (!user) {
            console.log(`[Auth] User not found or invalid PIN: ${identifier}`)
            return res.status(401).json({ error: 'Invalid credentials. Please try again.' })
        }

        console.log(`[Auth] Login successful: ${user.name} (${role})`)

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


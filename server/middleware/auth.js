/**
 * middleware/auth.js — JWT authentication middleware
 */
require('dotenv').config()
const jwt = require('jsonwebtoken')

module.exports = function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`[AuthMid] Denied: ${req.method} ${req.path} - No Bearer token`)
        return res.status(401).json({ error: 'No token provided. Authorization denied.' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded // { id, role, name }
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Token is invalid or expired.' })
    }
}

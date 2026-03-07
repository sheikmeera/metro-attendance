/**
 * app.js — Metro Electricals Attendance & Reporting Server
 * Entry point for the Node.js/Express backend.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initAutomation } = require('./automationService')
const { connectDB } = require('./db')

const app = express()
const PORT = process.env.PORT || 4000 // Hugging Face uses 7860

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static: serve uploaded images ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Routes ─────────────────────────────────────────────────
try {
    app.use('/api', require('./routes/authRoutes'))
    app.use('/api/admin', require('./routes/adminRoutes'))
    app.use('/api/employee', require('./routes/employeeRoutes'))
} catch (err) {
    console.error('Error loading routes:', err)
}

// ── Health Check & Keep-Alive Ping ──────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/ping', (req, res) => {
    res.status(200).send('pong')
})

// ── Map Snapshot Proxy (avoids browser CORS with OSM) ──────
// GET /api/map-tile?lat=13.05&lng=80.21&zoom=15
app.get('/api/map-tile', (req, res) => {
    const { lat, lng, zoom = 15 } = req.query
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' })

    // Convert lat/lng to OSM tile x/y
    const z = parseInt(zoom)
    const latRad = parseFloat(lat) * Math.PI / 180
    const n = Math.pow(2, z)
    const tileX = Math.floor((parseFloat(lng) + 180) / 360 * n)
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)

    const url = `https://tile.openstreetmap.org/${z}/${tileX}/${tileY}.png`

    const https = require('https')
    const request = https.get(url, {
        headers: { 'User-Agent': 'MetroElectricals-Attendance/1.0' }
    }, (proxyRes) => {
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        proxyRes.pipe(res)
    })
    request.on('error', () => res.status(502).json({ error: 'Could not fetch map tile' }))
})

// ── Serve React Frontend in Production ─────────────────────
// Define the path to the React build output
const buildPath = path.join(__dirname, '../dist')
app.use(express.static(buildPath))

// Any route that doesn't start with /api and /uploads will serve index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next()
    }
    res.sendFile(path.join(buildPath, 'index.html'))
})

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled express error:', err.stack)
    res.status(500).json({ error: err.message || 'Internal server error' })
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1)
});

// ── Start ───────────────────────────────────────────────────
const Admin = require('./models/Admin')
const Department = require('./models/Department')
const bcrypt = require('bcryptjs')

async function autoSeed() {
    try {
        const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@metro.com'
        const existingAdmin = await Admin.findOne({ email: adminEmail })

        if (!existingAdmin) {
            const hash = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10)
            await Admin.create({
                name: process.env.INITIAL_ADMIN_NAME || 'Administrator',
                email: adminEmail,
                password_hash: hash
            })
            console.log(`[Seed] Default Admin seeded: ${adminEmail}`)
        }

        const defaultDepts = ['Wiring', 'Installation', 'Maintenance', 'Management', 'Electrical', 'Civil']
        for (const dept of defaultDepts) {
            const ex = await Department.findOne({ name: dept })
            if (!ex) {
                await Department.create({ name: dept })
            }
        }
        console.log('[Seed] Default departments validated.')
    } catch (err) {
        console.error('[Seed] Auto-seed failed:', err.message)
    }
}

async function startServer() {
    try {
        // Start listening immediately so cloud health checks pass while DB connects
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Metro Server running on http://0.0.0.0:${PORT}`)
            console.log(`   Uploads served at: http://0.0.0.0:${PORT}/uploads`)
            console.log(`   Health check: http://0.0.0.0:${PORT}/api/health\n`)
        })

        await connectDB() // initialise MongoDB
        await autoSeed() // Seed initial admin & deps
        initAutomation() // start cron jobs
    } catch (err) {
        console.error('Failed to start server:', err)
        if (require.main === module) process.exit(1)
    }
}

if (require.main === module) {
    startServer()
}

module.exports = app

/**
 * seed.js — Seeds default admin, departments, and demo employees into the database.
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getDB, run, get, all, insert } = require('./db')

async function seed() {
    console.log('🌱 Seeding production database...')
    await getDB()

    // ── Professional Admin ──────────────────────────────────────────
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@metro.com'
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123'
    const adminName = process.env.INITIAL_ADMIN_NAME || 'Administrator'

    const existingAdmin = await get('SELECT id FROM admins WHERE email = ?', [adminEmail])
    if (!existingAdmin) {
        const hash = bcrypt.hashSync(adminPass, 10)
        await run('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', [adminName, adminEmail, hash])
        console.log(`  ✓ Admin created: ${adminEmail}`)
    } else {
        console.log('  · Admin already exists')
    }

    // ── Departments ─────────────────────────────────────────────────
    const defaultDepts = ['Wiring', 'Installation', 'Maintenance', 'Management', 'Electrical', 'Civil']
    for (const dept of defaultDepts) {
        const ex = await get('SELECT id FROM departments WHERE name = ?', [dept])
        if (!ex) {
            await insert('INSERT INTO departments (name) VALUES (?)', [dept])
        }
    }
    console.log('  ✓ Departments seeded')

    console.log('\n✅ Seeding complete!')
    process.exit(0)
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1) })

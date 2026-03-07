const { generateDailyLog } = require('./server/services/pdfService')
const fs = require('fs')
const path = require('path')

// Mock records
const records = [
    {
        employee_name: 'Test Employee',
        employee_id: 'MET001',
        department: 'Electrical',
        site_name: 'Metro Site A',
        date: '2026-03-07',
        time: '14:50',
        status: 'present',
        notes: 'Debug test'
    }
]

const output = fs.createWriteStream(path.join(__dirname, 'debug_ta.pdf'))

console.log('Starting PDF generation with lang=ta...')

generateDailyLog(output, '2026-03-07', records, 'ta')
    .then(() => {
        console.log('PDF generated successfully: debug_ta.pdf')
        process.exit(0)
    })
    .catch(err => {
        console.error('PDF Generation Failed!')
        console.error(err)
        process.exit(1)
    })

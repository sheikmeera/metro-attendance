/**
 * tests/test_pdf_v2.js
 * Generates a test PDF with the new card grid layout.
 */
const fs = require('fs');
const path = require('path');
const { generateDailyLog } = require('../server/services/pdfService');

const mockRecords = [
    {
        employee_id: 'MET001',
        employee_name: 'Rajan Kumar',
        date: '2026-03-06',
        time: '15:18',
        site_name: 'Metro Construction Site A',
        status: 'PRESENT',
        notes: 'Site inspection completed.',
        report_lat: 17.43128,
        report_lng: 78.38088,
        photo_url: 'https://res.cloudinary.com/dyo4bsuxj/image/upload/v1741273934/metro_reports/report_1741273932488_708892.jpg'
    },
    {
        employee_id: 'MET002',
        employee_name: 'Suresh Raina',
        date: '2026-03-06',
        time: '15:30',
        site_name: 'Metro Construction Site B',
        status: 'PRESENT',
        notes: 'Maintenance check.',
        report_lat: 17.44128,
        report_lng: 78.39088,
        photo_url: 'https://res.cloudinary.com/dyo4bsuxj/image/upload/v1741273934/metro_reports/report_1741273932488_708892.jpg'
    },
    {
        employee_id: 'MET003',
        employee_name: 'Amit Shah',
        date: '2026-03-06',
        time: '16:00',
        site_name: 'Central Plaza',
        status: 'PRESENT',
        notes: 'Wiring work started.',
        report_lat: 17.45128,
        report_lng: 78.40088,
        photo_url: 'https://res.cloudinary.com/dyo4bsuxj/image/upload/v1741273934/metro_reports/report_1741273932488_708892.jpg'
    },
    {
        employee_id: 'MET004',
        employee_name: 'Virat Kohli',
        date: '2026-03-06',
        time: '16:45',
        site_name: 'Green Valley',
        status: 'PRESENT',
        notes: 'Installation finished.',
        report_lat: 17.46128,
        report_lng: 78.41088,
        photo_url: 'https://res.cloudinary.com/dyo4bsuxj/image/upload/v1741273934/metro_reports/report_1741273932488_708892.jpg'
    },
    {
        employee_id: 'MET005',
        employee_name: 'Mahendra Singh Dhoni',
        date: '2026-03-06',
        time: '17:15',
        site_name: 'Sky Tower',
        status: 'PRESENT',
        notes: 'General checkup.',
        report_lat: 17.47128,
        report_lng: 78.42088,
        photo_url: 'https://res.cloudinary.com/dyo4bsuxj/image/upload/v1741273934/metro_reports/report_1741273932488_708892.jpg'
    }
];

async function runTest() {
    console.log('🧪 Starting PDF Redesign Test...');
    const outPath = path.join(__dirname, 'test_v2_grid.pdf');
    const writeStream = fs.createWriteStream(outPath);

    try {
        await generateDailyLog(writeStream, '2026-03-06', mockRecords);
        console.log(`✅ Test PDF generated at: ${outPath}`);
    } catch (err) {
        console.error('❌ Failed to generate test PDF:', err);
    }
}

runTest();

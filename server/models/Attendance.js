const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee_id: { type: String, ref: 'Employee', required: true }, // e.g. MET001
    site_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm AM/PM
    status: { type: String, default: 'present' }, // present, manual, absence
    photo_url: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    notes: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

attendanceSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);

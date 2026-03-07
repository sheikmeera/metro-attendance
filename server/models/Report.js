const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    employee_id: { type: String, ref: 'Employee', required: true }, // e.g. MET001
    site_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    photo_url: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    notes: { type: String },
    report_time: { type: Date, default: Date.now },
    verified: { type: Number, default: 0 } // 0 or 1
});

reportSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Report', reportSchema);

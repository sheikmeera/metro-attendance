const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    site_name: { type: String, required: true },
    location_name: { type: String },
    client_name: { type: String },
    work_details: { type: String },
    status: { type: String, default: 'active' }, // active or closed
    completed_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Mongoose adds an `_id` field automatically.
// We can use virtuals if we need it to strictly respond as `id`.
siteSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Site', siteSchema);

const mongoose = require('mongoose');

const siteAssignmentSchema = new mongoose.Schema({
    site_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    employee_id: { type: String, ref: 'Employee', required: true }, // Linked to Employee.id (MET001)
}, { timestamps: { createdAt: 'assigned_at', updatedAt: false } });

siteAssignmentSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('SiteAssignment', siteAssignmentSchema);

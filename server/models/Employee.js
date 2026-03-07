const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g. MET001
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    password_hash: { type: String, required: true },
    department: { type: String },
    role: { type: String, default: 'employee' },
    status: { type: String, default: 'active' }, // active or inactive
    avatar: { type: String, default: '👤' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Employee', employeeSchema);

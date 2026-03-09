/**
 * utils/cloudinary.js
 * Centralized Cloudinary configuration and Multer storage definitions.
 */
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for employee avatars
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'metro_avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => `avatar_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    },
});

// Storage for site reports
const reportStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'metro_reports',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => `report_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    },
});

module.exports = {
    cloudinary,
    avatarStorage,
    reportStorage
};

const app = require('../server/app');
const { connectDB } = require('../server/db');

module.exports = async (req, res) => {
    await connectDB();
    return app(req, res);
};

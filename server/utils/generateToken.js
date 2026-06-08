const jwt = require('jsonwebtoken');
require('dotenv').config();
const generateToken = (payload,res)=>{
    try {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3d' });
    } catch (err) {
        console.error(err);
        throw err;
    }
};
module.exports = generateToken;
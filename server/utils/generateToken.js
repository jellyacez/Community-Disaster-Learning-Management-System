const jwt = require('jsonwebtoken');

const generateToken = (payload,res)=>{
    try {
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3d' });
        return token;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
module.exports = generateToken;
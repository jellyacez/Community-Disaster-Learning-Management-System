const bcrypt = require('bcryptjs');

const hashPassowrd = async(password)=>{
    const salt =await bcrypt.genSalt(10);
    return bcrypt.hash(password,salt);
}

const comparePassword = async(password, hashedPassword)=>{
    return bcrypt.compare(password,hashedPassword);
}

module.exports = {hashPassowrd,comparePassword}
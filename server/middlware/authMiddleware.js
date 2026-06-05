const jwt = require('jsonwebtoken');

require('dotenv').config();

const verifyToken = async(req,res,next)=>{
let token;

    if(req.headers.authorization?.startsWith("Bearer")){
        try{
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token,process.env.JWT_SECRET);
            req.user = decoded.user
    
            next();

        }catch(err){
            res.status(401).json({error:"Token Expired or Invalid"});
        }
        
    }else{
        res.status.json({error:"No token provided. Authorization Denied."})
    }
}

module.exports = verifyToken;
const jwt = require('jsonwebtoken');

require('dotenv').config();

const verifyToken = async(req,res,next)=>{
let token;

    if(req.headers.authorization?.startsWith("Bearer")){
        try{
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token,process.env.JWT_SECRET);
            req.user = decoded.user
    
            return next();

        }catch(err){
            res.status(401).json({error:"Token Expired or Invalid"});
        }
        
    }else{
       return res.status(401).json({ error: "Access denied. No valid token signature found." });
    }
}

module.exports = verifyToken;
import { json } from 'express';
import jwt from 'jsonwebtoken'
import User from '../models/userModel.js';

const authMiddleware = async(req,res,next)=>{
    try{
        const authHeader = req.headers.authorization;
        let token;
        if(authHeader && authHeader.startsWith("Bearer")){
            token=authHeader.split(' ')[1];
        }else if(req.cookies?.token){
            token=req.cookies.token
        }
        // const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        if(!token){
            console.log("No token is passed");
            return res.status(401).json({message:"No token is passed"});
        }
        ///verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        //fetch the user from db
        const user = await User.findById(decoded.id);
        if(!user){
            console.log("user nott found")
            return res.status(404).json({message:"User not found"})
        }
        //add user info to req.body
        req.user=user;
        next();
    }catch(err){
        if(err.name==="TokenExpiredError"){
            console.log("Token expired")
            return res.status(401).json({message:"Token expired"})
        }
        console.log("Invalid token",err)
        return res.status(500).json({message:"Invalid token"})
    }
}
export default authMiddleware;

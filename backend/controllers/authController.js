import User from '../models/userModel.js'
import authMiddleware from '../middleware/authMiddleware.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//SignUp
const signup = async(req,res)=>{
    try{
        const {name,email,password} = req.body;
        if(!name || !email || !password){
            console.log("Please provide all the details to signup")
            return res.status(400).json({message:"Please provide all the details to Signup"})
        }
        const userExists = await User.findOne({email})
        if(userExists){
            console.log("user already exists with this email")
            return res.status(400).json({message:"The user already exists with this email"})
        }
        //need to hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10)
        const user=new User({
            name,
            email,
            password:hashedPassword,
        });
        await user.save();
        console.log("User registered successfully",user)
        return  res.status(200).json({message:"User registered successfully"})
    }catch(err){
        console.log("Some error while signup ",err)
        return res.status(500).json({message:"Some error while signup",err})
    }
}

///Login
const login = async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
            console.log("both email and password are required");
            return res.status(400).json({message: "both email and password are required"})
        }
        const user = await User.findOne({email});
        if(!user){
            console.log("No user exists with this email, please try again")
            return res.status(404).json({message:"No user exists with this email, please try again"})
        }
        //check the hashed password is correct ro not
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid){
            console.log("Incorrect password, please try again",isPasswordValid)
            return res.status(400).json({message:"Invalid password please try again"})
        }
            ///generate the jwt token
        const token = jwt.sign({
            id:user._id, email:user.email,name:user.name},
            process.env.JWT_SECRET,
            {expiresIn:"7d"}
        )
        console.log("the token of user is ",token);
        //send token in cookie also in response
       res.cookie('token', token,{
        httpOnly:true,
        maxAge:7*24*60*60*100
       });

        console.log("Login successful",user)
        return res.status(200).json({
            message:"Login successful",
            token:token,
            userId:user._id,
            email:user.email,
            name:user.name,
        })
        
    }catch(err){
        console.log("Some error while Login",err)
        return res.status(500).json({message:"Some error while login",err})
    }
}

///logout
const logout = async(req,res)=>{
    try{
       res.clearCookie('token');//if we use cookies
    return res.status(200).json({message:"Logout successful"})
    }catch(err){
        return res.status(500).json({message:"Logout Successful"})
    }
}


export {signup, login, logout}
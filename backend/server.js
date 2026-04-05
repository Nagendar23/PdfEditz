import express from "express";
import mongoose from "mongoose";
import cors from 'cors';
import dotenv  from 'dotenv';
import connectDB from "./config/db.js";
import testUpload from './routes/testUpload.js'
import authRouter from "./routes/authRoute.js";
import authMiddleware from "./middleware/authMiddleware.js";
import fileRouter from "./routes/fileRoute.js";
import cron from 'node-cron';
import cleanUpExpiredFiles from "./utils/cleanup.js";

const app = express()
dotenv.config()
app.use(express.json())

app.use("/uploads", express.static("uploads"));

connectDB();

const PORT = process.env.PORT || 8000

//run everyday at 12AM
cron.schedule("0 0 * * *",async()=>{
    console.log("Starting scheduled cleanup...")
    await cleanUpExpiredFiles()
})

app.get('/',(req,res)=>{
    res.send("backend is working")
})

app.use('/api/test-upload',testUpload)

app.use('/api/auth',authRouter)

app.use('/api/files',fileRouter)

app.use('/api/auth/me',authMiddleware, (req,res)=>{
    res.json({
        message:"User authenticated",
        user:req.user
    })
}
)


app.listen(PORT, ()=>{
    console.log(`The server is running on the PORT ${PORT}`)
})
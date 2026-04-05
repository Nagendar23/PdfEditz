import express from "express";
import upload from "../middleware/upload.js";

const router = express.Router();
router.post('/',upload.single("file"),(req,res)=>{
    res.json({
        message:"File uploaded successfully",
        file:req.file,
    })
})
export default router;
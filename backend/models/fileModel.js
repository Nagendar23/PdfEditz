import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    originalName:{
        type:String,
        required:true,
    },
    storedName:{
        type:String,
        required:true,
    },
    fileType:{
        type:String,
        enum:["pdf","doc","docx"],
        required:true,
    },
    size:{
        type:Number,
    },
    operation:{
        type:String,
        enum:["upload","merge","annotate","convert"],
        required:true,
    },
    expiresAt:{
        type:Date,
        default:()=> Date.now() + 10*24*60*60*1000
    }
},{timestamps:true})

fileSchema.index({ expiresAt: 1 });

const File = mongoose.model("File",fileSchema);
export default File;
import mongoose from "mongoose";
import { type } from "os";

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
        enum:["pdf","doc","docx","image"],
        required:true,
    },
    size:{
        type:Number,
    },
    operation:{
        type:String,
        enum:["upload","text-overlay","overlay","merge","annotate","convert"],
        required:true,
    },
    // sourceFileIds:{
    //     type:[mongoose.Schema.Types.ObjectId],
    //     ref:'File',
    //     default:[],
    // },
    expiresAt:{
        type:Date,
        required:true,
        default:()=> Date.now() + 10*24*60*60*1000,
        
    }
},{timestamps:true})

fileSchema.index({ expiresAt: 1 });

const File = mongoose.model("File",fileSchema);
export default File;
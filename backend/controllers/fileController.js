import File from '../models/fileModel.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const fileUpload = async(req,res)=>{
    try{
        //validating if file exists
        if(!req.file){
            console.log("no file uploaded")
            return res.status(404).json({message:"No file uploaded"})
        }
        //extract file data froom req.file which is provided by multer
        const {originalname, filename, size, mimetype} = req.file;
        //determin file type from mimetype
        let fileType;
        if(mimetype==="application/pdf"){
            fileType="pdf"
        }else if(mimetype==="application/msword"){
            fileType="doc"
        }else if(mimetype==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
            fileType="docx"
        }
        ///create and save file document
        const file = new File({
            userId:req.user._id,
            originalName:originalname,
            storedName:filename,
            fileType:fileType,
            size:size,
            operation:"upload"
        });
        await file.save();
        console.log("File uploaded successfully",file._id)
        return res.status(200).json({
            message:"Uploaded successfully",
            fileId:file._id,
            fileUrl:`/uploads/${filename}`
        })
    }catch(err){
        console.log("Error uploading file ",err)
        return res.status(500).json({message:"Error uploading file ",err})
    }
}

//get user files
const getUserFiles = async(req,res)=>{
    try{
        const userId = req.user._id
        if(!userId){
            console.log("User not authenticated")
            return res.status(404).json({message:"No user found with the id"})
        }
        const userFiles = await File.find({userId})
        if(userFiles.length===0){
            console.log("No files found for this user")
            return res.status(200).json({message:"No files found for the user"})
        }
        return res.status(200).json({
            message:"Fetched the files",
            userFiles,

        })
    }catch(err){
        console.log("Error while fetching the files",err)
        return res.status(500).json({message:"Error while fetching the files"})
    }
}


///DELETE FILE
const deleteFile = async(req,res)=>{
    try{
        const fileId = req.params.id;
        if(!fileId){
            console.log("File Id is required to delete the file")
            return res.status(401).json({message:"FileId is required to delete the file"})
        }
        const file = await File.findById(fileId)
        if(!file){
            console.log("No file found ",file)
            return res.status(404).json({message:"No file found"})
        }
        ///check ownership of file
        if(String(file.userId) !== String(req.user._id)){
            console.log("You are not authenticated to delete this file");
            return res.status(401).json({message:"You are not authenticated to delete this file"})
        }

        ///delete file from the disk(filesystem)
        const filePath = path.join(__dirname, "..", 'uploads',file.storedName)
        fs.unlink(filePath,(err)=>{
            if(err) console.log("error deleting the file from disk ",err)
        })
        console.log("File Deleted from disk ")

        //delete entry from DB
        const deletedFile = await File.findByIdAndDelete(fileId);
        console.log("File deleted successfully");
        return res.status(200).json({
            message:"File successfully deleted ffrom DB",
            deletedFile
        })
    }catch(err){
        console.log("Error while deleting the file",err);
        return res.status(500).json({message:"Error while deleting the file",err})
    }
}


export {fileUpload, getUserFiles, deleteFile}
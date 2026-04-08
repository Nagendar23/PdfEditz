import File from '../models/fileModel.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { processPDF } from '../utils/pdfService.js'
import { escapeRegExp } from 'pdf-lib'
import { json } from 'stream/consumers'
import { log } from 'console'

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
        else if(mimetype.startsWith("image/")){
            fileType="image"
        }else{
            console.log("Unsupported ffile type");
            return res.status(400).json({message:"Unsupported file type"})
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

// NEW: UNIFIED OVERLAY FUNCTION (handles both text and images)
const addOverlay = async (req, res) => {
  try {
    const { id } = req.params;
    const { elements } = req.body;

    // ---------------- VALIDATION ----------------
    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ message: "Elements required" });
    }

    if (elements.length > 50) {
      return res.status(400).json({ message: "Too many elements" });
    }

    // ---------------- GET FILE ----------------
    const file = await File.findById(id);

    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (file.fileType !== "pdf") {
        console.log("only pdfs allowed")
      return res.status(400).json({ message: "Only PDFs allowed" });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads");

    const inputPath = path.join(uploadsDir, file.storedName);
    const newFileName = `edited-${Date.now()}-${file.storedName}`;
    const outputPath = path.join(uploadsDir, newFileName);

    // ---------------- RESOLVE IMAGE PATHS ----------------
for (const el of elements) {
  if (el.type === "image") {
    if (!el.imageFileId) {
      return res.status(400).json({
        message: "imageFileId required for image",
      });
    }
    
    // Validate rotation
    if(el.rotation !== undefined){
      if(typeof el.rotation !== "number"){
        return res.status(400).json({message:"Rotation must be a number (degrees)"})
      }
      if(el.rotation < 0 || el.rotation > 360){
        return res.status(400).json({message:"Rotation number must be between 0 and 360"})
      }
    }
    
    // Validate opacity
    if(el.opacity !== undefined){
      if(typeof el.opacity !== "number"){
        return res.status(400).json({message:"Opacity must be a number (0-1)"})
      }
      if(el.opacity < 0 || el.opacity > 1){
        return res.status(400).json({message:"Opacity must be between 0 and 1"})
      }
    }
    
    // ---- VALIDATE & PROCESS 'pages' PARAMETER ----
    if (el.pages !== undefined) {
      if (typeof el.pages === "number") {
        if (el.pages < 0) {
          return res.status(400).json({
            message: "Page number must be >= 0"
          });
        }
        el._pageIndices = [el.pages];
        
      } else if (Array.isArray(el.pages)) {
        if (el.pages.length === 0) {
          return res.status(400).json({
            message: "Pages array cannot be empty"
          });
        }
        
        if (el.pages.length === 2 && typeof el.pages[0] === "number" && typeof el.pages[1] === "number") {
          const [start, end] = el.pages;
          if (start < 0 || end < 0 || start > end) {
            return res.status(400).json({
              message: "Page range: start must be >= 0 and start <= end"
            });
          }
          el._pageIndices = Array.from({length: end - start + 1}, (_, i) => start + i);
          
        } else {
          if (!el.pages.every(p => typeof p === "number" && p >= 0)) {
            return res.status(400).json({
              message: "All page numbers must be non-negative integers"
            });
          }
          el._pageIndices = el.pages;
        }
        
      } else {
        return res.status(400).json({
          message: "Pages must be a number or array"
        });
      }
    }

    const imageFile = await File.findById(el.imageFileId);

    if (!imageFile) {
      return res.status(400).json({
        message: "Invalid imageFileId",
      });
    }

    if (imageFile.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized image access",
      });
    }

    el.imagePath = path.join(uploadsDir, imageFile.storedName);
  }
}

    // ---------------- PROCESS PDF ----------------
    await processPDF({
      inputPath,
      outputPath,
      elements,
    });

    // ---------------- SAVE NEW FILE ----------------
    const newFile = await File.create({
      userId: req.user.id,
      originalName: file.originalName,
      storedName: newFileName,
      fileType: file.fileType,
      size: file.size,
      operation: "overlay",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
    console.log("overlay applied",newFile)
    return res.status(200).json({
      message: "Overlay applied",
      file: newFile,
    });

  } catch (err) {
    console.error("OVERLAY ERROR:", err);
    return res.status(500).json({
      message: "Failed to process PDF",
      error: err.message,
    });
  }
};


export { fileUpload, getUserFiles, deleteFile, addOverlay }
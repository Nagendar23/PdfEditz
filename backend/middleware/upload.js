import multer from "multer";
import path from 'path';
import fs from 'fs';
import sharp from 'sharp'

//we need to ensure upload folder exists
const uploadDir = path.join(process.cwd(),"uploads")
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
} 

///storage configuration
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,uploadDir)
    },
    filename:(req,file,cb)=>{
        const uniqueSuffix= Date.now()+ "-" + Math.round(Math.random()* 1e9);

        // for images always using the jpg extension
        if(file.mimetype.startsWith("image/")){
            cb(null, uniqueSuffix + ".jpg")
        }else{
            const ext = path.extname(file.originalname);
            cb(null,uniqueSuffix + ext)
        }
    },
});

///allowed file types
const allowedMimeTypes =[
    "application/pdf",
    "application/msword" ,///.doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ///docx
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",

];



///file filtering
const fileFilter = (req,file,cb)=>{
    // Check if file type is allowed
    if(!allowedMimeTypes.includes(file.mimetype)){
        return cb(new Error("Only PDF, Word files and images(PNG, JPEG, GIF, WebP) are allowed"),false);
    }

//check the image size aand limit it to 10MB
    if(file.mimetype.startsWith("image/")){
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        
        if(file.size > MAX_SIZE){
            return cb(new Error("Image size must not exceed 10MB"),false);
        }
    }

    cb(null,true);
}

///multer instance
const upload = multer({
    storage,
    limits:{
        fileSize:100*1024*1024,///100MB
    },
    fileFilter,
});

//img conversion middleware(from other to jgp)
export const convertImageToJPEG = async(req,res,next)=>{
    try{
        //only process if the file is uploaded
        if(!req.file){
            console.log("No file in request");
            return next()
        }
        //only process images
        if(!req.file.mimetype.startsWith("image/")){
            console.log("Not an image, skipping conversion");
            return next()
        }

        console.log("Starting image conversion...");
        console.log("Original file path:", req.file.path);
        console.log("Original file name:", req.file.filename);

        // Use a temporary file for conversion
        const tempOutputPath = path.join(uploadDir, req.file.filename + ".temp");
        const finalOutputPath = path.join(uploadDir, req.file.filename);

        console.log("Temp path:", tempOutputPath);
        console.log("Final path:", finalOutputPath);

        // Check if original file exists
        if (!fs.existsSync(req.file.path)) {
            throw new Error("Original file does not exist: " + req.file.path);
        }

        // Convert image to jpeg format using Sharp
        await sharp(req.file.path)
            .jpeg({quality:85, progressive:true})
            .toFile(tempOutputPath)

        console.log("Sharp conversion completed");

        // Delete the original uploaded file
        fs.unlinkSync(req.file.path)
        console.log("Original file deleted");

        // Rename temp file to final file
        fs.renameSync(tempOutputPath, finalOutputPath)
        console.log("Temp file renamed to final");

        // Update file info
        req.file.path = finalOutputPath;
        req.file.mimetype = "image/jpeg";

        console.log("Image conversion successful!");
        next();
    }catch(err){
        console.error("Image conversion error:", err.message);
        console.error("Full error:", err);
        return res.status(500).json({message:"Failed to convert img to jpeg: " + err.message})
    }
}


export default upload;
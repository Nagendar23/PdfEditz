import multer from "multer";
import path from 'path';
import fs from 'fs';

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

        const ext = path.extname(file.originalname);
        cb(null,uniqueSuffix + ext)
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
    if(allowedMimeTypes.includes(file.mimetype)){
        cb(null,true);
    }else{
        cb(new Error("Only PDF, Word files and images(PNG, JPEG, GIF, WebP) are allowed"),false);
    }
}

///multer instance
const upload = multer({
    storage,
    limits:{
        fileSize:100*1024*1024,///100MB
    },
    fileFilter,
});
export default upload;
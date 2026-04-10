import {Router} from 'express'
import {fileUpload, getUserFiles, deleteFile, addOverlay, pdfMerge, previewFile} from '../controllers/fileController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import upload, { convertImageToJPEG } from '../middleware/upload.js'

const fileRouter= Router()

///auth -> multer -> controller
fileRouter.post('/upload',authMiddleware,upload.single('file'),convertImageToJPEG, fileUpload)

fileRouter.get('/',authMiddleware, getUserFiles)

fileRouter.delete('/:id',authMiddleware, deleteFile)

fileRouter.post("/:id/add-overlay",authMiddleware, addOverlay);

fileRouter.post("/merge",authMiddleware,pdfMerge);

fileRouter.get("/:id/preview",authMiddleware, previewFile);

export default fileRouter
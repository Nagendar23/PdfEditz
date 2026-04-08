import {Router} from 'express'
import {fileUpload, getUserFiles, deleteFile, addOverlay, pdfMerge} from '../controllers/fileController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import upload, { convertImageToJPEG } from '../middleware/upload.js'

const fileRouter= Router()

///auth -> multer -> controller
fileRouter.post('/upload',authMiddleware,upload.single('file'),convertImageToJPEG, fileUpload)

fileRouter.get('/',authMiddleware, getUserFiles)

fileRouter.delete('/:id',authMiddleware, deleteFile)

fileRouter.post("/:id/add-overlay",authMiddleware, addOverlay);

fileRouter.post("/merge",authMiddleware,pdfMerge);

export default fileRouter
import {Router} from 'express'
import {fileUpload, getUserFiles, deleteFile} from '../controllers/fileController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import upload from '../middleware/upload.js'
import { addTextOverlay } from '../controllers/fileController.js'

const fileRouter= Router()

///auth -> multer -> controller
fileRouter.post('/upload',authMiddleware,upload.single('file'),fileUpload)

fileRouter.get('/',authMiddleware, getUserFiles)

fileRouter.delete('/:id',authMiddleware, deleteFile)

fileRouter.post("/:id/add-text",authMiddleware, addTextOverlay);

export default fileRouter
import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import { applyTextWatermarkController } from "../controllers/watermarkController.js";

const watermarkRouter = Router();

watermarkRouter.post("/text", authMiddleware, upload.single("file"), applyTextWatermarkController);

export default watermarkRouter;
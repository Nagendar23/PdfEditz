import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { extractPages } from "../controllers/extractController.js";

const extractRouter = Router();

extractRouter.post("/:fileId/extract", authMiddleware, extractPages);

export default extractRouter;
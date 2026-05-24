import File from "../models/fileModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applyTextWatermark } from "../utils/watermarkService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function deleteFileIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.warn("Failed to remove temporary file:", error.message);
  }
}

export async function applyTextWatermarkController(req, res) {
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    if (req.file.mimetype !== "application/pdf") {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      deleteFileIfExists(req.file.path);
      return res.status(401).json({ message: "Not authenticated" });
    }

    const text = String(req.body.text || "").trim();
    const opacity = toNumber(req.body.opacity, 0.3);
    const rotation = toNumber(req.body.rotation, -45);
    const fontSize = toNumber(req.body.fontSize, 48);
    const color = String(req.body.color || "#FF0000");
    const position = String(req.body.position || "center");

    const allowedPositions = new Set([
      "center",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);

    if (!text) {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Watermark text is required" });
    }

    if (!allowedPositions.has(position)) {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Invalid position" });
    }

    if (opacity < 0 || opacity > 1) {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Opacity must be between 0 and 1" });
    }

    if (rotation < -180 || rotation > 180) {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Rotation must be between -180 and 180" });
    }

    if (fontSize < 12 || fontSize > 120) {
      deleteFileIfExists(req.file.path);
      return res.status(400).json({ message: "Font size must be between 12 and 120" });
    }

    inputPath = req.file.path;

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const extFromName = path.extname(req.file.originalname || req.file.filename);
    const ext = extFromName || ".pdf";
    const rawBase = path.basename(req.file.originalname || req.file.filename, ext);
    const rootBase = rawBase.replace(/-watermarked\d+$/i, "");

    const editedFiles = await File.find(
      {
        userId,
        originalName: { $regex: new RegExp(`^${rootBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-watermarked(\\d+)${ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      },
      { originalName: 1 }
    ).lean();

    const maxEditedNumber = editedFiles.reduce((max, item) => {
      const match = item.originalName.match(/-watermarked(\d+)\.[^.]+$/i);
      const numberValue = match ? Number(match[1]) : 0;
      return Number.isFinite(numberValue) ? Math.max(max, numberValue) : max;
    }, 0);

    const nextEditedNumber = maxEditedNumber + 1;
    const displayName = `${rootBase}-watermarked${nextEditedNumber}${ext}`;
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const storedName = `${uniquePrefix}-${displayName}`;
    const outputPath = path.join(uploadsDir, storedName);

    await applyTextWatermark({
      inputPath,
      outputPath,
      text,
      opacity,
      rotation,
      fontSize,
      color,
      position,
    });

    const stats = fs.statSync(outputPath);

    const file = await File.create({
      userId,
      originalName: displayName,
      storedName,
      fileType: "pdf",
      size: stats.size,
      operation: "watermark",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    deleteFileIfExists(inputPath);

    return res.status(200).json({
      message: "Watermark applied successfully",
      file,
    });
  } catch (error) {
    if (inputPath) {
      deleteFileIfExists(inputPath);
    }

    return res.status(500).json({
      message: "Failed to apply watermark",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import File from "../models/fileModel.js";
import { getPdfPageCount, extractPdfPages } from "../services/extractService.js";
import { parsePageSelection } from "../utils/pageParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extractPages = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { pages } = req.body;

    if (!pages || typeof pages !== "string") {
      return res.status(400).json({ message: "Pages are required" });
    }

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const userId = req.user._id || req.user.id;

    if (String(file.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (file.fileType !== "pdf") {
      return res.status(400).json({ message: "Only PDFs allowed" });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const inputPath = path.join(uploadsDir, file.storedName);

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ message: "PDF file missing on disk" });
    }

    const { pageCount } = await getPdfPageCount(inputPath);
    const selectedPages = parsePageSelection(pages, pageCount);

    const originalBase = path.basename(
      file.originalName,
      path.extname(file.originalName) || ".pdf"
    );

    const displayName = `${originalBase}_extract.pdf`;
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const storedName = `${uniquePrefix}-${displayName}`;
    const outputPath = path.join(uploadsDir, storedName);

    const result = await extractPdfPages({
      inputPath,
      outputPath,
      pageNumbers: selectedPages,
    });

    const newFile = await File.create({
      userId,
      originalName: displayName,
      storedName,
      fileType: "pdf",
      size: result.size,
      operation: "extract",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      file: newFile,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to extract pages",
      error: err.message,
    });
  }
};

export { extractPages };
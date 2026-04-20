// Open an existing PDF, write overlays, and save the new PDF.

import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs";

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseHexColor(colorValue) {
  if (typeof colorValue !== "string") {
    return rgb(0, 0, 0);
  }

  let hex = colorValue.trim().replace("#", "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return rgb(0, 0, 0);
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}

function resolvePdfPosition(position, width, height) {
  const rawX = toFiniteNumber(position?.x, 0);
  const rawY = toFiniteNumber(position?.y, 0);

  const isNormalized = rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1;

  const x = isNormalized ? rawX * width : rawX;
  const yFromTop = isNormalized ? rawY * height : rawY;
  const y = height - yFromTop;

  return { x, y };
}

export const processPDF = async ({ inputPath, outputPath, elements }) => {
  const existingPDFBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(existingPDFBytes);

  // Match frontend preview family as closely as possible on Windows.
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const pages = pdfDoc.getPages();

  // Empirical correction for reported left/down drift.
  const HORIZONTAL_NUDGE_PER_FONT_SIZE = 0.08; // move right
  const VERTICAL_NUDGE_PER_FONT_SIZE = 0.26;   // move up

  for (const el of elements) {
    let pageIndices = [];

    if (el._pageIndices) {
      pageIndices = el._pageIndices;

      for (const idx of pageIndices) {
        if (idx >= pages.length) {
          throw new Error("Page " + idx + " exceeds total pages " + pages.length);
        }
      }
    } else {
      const pageIndex = el.page ?? 0;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        throw new Error("Invalid page index: " + pageIndex);
      }
      pageIndices = [pageIndex];
    }

    for (const pageIndex of pageIndices) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      const basePosition = resolvePdfPosition(el.position, width, height);
      const x = basePosition.x;
      const y = basePosition.y;

      if (el.type === "text") {
        const text = typeof el.text === "string" ? el.text : "";
        if (!text.trim()) {
          continue;
        }

        const fontSize = Math.max(1, toFiniteNumber(el.style?.fontSize, 20));
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const align = el.style?.align ?? "center";

        let drawX = x;
        if (align === "center") {
          drawX = x - textWidth / 2;
        } else if (align === "right") {
          drawX = x - textWidth;
        }

        let drawY = y - textHeight / 2;

        drawX += fontSize * HORIZONTAL_NUDGE_PER_FONT_SIZE;
        drawY += fontSize * VERTICAL_NUDGE_PER_FONT_SIZE;

        const color = parseHexColor(el.style?.color);

        page.drawText(text, {
          x: drawX,
          y: drawY,
          size: fontSize,
          font,
          color,
        });
      }

      if (el.type === "image") {
        if (!el.imagePath) {
          throw new Error("Missing imagePath");
        }

        const imageBytes = fs.readFileSync(el.imagePath);
        let image;

        if (el.imagePath.endsWith(".png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        const imgWidth = toFiniteNumber(el.size?.width, 100);
        const imgHeight = toFiniteNumber(el.size?.height, 100);
        const rotation = toFiniteNumber(el.rotation, 0);
        const opacity = toFiniteNumber(el.opacity, 1);

        page.drawImage(image, {
          x,
          y,
          width: imgWidth,
          height: imgHeight,
          rotate: degrees(rotation),
          opacity,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
};
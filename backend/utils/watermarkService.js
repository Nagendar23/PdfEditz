import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs";

function toFiniteNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function parseHexColor(colorValue) {
  if (typeof colorValue !== "string") {
    return { red: 0, green: 0, blue: 0 };
  }

  let hex = colorValue.trim().replace("#", "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((character) => character + character)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return { red: 0, green: 0, blue: 0 };
  }

  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;

  return { red, green, blue };
}

function mixColorWithWhite(colorValue, opacity) {
  const baseColor = parseHexColor(colorValue);
  const safeOpacity = Math.max(0, Math.min(1, opacity));

  return rgb(
    1 - (1 - baseColor.red) * safeOpacity,
    1 - (1 - baseColor.green) * safeOpacity,
    1 - (1 - baseColor.blue) * safeOpacity
  );
}

function resolveWatermarkPlacement(position, width, height, textWidth, textHeight) {
  const margin = Math.max(36, Math.round(Math.min(width, height) * 0.08));

  switch (position) {
    case "top-left":
      return {
        centerX: margin,
        centerY: height - margin,
        align: "left",
      };
    case "top-right":
      return {
        centerX: width - margin,
        centerY: height - margin,
        align: "right",
      };
    case "bottom-left":
      return {
        centerX: margin,
        centerY: margin,
        align: "left",
      };
    case "bottom-right":
      return {
        centerX: width - margin,
        centerY: margin,
        align: "right",
      };
    case "center":
    default:
      return {
        centerX: width / 2,
        centerY: height / 2,
        align: "center",
      };
  }
}

export async function applyTextWatermark({
  inputPath,
  outputPath,
  text,
  opacity,
  rotation,
  fontSize,
  color,
  position,
}) {
  const existingPDFBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(existingPDFBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const cleanText = typeof text === "string" ? text.trim() : "";
  if (!cleanText) {
    throw new Error("Watermark text is required");
  }

  const safeOpacity = Math.max(0, Math.min(1, toFiniteNumber(opacity, 0.3)));
  const safeRotation = Math.max(-180, Math.min(180, toFiniteNumber(rotation, -45)));
  const safeFontSize = Math.max(12, Math.min(120, toFiniteNumber(fontSize, 48)));
  const fadedColor = mixColorWithWhite(color, safeOpacity);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(cleanText, safeFontSize);
    const textHeight = font.heightAtSize(safeFontSize);
    const placement = resolveWatermarkPlacement(position, width, height, textWidth, textHeight);

    let centerX = placement.centerX;
    if (placement.align === "left") {
      centerX = placement.centerX + textWidth / 2;
    } else if (placement.align === "right") {
      centerX = placement.centerX - textWidth / 2;
    }

    const centerY = placement.centerY;
    const rotation = -safeRotation;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const halfW = textWidth / 2;
    const halfH = textHeight / 2;
    const rotatedOffsetX = halfW * cos - halfH * sin;
    const rotatedOffsetY = halfW * sin + halfH * cos;

    const drawX = centerX - rotatedOffsetX;
    const drawY = centerY - rotatedOffsetY;

    page.drawText(cleanText, {
      x: drawX,
      y: drawY,
      size: safeFontSize,
      font,
      color: fadedColor,
      rotate: degrees(rotation),
      opacity: 1,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}
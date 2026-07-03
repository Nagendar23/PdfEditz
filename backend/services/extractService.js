import fs from "fs";
import { PDFDocument } from "pdf-lib";

export const getPdfPageCount = async (inputPath) => {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  return {
    pageCount: pdfDoc.getPageCount(),
  };
};

export const extractPdfPages = async ({ inputPath, outputPath, pageNumbers }) => {
  const pdfBytes = fs.readFileSync(inputPath);
  const sourcePdf = await PDFDocument.load(pdfBytes);
  const outputPdf = await PDFDocument.create();

  const zeroBasedPageIndices = pageNumbers.map((pageNumber) => pageNumber - 1);
  const copiedPages = await outputPdf.copyPages(sourcePdf, zeroBasedPageIndices);

  copiedPages.forEach((page) => outputPdf.addPage(page));

  const outputBytes = await outputPdf.save();
  fs.writeFileSync(outputPath, outputBytes);

  return {
    size: outputBytes.length,
    pageCount: copiedPages.length,
  };
};
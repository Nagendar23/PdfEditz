"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PdfViewerProps {
    fileUrl: any;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [error, setError] = useState<boolean>(false);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setError(false);
    }

    function onDocumentLoadError(err: Error) {
        console.error("Failed to load PDF:", err);
        setError(true);
    }

    if (error) {
        return <div>Failed to load PDF</div>;
    }

    return (
        <div className="pdf-viewer">
            <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
            >
                {numPages && Array.from(new Array(numPages), (el, index) => (
                    <Page 
                        key={`page_${index + 1}`} 
                        pageNumber={index + 1} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false} 
                    />
                ))}
            </Document>
        </div>
    );
}

"use client";

import { useState, type ComponentProps, type MouseEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PAGE_SCALE = 1.5;

type PdfFile = ComponentProps<typeof Document>["file"];

interface PdfViewerProps {
  fileUrl: PdfFile;
}

interface PageDimensions {
  width: number;
  height: number;
}

interface PageProxyLike {
  getViewport: (params: { scale: number }) => PageDimensions;
}

interface OverlayPoint{
    page:number;
    x:number;
    y:number;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<boolean>(false);
  const [pageDimensions, setPageDimensions] = useState<
    Record<number, PageDimensions>
  >({});

  const [overlays, setOverlays] = useState<OverlayPoint[]>([]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error("Failed to load PDF:", err);
    setError(true);
  }
  function onPageLoadSuccess(pageNumber: number, page: PageProxyLike) {
    const viewport = page.getViewport({ scale: PAGE_SCALE });
    setPageDimensions((prev) => {
      const existing = prev[pageNumber];
      if (
        existing &&
        existing.width === viewport.width &&
        existing.height === viewport.height
      ) {
        return prev;
      }
      return {
        ...prev,
        [pageNumber]: {
          width: viewport.width,
          height: viewport.height,
        },
      };
    });
  }

  function onPageClick(pageNumber: number, event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const pageWidth = pageDimensions[pageNumber]?.width ?? rect.width;
    const pageHeight = pageDimensions[pageNumber]?.height ?? rect.height;

    const normalizedX = Math.min(Math.max(x / pageWidth, 0), 1);
    const normalizedY = Math.min(Math.max(y / pageHeight, 0), 1);

    const payload:OverlayPoint = {
      page: pageNumber,
      x: normalizedX,
      y: normalizedY,
    };

    setOverlays((prev)=> [...prev, payload]);
    console.log("Overlay payload:", payload)

    console.log("Raw click (px):", {
      page: pageNumber,
      rawX: x,
      rawY: y,
    });

    console.log("Raw click:", { page: pageNumber, x, y });
    console.log({
      page: pageNumber,
      normalizedX,
      normalizedY,
    });
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
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const pageOverlays = overlays.filter((o)=> o.page === pageNumber);
          return (
            <div
              key={pageNumber}
              onClick={(event) => onPageClick(pageNumber, event)}
              style={{
                position: "relative",
                width: "fit-content",
                cursor: "crosshair",
                marginBottom:"12px",
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={PAGE_SCALE}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page) =>
                  onPageLoadSuccess(pageNumber, page as PageProxyLike)
                }
              />
              <div
              style={{
                position:"absolute",
                inset:0,
                pointerEvents:"none",
                zIndex:20,
              }}
              >
                {
                    pageOverlays.map((o,i)=>(
                        <div
                            key={String(pageNumber)+ "-" + String(i)}
                            style={{
                                position:"absolute",
                                left:(o.x *100).toFixed(4) + "%",
                                top:(o.y *100).toFixed(4) + "%",
                                transform:"translate(-50%, -50%)",
                                background:"red",
                                width:"10px",
                                height:"10px",
                                borderRadius:"50%",
                            }}
                        />

                    ))
                }
              </div>
            </div>
          );
        })}
        {/* 
                {numPages && Array.from(new Array(numPages), (el, index) => (
                    <Page 
                        key={`page_${index + 1}`} 
                        pageNumber={index + 1} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false} 
                    />
                ))} */}
      </Document>
    </div>
  );
}

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

interface OverlayText {
  id: string;
  type: "text";
  page: number;
  x: number;
  y: number;
  content: string;
  style: {
    fontSize: number;
    color: string;
  };
}

function createOverlayId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<Record<number, PageDimensions>>({});
  const [overlays, setOverlays] = useState<OverlayText[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
    if (draggingId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const pageWidth = pageDimensions[pageNumber]?.width ?? rect.width;
    const pageHeight = pageDimensions[pageNumber]?.height ?? rect.height;

    const normalizedX = Math.min(Math.max(x / pageWidth, 0), 1);
    const normalizedY = Math.min(Math.max(y / pageHeight, 0), 1);

    const newId = createOverlayId();

    setOverlays((prev) => [
      ...prev,
      {
        id: newId,
        type: "text",
        page: pageNumber,
        x: normalizedX,
        y: normalizedY,
        content: "Text",
        style: {
          fontSize: 16,
          color: "red",
        },
      },
    ]);

    setActiveId(newId);
  }

  function updateOverlayContent(id: string, content: string) {
    setOverlays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content } : item))
    );
  }

  function onPageMouseMove(pageNumber: number, event: MouseEvent<HTMLDivElement>) {
    if (!draggingId) return;

    const draggingOverlay = overlays.find((o) => o.id === draggingId);
    if (!draggingOverlay || draggingOverlay.page !== pageNumber) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const normalizedX = Math.min(Math.max(x / rect.width, 0), 1);
    const normalizedY = Math.min(Math.max(y / rect.height, 0), 1);

    setOverlays((prev) =>
      prev.map((item) =>
        item.id === draggingId ? { ...item, x: normalizedX, y: normalizedY } : item
      )
    );
  }

  function stopDragging() {
    setDraggingId(null);
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
          const pageOverlays = overlays.filter((o) => o.page === pageNumber);

          return (
            <div
              key={pageNumber}
              onClick={(event) => onPageClick(pageNumber, event)}
              onMouseMove={(event) => onPageMouseMove(pageNumber, event)}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
              style={{
                position: "relative",
                width: "fit-content",
                cursor: draggingId ? "grabbing" : "crosshair",
                marginBottom: "12px",
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
                  position: "absolute",
                  inset: 0,
                  zIndex: 20,
                }}
              >
                {pageOverlays.map((o) => (
                  <div
                    key={o.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (activeId === o.id) return;
                      setDraggingId(o.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingId) setActiveId(o.id);
                    }}
                    style={{
                      position: "absolute",
                      left: `${o.x * 100}%`,
                      top: `${o.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      color: o.style.color,
                      fontSize: `${o.style.fontSize}px`,
                      cursor: activeId === o.id ? "text" : "move",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    {o.id === activeId ? (
                      <input
                        value={o.content}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateOverlayContent(o.id, e.target.value)}
                        onBlur={() => setActiveId(null)}
                        style={{
                          fontSize: `${o.style.fontSize}px`,
                          color: o.style.color,
                          border: "1px solid #ccc",
                          padding: "2px 4px",
                          minWidth: "60px",
                          userSelect: "text",
                        }}
                      />
                    ) : (
                      <span>{o.content}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Document>
    </div>
  );
}
"use client";

import { useState, type ComponentProps, type MouseEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { applyOverlay, type OverlayRequestPayload } from "@/services/api";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PAGE_SCALE = 1.5;

type PdfFile = ComponentProps<typeof Document>["file"];

interface PdfViewerProps {
  fileUrl: PdfFile;
  fileId: string;
}

interface OverlayText {
  id: string;
  type: "text";
  page: number;
  x: number;
  y: number;
  content: string;
  rotation: number;
  opacity: number;
  style: {
    fontSize: number;
    color: string;
  };
}

function createOverlayId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
}

function buildPayload(overlays: OverlayText[]): OverlayRequestPayload {
  return {
    elements: overlays
      .filter((o) => o.content.trim().length > 0)
      .map((o) => ({
        type: "text",
        text: o.content,
        page: o.page - 1,
        position: {
          x: o.x,
          y: o.y,
        },
        rotation: o.rotation,
        opacity: o.opacity,
        style: {
          fontSize: o.style.fontSize,
          color: o.style.color,
          align: "center",
          previewScale: PAGE_SCALE,
        },
      })),
  };
}

export default function PdfViewer({ fileUrl, fileId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);
  const [overlays, setOverlays] = useState<OverlayText[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const activeOverlay = overlays.find((item) => item.id === activeId) ?? null;

  function clearSelection() {
    setActiveId(null);
    setEditingId(null);
    setDraggingId(null);
  }

  function handleSelectOverlay(id: string) {
    setActiveId(id);
    setEditingId(null);
    setDraggingId(null);
  }

  function removeOverlayById(id: string) {
    setOverlays((prev) => prev.filter((item) => item.id !== id));

    if (activeId === id) {
      setActiveId(null);
    }
    if (editingId === id) {
      setEditingId(null);
    }
    if (draggingId === id) {
      setDraggingId(null);
    }
  }

  function handleDeleteSelected() {
    if (!activeId) return;
    removeOverlayById(activeId);
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error("Failed to load PDF:", err);
    setError(true);
  }

  function createOverlayAtClick(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const normalizedX = Math.min(Math.max(x / rect.width, 0), 1);
    const normalizedY = Math.min(Math.max(y / rect.height, 0), 1);

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
        rotation: 0,
        opacity: 1,
        style: {
          fontSize: 16,
          color: "#ff0000",
        },
      },
    ]);

    setActiveId(newId);
    setEditingId(newId);
  }

  function onPageBackgroundClick() {
    if (draggingId) return;
    clearSelection();
  }

  function onPageBackgroundDoubleClick(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    if (draggingId) return;
    createOverlayAtClick(pageNumber, event);
  }

  function updateOverlayContent(id: string, content: string) {
    setOverlays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content } : item))
    );
  }

  function updateActiveOverlayStyle(stylePatch: Partial<OverlayText["style"]>) {
    if (!activeId) return;

    setOverlays((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? {
              ...item,
              style: {
                ...item.style,
                ...stylePatch,
              },
            }
          : item
      )
    );
  }

  function onPageMouseMove(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
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
        item.id === draggingId
          ? { ...item, x: normalizedX, y: normalizedY }
          : item
      )
    );
  }

  function stopDragging() {
    setDraggingId(null);
  }

  async function handleApplyChanges() {
    setApplyMessage(null);
    setApplyError(null);

    const payload = buildPayload(overlays);

    if (payload.elements.length === 0) {
      setApplyError("Add at least one text overlay before applying.");
      return;
    }

    try {
      setIsApplying(true);
      const result = await applyOverlay(fileId, payload);
      setApplyMessage("Overlay applied. New file id: " + result.file._id);
      console.log("New file:", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Overlay failed";
      setApplyError(message);
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  }

  if (error) {
    return <div>Failed to load PDF</div>;
  }

  return (
    <div
      className="pdf-viewer"
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: "280px",
          minWidth: "240px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "10px",
          background: "#fafafa",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Overlays</h3>

        {overlays.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#666" }}>
            No overlays yet. Double click on the page to add one.
          </div>
        ) : (
          overlays.map((o, index) => (
            <div
              key={o.id}
              onClick={() => handleSelectOverlay(o.id)}
              style={{
                padding: "8px",
                marginBottom: "6px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                cursor: "pointer",
                background: o.id === activeId ? "#d0e7ff" : "#f5f5f5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <strong style={{ fontSize: "13px" }}>
                  {o.content.trim() || "Text " + String(index + 1)}
                </strong>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOverlayById(o.id);
                  }}
                  style={{
                    fontSize: "12px",
                    padding: "2px 6px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#b00020",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>

              <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                Page: {o.page} | ({o.x.toFixed(2)}, {o.y.toFixed(2)})
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ flex: "1 1 700px", minWidth: "280px" }}>
        <div
          style={{
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Font Size:
            <input
              type="number"
              min={8}
              value={activeOverlay?.style.fontSize ?? 16}
              disabled={!activeId}
              onChange={(e) => {
                if (!activeId) return;
                const size = Number(e.target.value);
                if (Number.isNaN(size)) return;
                updateActiveOverlayStyle({ fontSize: Math.max(8, size) });
              }}
              style={{ width: "70px" }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Color:
            <input
              type="color"
              value={activeOverlay?.style.color ?? "#ff0000"}
              disabled={!activeId}
              onChange={(e) => {
                if (!activeId) return;
                updateActiveOverlayStyle({ color: e.target.value });
              }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Rotation:
            <input
              type="number"
              value={activeOverlay?.rotation ?? 0}
              disabled={!activeId}
              onChange={(e) => {
                if (!activeId) return;
                const rotation = Number(e.target.value);
                if (Number.isNaN(rotation)) return;
                setOverlays((prev) =>
                  prev.map((item) =>
                    item.id === activeId ? { ...item, rotation } : item
                  )
                );
              }}
              style={{ width: "80px" }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Opacity:
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={activeOverlay?.opacity ?? 1}
              disabled={!activeId}
              onChange={(e) => {
                if (!activeId) return;
                const opacity = Number(e.target.value);
                setOverlays((prev) =>
                  prev.map((item) =>
                    item.id === activeId ? { ...item, opacity } : item
                  )
                );
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!activeId}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: activeId ? "#fff" : "#f3f4f6",
              color: activeId ? "#b00020" : "#888",
              cursor: activeId ? "pointer" : "not-allowed",
            }}
          >
            Delete Selected
          </button>

          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isApplying}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: isApplying ? "#f3f4f6" : "#fff",
              cursor: isApplying ? "not-allowed" : "pointer",
            }}
          >
            {isApplying ? "Applying..." : "Apply Changes"}
          </button>

          <span style={{ fontSize: "12px", color: "#666" }}>
            {activeId ? "Overlay selected" : "Select an overlay to edit style"}
          </span>

          {applyMessage && (
            <span style={{ fontSize: "12px", color: "green" }}>{applyMessage}</span>
          )}

          {applyError && (
            <span style={{ fontSize: "12px", color: "crimson" }}>{applyError}</span>
          )}
        </div>

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
                onClick={onPageBackgroundClick}
                onDoubleClick={(event) =>
                  onPageBackgroundDoubleClick(pageNumber, event)
                }
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
                        if (editingId === o.id) return;
                        setActiveId(o.id);
                        setDraggingId(o.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!draggingId) {
                          setActiveId(o.id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveId(o.id);
                        setEditingId(o.id);
                      }}
                      style={{
                        position: "absolute",
                        left: String(o.x * 100) + "%",
                        top: String(o.y * 100) + "%",
                        transform:
                          "translate(-50%, -50%) rotate(" + o.rotation + "deg)",
                        transformOrigin: "center center",
                        color: o.style.color,
                        fontSize: String(o.style.fontSize) + "px",
                        opacity: o.opacity,
                        border: o.id === activeId ? "1px solid blue" : "none",
                        padding: "2px",
                        fontFamily: "Times New Roman, Times, serif",
                        lineHeight: "1",
                        cursor: editingId === o.id ? "text" : "move",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      {o.id === editingId ? (
                        <input
                          value={o.content}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateOverlayContent(o.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          style={{
                            fontSize: String(o.style.fontSize) + "px",
                            color: o.style.color,
                            fontFamily: "Times New Roman, Times, serif",
                            lineHeight: "1",
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
    </div>
  );
}
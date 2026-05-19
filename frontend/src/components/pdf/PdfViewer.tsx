"use client";

import { useState, useEffect, useMemo, memo, type ComponentProps, type MouseEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { applyOverlay, type OverlayRequestPayload } from "@/services/api";
import { getDownloadUrl, getFilePreviewUrl } from "@/services/fileService";
import { getToken } from "@/utils/auth";

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

interface OverlayHistoryState {
  past: OverlayText[][];
  present: OverlayText[];
  future: OverlayText[][];
}

type OverlayUpdate = OverlayText[] | ((current: OverlayText[]) => OverlayText[]);

interface DragPreviewState {
  id: string;
  page: number;
  x: number;
  y: number;
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
  const [currentFileId, setCurrentFileId] = useState(fileId);

  const [history, setHistory] = useState<OverlayHistoryState>({
    past: [],
    present: [],
    future: [],
  });

  const overlays = history.present;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [isOverlayHydrated, setIsOverlayHydrated] = useState(false);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const activeOverlay = overlays.find((item) => item.id === activeId) ?? null;

  function clearSelection() {
    setActiveId(null);
    setEditingId(null);
    setDraggingId(null);
    setDragPreview(null);
  }

  function updateOverlays(next: OverlayUpdate) {
    setHistory((prev) => {
      const newPresent =
        typeof next === "function"
          ? (next as (current: OverlayText[]) => OverlayText[])(prev.present)
          : next;

      if (newPresent === prev.present) {
        return prev;
      }

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: [],
      };
    });
  }

  function undo() {
    clearSelection();

    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];

      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }

  function redo() {
    clearSelection();

    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }

  useEffect(() => {
    if (!fileId) return;

    setCurrentFileId(fileId);
    setIsOverlayHydrated(false);
    clearSelection();

    const storageKey = "overlays_" + fileId;
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      setHistory({
        past: [],
        present: [],
        future: [],
      });
      setIsOverlayHydrated(true);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setHistory({
          past: [],
          present: parsed as OverlayText[],
          future: [],
        });
      } else {
        console.error("Invalid overlay data");
        setHistory({
          past: [],
          present: [],
          future: [],
        });
      }
    } catch {
      console.error("Invalid overlay data");
      setHistory({
        past: [],
        present: [],
        future: [],
      });
    } finally {
      setIsOverlayHydrated(true);
    }
  }, [fileId]);

  useEffect(() => {
    if (!fileId || !isOverlayHydrated) return;

    const storageKey = "overlays_" + fileId;
    localStorage.setItem(storageKey, JSON.stringify(overlays));
  }, [overlays, fileId, isOverlayHydrated]);

  function handleSelectOverlay(id: string) {
    setDraggingId(null);
    setDragPreview(null);

    if (activeId === id) {
      setEditingId(id);
      return;
    }

    setActiveId(id);
    setEditingId(null);
  }

  function removeOverlayById(id: string) {
    updateOverlays((prev) => prev.filter((item) => item.id !== id));

    if (activeId === id) {
      setActiveId(null);
    }
    if (editingId === id) {
      setEditingId(null);
    }
    if (draggingId === id) {
      setDraggingId(null);
      setDragPreview(null);
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

    updateOverlays((prev) => [
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
    updateOverlays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content } : item))
    );
  }

  function updateActiveOverlayStyle(stylePatch: Partial<OverlayText["style"]>) {
    if (!activeId) return;

    updateOverlays((prev) =>
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

    setDragPreview({
      id: draggingId,
      page: pageNumber,
      x: normalizedX,
      y: normalizedY,
    });
  }

  function stopDragging() {
    if (!draggingId) {
      setDragPreview(null);
      return;
    }

    const preview = dragPreview;
    const currentDraggingId = draggingId;

    if (preview && preview.id === currentDraggingId) {
      const original = overlays.find((item) => item.id === currentDraggingId);

      if (
        original &&
        (original.x !== preview.x || original.y !== preview.y)
      ) {
        updateOverlays((prev) =>
          prev.map((item) =>
            item.id === currentDraggingId
              ? { ...item, x: preview.x, y: preview.y }
              : item
          )
        );
      }
    }

    setDraggingId(null);
    setDragPreview(null);
  }

  async function downloadPdf() {
    const token = getToken();
    if (!token) {
      setApplyError("Auth token missing. Please log in again.");
      return;
    }

    try {
      const res = await fetch(getDownloadUrl(currentFileId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "edited.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setApplyError(message);
      console.error(err);
    }
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
      const result = await applyOverlay(currentFileId, payload);
      
      // Update to the new processed file ID
      setCurrentFileId(result.file._id);
      
      setApplyMessage("Overlay applied successfully! Download or continue editing.");
      console.log("New file:", result);
      
      // Clear overlays since they're now baked into the PDF
      updateOverlays([]);
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
              onDoubleClick={() => {
                setActiveId(o.id);
                setEditingId(o.id);
                setDraggingId(null);
                setDragPreview(null);
              }}
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
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: canUndo ? "#fff" : "#f3f4f6",
              color: canUndo ? "#111827" : "#888",
              cursor: canUndo ? "pointer" : "not-allowed",
            }}
          >
            Undo
          </button>

          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: canRedo ? "#fff" : "#f3f4f6",
              color: canRedo ? "#111827" : "#888",
              cursor: canRedo ? "pointer" : "not-allowed",
            }}
          >
            Redo
          </button>

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

                updateOverlays((prev) =>
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

                updateOverlays((prev) =>
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

          <button
            type="button"
            onClick={downloadPdf}
            style={{
              padding: "6px 12px",
              border: "1px solid #28a745",
              borderRadius: "6px",
              background: "#fff",
              color: "#28a745",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Download PDF
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

        {/* stabilize the Document `file` prop so unrelated state updates don't recreate it */}
        <Document
          file={useMemo(
            () => ({ ...fileUrl, url: fileUrl.url || getFilePreviewUrl(currentFileId) }),
            [fileUrl, currentFileId]
          )}
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
                {/* Memoized Page to avoid re-rendering PDF canvas on overlay edits */}
                <MemoPdfPage pageNumber={pageNumber} />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                  }}
                >
                  {pageOverlays.map((o) => {
                    const preview = dragPreview?.id === o.id ? dragPreview : null;
                    const x = preview ? preview.x : o.x;
                    const y = preview ? preview.y : o.y;

                    return (
                      <div
                        key={o.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (editingId === o.id) {
                            setActiveId(o.id);
                            return;
                          }

                          setActiveId(o.id);
                          setEditingId(null);
                          setDraggingId(o.id);
                          setDragPreview({
                            id: o.id,
                            page: o.page,
                            x: o.x,
                            y: o.y,
                          });
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveId(o.id);
                          if (editingId !== o.id) {
                            setEditingId(null);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setActiveId(o.id);
                          setEditingId(o.id);
                        }}
                        style={{
                          position: "absolute",
                          left: String(x * 100) + "%",
                          top: String(y * 100) + "%",
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
}

// Memoized wrapper around react-pdf's Page to avoid re-rendering the canvas
const MemoPdfPage = memo(
  ({ pageNumber }: { pageNumber: number }) => (
    <Page
      pageNumber={pageNumber}
      scale={PAGE_SCALE}
      renderTextLayer={false}
      renderAnnotationLayer={false}
    />
  ),
  (prev, next) => prev.pageNumber === next.pageNumber
);
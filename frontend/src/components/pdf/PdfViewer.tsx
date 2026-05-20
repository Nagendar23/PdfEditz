"use client";

import { useState, useEffect, useMemo, memo, type ComponentProps, type MouseEvent, type ChangeEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { applyOverlay, uploadFile, type OverlayRequestPayload } from "@/services/api";
import { getDownloadUrl, getFilePreviewUrl, normalizeUploadUrl } from "@/services/fileService";
import { getToken } from "@/services/authService";

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

interface OverlayImage {
  id: string;
  type: "image";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  imageFileId: string;
  imageUrl: string;
}

type OverlayItem = OverlayText | OverlayImage;

interface OverlayHistoryState {
  past: OverlayItem[][];
  present: OverlayItem[];
  future: OverlayItem[][];
}

type OverlayUpdate = OverlayItem[] | ((current: OverlayItem[]) => OverlayItem[]);

interface DragPreviewState {
  id: string;
  page: number;
  x: number;
  y: number;
}

interface ResizePreviewState {
  id: string;
  type: "text" | "image";
  fontSize?: number;
  width?: number;
  height?: number;
}

interface UploadedFile {
  _id: string;
  fileUrl: string;
  originalName?: string;
  fileType?: string;
  size?: number;
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

function buildPayload(overlays: OverlayItem[]): OverlayRequestPayload {
  return {
    elements: overlays
      .map((o) => {
        if (o.type === "image") {
          return {
            type: "image" as const,
            imageFileId: o.imageFileId,
            page: o.page - 1,
            position: {
              x: o.x,
              y: o.y,
            },
            size: {
              width: o.width,
              height: o.height,
            },
            previewScale: PAGE_SCALE,
            rotation: o.rotation,
            opacity: o.opacity,
          };
        }

        if (o.content.trim().length === 0) {
          return null;
        }

        return {
          type: "text" as const,
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
            align: "center" as const,
            previewScale: PAGE_SCALE,
          },
        };
      })
      .filter((element): element is NonNullable<typeof element> => element !== null),
  };
}

export default function PdfViewer({ fileUrl, fileId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(fileId);
  const [pendingImage, setPendingImage] = useState<UploadedFile | null>(null);

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
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreviewState | null>(null);

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
          ? (next as (current: OverlayItem[]) => OverlayItem[])(prev.present)
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
          present: parsed as OverlayItem[],
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

  useEffect(() => {
    if (activeId && !overlays.some((item) => item.id === activeId)) {
      setActiveId(null);
    }
    if (editingId && !overlays.some((item) => item.id === editingId)) {
      setEditingId(null);
    }
    if (draggingId && !overlays.some((item) => item.id === draggingId)) {
      setDraggingId(null);
      setDragPreview(null);
    }
    if (resizingId && !overlays.some((item) => item.id === resizingId)) {
      setResizingId(null);
      setResizePreview(null);
    }
  }, [overlays, activeId, editingId, draggingId, resizingId]);

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

  function onPageBackgroundClick(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    if (draggingId || resizingId) return;

    console.log("🖱️ Click on page", pageNumber, "pendingImage:", !!pendingImage);

    if (pendingImage) {
      console.log("➡️ Creating image overlay from pending image");
      createImageOverlayAtClick(pageNumber, event);
      return;
    }

    clearSelection();
  }

  function onPageBackgroundDoubleClick(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    if (draggingId || resizingId || pendingImage) return;
    createOverlayAtClick(pageNumber, event);
  }

  function updateOverlayContent(id: string, content: string) {
    updateOverlays((prev) =>
      prev.map((item) =>
        item.id === id && item.type === "text" ? { ...item, content } : item
      )
    );
  }

  function updateActiveOverlayStyle(stylePatch: Partial<OverlayText["style"]>) {
    if (!activeId || !activeOverlay || activeOverlay.type !== "text") return;

    updateOverlays((prev) =>
      prev.map((item) =>
        item.id === activeId && item.type === "text"
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

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    console.log("Uploading:", file);

    try {
      const uploaded = await uploadFile(file);
      console.log("Upload success:", uploaded);
      setPendingImage(uploaded);
      setApplyMessage("Image uploaded. Click on PDF to place it.");
      setApplyError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      console.error("Upload failed:", err);
      setApplyError(message);
    }
  }

  function createImageOverlayAtClick(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    if (!pendingImage) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const normalizedX = Math.min(Math.max(x / rect.width, 0), 1);
    const normalizedY = Math.min(Math.max(y / rect.height, 0), 1);
    const newId = createOverlayId();

    const imageUrl = normalizeUploadUrl(pendingImage.fileUrl);

    console.log("📸 Creating image overlay:", {
      pageNumber,
      x: normalizedX,
      y: normalizedY,
      imageFileId: pendingImage._id,
      imageUrl,
      fileUrl: pendingImage.fileUrl,
      pendingImage,
    });

    updateOverlays((prev) => [
      ...prev,
      {
        id: newId,
        type: "image",
        page: pageNumber,
        x: normalizedX,
        y: normalizedY,
        imageFileId: pendingImage._id,
        imageUrl,
        width: 150,
        height: 100,
        rotation: 0,
        opacity: 1,
      },
    ]);

    setPendingImage(null);
    setActiveId(newId);
    setEditingId(null);
  }

  function onPageMouseMove(
    pageNumber: number,
    event: MouseEvent<HTMLDivElement>
  ) {
    // Resize handling takes priority over dragging
    if (resizingId) {
      const overlay = overlays.find((o) => o.id === resizingId);
      if (!overlay || overlay.page !== pageNumber) return;

      // Use movementX to change size — scale factor tuned for UX
      const deltaX = (event.nativeEvent as unknown as MouseEvent).movementX || 0;

      if (overlay.type === "image") {
        const baseWidth = resizePreview?.width ?? overlay.width;
        const baseHeight = resizePreview?.height ?? overlay.height;
        const newWidth = Math.max(40, Math.min(600, Math.round(baseWidth + deltaX * 0.6)));
        const aspectRatio = baseWidth > 0 ? baseHeight / baseWidth : 1;
        const newHeight = Math.max(40, Math.round(newWidth * aspectRatio));

        setResizePreview({
          id: resizingId,
          type: "image",
          width: newWidth,
          height: newHeight,
        });
        return;
      }

      const base = resizePreview?.fontSize ?? overlay.style.fontSize;
      const newSize = Math.max(8, Math.min(120, Math.round(base + deltaX * 0.2)));

      setResizePreview({ id: resizingId, type: "text", fontSize: newSize });
      return;
    }

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
              ? {
                  ...item,
                  x: Math.max(0, Math.min(1, preview.x)),
                  y: Math.max(0, Math.min(1, preview.y)),
                }
              : item
          )
        );
      }
    }

    setDraggingId(null);
    setDragPreview(null);
  }

  function stopResize() {
    if (!resizingId) {
      setResizePreview(null);
      return;
    }

    if (resizePreview) {
      updateOverlays((prev) =>
        prev.map((item) =>
          item.id !== resizingId
            ? item
            : resizePreview.type === "image" && item.type === "image"
              ? {
                  ...item,
                  width: Math.max(40, Math.min(600, resizePreview.width!)),
                  height: Math.max(40, resizePreview.height!),
                }
              : resizePreview.type === "text" && item.type === "text"
                ? {
                    ...item,
                    style: {
                      ...item.style,
                      fontSize: Math.max(8, Math.min(120, resizePreview.fontSize!)),
                    },
                  }
                : item
        )
      );
    }

    setResizingId(null);
    setResizePreview(null);
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

  // Memoize document file prop (must be before early returns)
  const documentFile = useMemo(
    () => {
      if (typeof fileUrl === "string") return fileUrl;
      if (fileUrl === null) return getFilePreviewUrl(currentFileId);
      return fileUrl;
    },
    [fileUrl, currentFileId]
  );

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

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#444" }}>Upload image:</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
          {pendingImage && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Image ready: click on PDF to place it.
            </div>
          )}
        </div>

        <hr style={{ margin: "10px 0", border: "none", borderTop: "1px solid #ddd" }} />

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
                  {o.type === "image"
                    ? "Image " + String(index + 1)
                    : o.content.trim() || "Text " + String(index + 1)}
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

          {activeOverlay && activeOverlay.type === "text" && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Font Size:
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={activeOverlay.style.fontSize}
                  disabled={!activeId}
                  onChange={(e) => {
                    if (!activeId) return;
                    const size = Number(e.target.value);
                    if (Number.isNaN(size)) return;
                    updateActiveOverlayStyle({ fontSize: Math.max(8, Math.min(120, size)) });
                  }}
                  style={{ width: "70px" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Color:
                <input
                  type="color"
                  value={activeOverlay.style.color}
                  disabled={!activeId}
                  onChange={(e) => {
                    if (!activeId) return;
                    updateActiveOverlayStyle({ color: e.target.value });
                  }}
                />
              </label>
            </>
          )}

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
          file={documentFile}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;
            const pageOverlays = overlays.filter((o) => o.page === pageNumber);

            return (
              <div
                key={pageNumber}
                onClick={(event) => onPageBackgroundClick(pageNumber, event)}
                onDoubleClick={(event) =>
                  onPageBackgroundDoubleClick(pageNumber, event)
                }
                onMouseMove={(event) => onPageMouseMove(pageNumber, event)}
                onMouseUp={() => {
                  stopDragging();
                  stopResize();
                }}
                onMouseLeave={() => {
                  stopDragging();
                  stopResize();
                }}
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

                    const isResizingThis = resizePreview?.id === o.id;
                    const displayFontSize =
                      o.type === "text"
                        ? isResizingThis && resizePreview?.type === "text"
                          ? resizePreview.fontSize!
                          : o.style.fontSize
                        : 16;
                    const displayWidth =
                      o.type === "image"
                        ? isResizingThis && resizePreview?.type === "image"
                          ? resizePreview.width!
                          : o.width
                        : 0;
                    const displayHeight =
                      o.type === "image"
                        ? isResizingThis && resizePreview?.type === "image"
                          ? resizePreview.height!
                          : o.height
                        : 0;

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
                          zIndex: o.id === activeId ? 1000 : 1,
                          opacity: o.opacity,
                          border: o.id === activeId ? "1px solid blue" : "none",
                          padding: "6px",
                          fontFamily: o.type === "text" ? "Times New Roman, Times, serif" : undefined,
                          lineHeight: "1",
                          cursor: o.type === "text" && editingId === o.id ? "text" : "move",
                          whiteSpace: o.type === "text" ? "nowrap" : "normal",
                          userSelect: "none",
                          width: o.type === "image" ? String(displayWidth) + "px" : undefined,
                          height: o.type === "image" ? String(displayHeight) + "px" : undefined,
                        }}
                      >
                        {o.id === activeId && (
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizingId(o.id);
                              setResizePreview(
                                o.type === "image"
                                  ? {
                                      id: o.id,
                                      type: "image",
                                      width: o.width,
                                      height: o.height,
                                    }
                                  : {
                                      id: o.id,
                                      type: "text",
                                      fontSize: o.style.fontSize,
                                    }
                              );
                              // cancel dragging preview when resizing
                              setDraggingId(null);
                              setDragPreview(null);
                            }}
                            style={{
                              position: "absolute",
                              width: "10px",
                              height: "10px",
                              background: "blue",
                              right: "-8px",
                              bottom: "-8px",
                              cursor: "nwse-resize",
                              zIndex: 30,
                            }}
                          />
                        )}
                        {o.type === "image" ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={normalizeUploadUrl(o.imageUrl)}
                            alt="Overlay image"
                            draggable={false}
                            onLoad={() => console.log("✅ Image loaded:", o.imageUrl)}
                            onError={() => console.error("❌ Image failed to load:", o.imageUrl)}
                            style={{
                              width: "100%",
                              height: "100%",
                              opacity: o.opacity,
                              objectFit: "contain",
                              display: "block",
                              userSelect: "none",
                              pointerEvents: "none",
                            }}
                          />
                        ) : o.id === editingId ? (
                          <input
                            value={o.content}
                            autoFocus
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleSelectOverlay(o.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOverlay(o.id);
                            }}
                            onChange={(e) => updateOverlayContent(o.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            style={{
                              fontSize: String(displayFontSize) + "px",
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
                          <span
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleSelectOverlay(o.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOverlay(o.id);
                            }}
                            style={{
                              color: o.style.color,
                              fontSize: String(displayFontSize) + "px",
                              display: "inline-block",
                              pointerEvents: "auto",
                            }}
                          >
                            {o.content}
                          </span>
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

MemoPdfPage.displayName = "MemoPdfPage";
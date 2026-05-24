"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { applyTextWatermark, type WatermarkPosition } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const POSITION_LABELS: Record<WatermarkPosition, string> = {
    center: "Center",
    "top-left": "Top left",
    "top-right": "Top right",
    "bottom-left": "Bottom left",
    "bottom-right": "Bottom right",
};

const POSITION_PREVIEW: Record<WatermarkPosition, { left: string; top: string; transformOrigin: string }> = {
    center: { left: "50%", top: "50%", transformOrigin: "center center" },
    "top-left": { left: "18%", top: "20%", transformOrigin: "left top" },
    "top-right": { left: "82%", top: "20%", transformOrigin: "right top" },
    "bottom-left": { left: "18%", top: "80%", transformOrigin: "left bottom" },
    "bottom-right": { left: "82%", top: "80%", transformOrigin: "right bottom" },
};

export default function WatermarkPage() {
    const router = useRouter();
    const { token, isReady } = useAuth();
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
    const [opacity, setOpacity] = useState(0.3);
    const [rotation, setRotation] = useState(-45);
    const [fontSize, setFontSize] = useState(48);
    const [color, setColor] = useState("#FF0000");
    const [position, setPosition] = useState<WatermarkPosition>("center");
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const canApply = useMemo(() => Boolean(pdfFile && watermarkText.trim() && !processing), [pdfFile, watermarkText, processing]);

    function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] || null;
        event.target.value = "";

        if (!file) {
            setPdfFile(null);
            return;
        }

        const MAX_SIZE = 25 * 1024 * 1024;

        if (file.type !== "application/pdf") {
            alert("Only PDFs allowed");
            return;
        }

        if (file.size > MAX_SIZE) {
            alert("File too large");
            return;
        }

        setPdfFile(file);
        setStatus(null);
    }

    async function handleApply() {
        if (!pdfFile) {
            setStatus("Select a PDF first.");
            return;
        }

        if (!watermarkText.trim()) {
            setStatus("Watermark text is required.");
            return;
        }

        try {
            setProcessing(true);
            setStatus("Applying watermark to all pages...");

            const result = await applyTextWatermark({
                file: pdfFile,
                text: watermarkText.trim(),
                opacity,
                rotation,
                fontSize,
                color,
                position,
            });

            router.push(`/editor/${result.file._id}`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Failed to apply watermark");
        } finally {
            setProcessing(false);
        }
    }

    if (!isReady || !token) {
        return <div className="p-6 text-slate-800">Loading authentication...</div>;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Tool</p>
                            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Watermark PDFs</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                Select a PDF, configure a text watermark, and generate a new watermarked PDF for every page.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handlePdfChange}
                            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                        />
                        <p className="text-xs text-slate-500">PDF only. Watermarks are applied to all pages automatically.</p>
                        {pdfFile ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                                <span className="font-medium text-slate-900">Selected PDF:</span> {pdfFile.name}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                        <h2 className="text-lg font-semibold text-slate-900">Watermark controls</h2>
                        <p className="mt-1 text-sm text-slate-500">Preset-based configuration only. No interactive canvas editing.</p>

                        <div className="mt-6 grid gap-4">
                            <label className="grid gap-2 text-sm font-medium text-slate-700">
                                Watermark text
                                <input
                                    type="text"
                                    value={watermarkText}
                                    onChange={(event) => setWatermarkText(event.target.value)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                    Font size: {fontSize}
                                    <input
                                        type="range"
                                        min={12}
                                        max={120}
                                        value={fontSize}
                                        onChange={(event) => setFontSize(Number(event.target.value))}
                                        className="accent-slate-900"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                    Opacity: {opacity.toFixed(2)}
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={opacity}
                                        onChange={(event) => setOpacity(Number(event.target.value))}
                                        className="accent-slate-900"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                    Rotation: {rotation}°
                                    <input
                                        type="range"
                                        min={-180}
                                        max={180}
                                        step={1}
                                        value={rotation}
                                        onChange={(event) => setRotation(Number(event.target.value))}
                                        className="accent-slate-900"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                    Color
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(event) => setColor(event.target.value)}
                                        className="h-12 w-full rounded-xl border border-slate-300 bg-white p-1"
                                    />
                                </label>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Position</h3>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                                    {(Object.keys(POSITION_LABELS) as WatermarkPosition[]).map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setPosition(key)}
                                            className={`rounded-2xl border px-3 py-3 text-xs font-medium transition ${position === key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {POSITION_LABELS[key]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleApply()}
                                disabled={!canApply}
                                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {processing ? "Applying watermark..." : "Apply watermark"}
                            </button>

                            {status ? <p className="text-sm text-slate-600">{status}</p> : null}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                        <h2 className="text-lg font-semibold">Preview</h2>
                        <p className="mt-1 text-sm text-slate-300">A lightweight sample of the configured watermark.</p>

                        <div className="mt-6 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-4">
                            <div className="relative aspect-8.5/11 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-[#f8fafc] text-slate-900 shadow-inner">
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.18)_0%,transparent_32%,rgba(255,255,255,0.08)_60%,transparent_100%)]" />
                                <div className="absolute inset-6 rounded-2xl border border-slate-200 bg-white/70 p-5">
                                    <div className="h-3 w-28 rounded-full bg-slate-200" />
                                    <div className="mt-4 space-y-2">
                                        <div className="h-2 w-full rounded-full bg-slate-200" />
                                        <div className="h-2 w-5/6 rounded-full bg-slate-200" />
                                        <div className="h-2 w-4/6 rounded-full bg-slate-200" />
                                    </div>

                                    <div
                                        className="pointer-events-none absolute"
                                        style={{
                                            left: POSITION_PREVIEW[position].left,
                                            top: POSITION_PREVIEW[position].top,
                                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                            transformOrigin: POSITION_PREVIEW[position].transformOrigin,
                                            opacity,
                                        }}
                                    >
                                        <div
                                            className="select-none whitespace-nowrap font-semibold uppercase tracking-[0.35em]"
                                            style={{
                                                fontSize: `${Math.max(12, Math.round(fontSize * 0.52))}px`,
                                                color,
                                                textShadow: "0 0 18px rgba(255,255,255,0.28)",
                                            }}
                                        >
                                            {watermarkText.trim() || "CONFIDENTIAL"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
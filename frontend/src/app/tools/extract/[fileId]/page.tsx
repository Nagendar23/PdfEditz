"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Document, Page, pdfjs, type DocumentProps } from "react-pdf";
import { getFiles } from "@/services/api";
import { extractPdfPages, getFilePreviewUrl, type ExtractPdfResponse } from "@/services/fileService";
import { useAuth } from "@/context/AuthContext";
import { parsePageSelectionInput } from "@/utils/pageSelection";
import type { FileType } from "@/types/file";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

type PdfFile = DocumentProps["file"];

export default function ExtractPagesPage() {
    const router = useRouter();
    const params = useParams();
    const { token, isReady } = useAuth();

    const fileIdParam = Array.isArray(params.fileId) ? params.fileId[0] : params.fileId;
    const fileId = typeof fileIdParam === "string" ? fileIdParam : "";

    const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
    const [loadingFile, setLoadingFile] = useState(true);
    const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [pageInput, setPageInput] = useState("1-5");
    const [extracting, setExtracting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (!token) {
            router.replace("/login");
            return;
        }

        async function loadFile() {
            try {
                setLoadingFile(true);
                const files = await getFiles();
                const match = files.find((item) => item._id === fileId) ?? null;
                setSelectedFile(match);

                if (!match) {
                    setStatus("PDF not found in your files.");
                }
            } catch (error) {
                setStatus(error instanceof Error ? error.message : "Failed to load file data");
            } finally {
                setLoadingFile(false);
            }
        }

        void loadFile();
    }, [fileId, isReady, router, token]);

    const pdfFile: PdfFile | null = useMemo(() => {
        if (!selectedFile || !token) {
            return null;
        }

        return {
            url: getFilePreviewUrl(selectedFile._id),
            httpHeaders: {
                Authorization: `Bearer ${token}`,
            },
        };
    }, [selectedFile, token]);

    const parseResult = useMemo(() => {
        if (totalPages <= 0) {
            return {
                valid: false,
                pages: [] as number[],
                normalized: "",
                error: "Load the PDF to see page count",
            };
        }

        return parsePageSelectionInput(pageInput, totalPages);
    }, [pageInput, totalPages]);

    const canExtract = Boolean(selectedFile && totalPages > 0 && parseResult.valid && !extracting);

    async function handleExtract() {
        if (!selectedFile) {
            setStatus("Select a PDF first.");
            return;
        }

        if (!parseResult.valid) {
            setStatus(parseResult.error || "Invalid page selection");
            return;
        }

        try {
            setExtracting(true);
            setStatus("Creating extracted PDF...");

            const result: ExtractPdfResponse = await extractPdfPages(selectedFile._id, parseResult.normalized);

            if (!result?.file?._id) {
                throw new Error("Extract completed but no file was returned");
            }

            router.push(`/editor/${result.file._id}`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Failed to extract pages");
        } finally {
            setExtracting(false);
        }
    }

    if (!isReady || !token) {
        return <div className="p-6 text-slate-800">Loading authentication...</div>;
    }

    if (loadingFile) {
        return <div className="p-6 text-slate-800">Loading PDF information...</div>;
    }

    if (!selectedFile) {
        return (
            <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-6 py-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">Extract Pages</h1>
                    <p className="mt-2 text-sm text-slate-600">The selected PDF could not be found.</p>
                    <Link
                        href="/dashboard"
                        className="mt-6 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Tool</p>
                            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Extract Pages</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                Create a new PDF from only the pages you want, without uploading the file again.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.05fr]">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Selected file</p>
                            <h2 className="mt-2 truncate text-lg font-semibold text-slate-900">{selectedFile.originalName}</h2>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Type</p>
                                    <p className="mt-1 font-medium text-slate-900">{selectedFile.fileType}</p>
                                </div>
                                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pages</p>
                                    <p className="mt-1 font-medium text-slate-900">{totalPages > 0 ? totalPages : "Loading..."}</p>
                                </div>
                            </div>

                            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {pdfFile ? (
                                    <Document
                                        file={pdfFile}
                                        onLoadSuccess={({ numPages }) => {
                                            setTotalPages(numPages);
                                            setPdfLoadError(null);
                                        }}
                                        onLoadError={(error) => {
                                            setPdfLoadError(error.message || "Failed to load PDF preview");
                                        }}
                                        loading={<div className="p-4 text-sm text-slate-600">Loading preview...</div>}
                                        className="flex justify-center"
                                    >
                                        <div className="max-h-130 overflow-auto p-4">
                                            <Page pageNumber={1} width={420} />
                                        </div>
                                    </Document>
                                ) : (
                                    <div className="p-4 text-sm text-slate-600">Preview unavailable.</div>
                                )}
                            </div>

                            {pdfLoadError ? <p className="mt-3 text-sm text-rose-600">{pdfLoadError}</p> : null}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-900">Page selection</h2>
                            <p className="mt-1 text-sm text-slate-500">Examples: 5, 1-5, 1,3,5, or 1-3,8,10-12</p>

                            <label className="mt-5 grid gap-2 text-sm font-medium text-slate-700">
                                Pages
                                <input
                                    type="text"
                                    value={pageInput}
                                    onChange={(event) => setPageInput(event.target.value)}
                                    placeholder="1-5,8,10-12"
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                                />
                            </label>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Live validation</p>
                                <p className={`mt-2 text-sm ${parseResult.valid ? "text-emerald-700" : "text-rose-600"}`}>
                                    {parseResult.valid
                                        ? `Valid selection: ${parseResult.normalized}`
                                        : parseResult.error || "Enter pages to begin"}
                                </p>
                                {parseResult.valid ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {parseResult.pages.map((page) => (
                                            <span
                                                key={page}
                                                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                            >
                                                {page}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}

                            <button
                                type="button"
                                onClick={() => void handleExtract()}
                                disabled={!canExtract}
                                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {extracting ? "Extracting..." : "Extract Pages"}
                            </button>

                            <p className="mt-3 text-xs text-slate-500">
                                The backend will validate the selected page range again before creating the new PDF.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
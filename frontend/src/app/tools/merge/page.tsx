"use client";

import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { mergePdfs, uploadPdf } from "@/services/fileService";

type SelectedPdf = {
    id: string;
    file: File;
    name: string;
    size: number;
};

export default function MergeToolPage() {
    const router = useRouter();
    const [files, setFiles] = useState<SelectedPdf[]>([]);
    const [merging, setMerging] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const canMerge = useMemo(() => files.length >= 2 && !merging, [files.length, merging]);

    function addFiles(event: ChangeEvent<HTMLInputElement>) {
        const pickedFiles = Array.from(event.target.files || []);

        if (pickedFiles.length === 0) {
            return;
        }

        const MAX_SIZE = 10 * 1024 * 1024;
        const nextFiles: SelectedPdf[] = [];

        for (const file of pickedFiles) {
            if (file.type !== "application/pdf") {
                alert("Only PDF files allowed");
                continue;
            }

            if (file.size > MAX_SIZE) {
                alert(`File too large: ${file.name}`);
                continue;
            }

            nextFiles.push({
                id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
                file,
                name: file.name,
                size: file.size,
            });
        }

        if (nextFiles.length > 0) {
            setFiles((current) => [...current, ...nextFiles]);
            setStatus(null);
        }

        event.target.value = "";
    }

    function handleDragStart(e: DragEvent<HTMLDivElement>, index: number) {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    function handleDrop(e: DragEvent<HTMLDivElement>, index: number) {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (Number.isNaN(from)) return;
        if (from === index) return;

        setFiles((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(index, 0, moved);
            return next;
        });
    }

    function moveFile(index: number, direction: -1 | 1) {
        setFiles((current) => {
            const nextIndex = index + direction;

            if (nextIndex < 0 || nextIndex >= current.length) {
                return current;
            }

            const next = [...current];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            return next;
        });
    }

    function removeFile(index: number) {
        setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    }

    async function handleMerge() {
        if (merging) return;

        if (files.length < 2) {
            setStatus("Select at least two PDFs.");
            return;
        }

        try {
            setMerging(true);
            setStatus("Uploading selected PDFs...");

            const uploadedIds: string[] = [];

            for (const item of files) {
                const uploaded = await uploadPdf(item.file);
                uploadedIds.push(uploaded._id || uploaded.fileId || "");
            }

            if (uploadedIds.some((id) => !id)) {
                throw new Error("Upload returned an invalid file id");
            }

            setStatus("Merging PDFs...");

            const merged = await mergePdfs(uploadedIds);

            if (!merged?.file?._id) {
                throw new Error("Merge completed but no merged file was returned");
            }

            router.push(`/tools/merge/preview/${merged.file._id}`);
        } catch (error) {
            console.error("Merge failed:", error);
            setStatus(error instanceof Error ? error.message : "Merge failed");
        } finally {
            setMerging(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Tool</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Merge PDFs</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            Select PDFs, reorder them, and merge them into a new file.
                        </p>
                    </div>
                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                        Back to dashboard
                    </a>
                </div>

                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        onChange={addFiles}
                        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500">Only PDF files up to 10MB each.</p>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">Selected files</h2>
                    <button
                        type="button"
                        onClick={() => void handleMerge()}
                        disabled={!canMerge}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {merging ? "Merging..." : "Merge PDFs"}
                    </button>
                </div>

                {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}

                <div className="mt-5 space-y-3">
                    {files.length === 0 ? (
                        <p className="text-sm text-slate-600">No PDFs selected yet.</p>
                    ) : (
                        files.map((item, index) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                                    <p className="text-xs text-slate-500">{Math.round(item.size / 1024)} KB</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => moveFile(index, -1)}
                                        disabled={index === 0 || merging}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Up
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveFile(index, 1)}
                                        disabled={index === files.length - 1 || merging}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Down
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        disabled={merging}
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
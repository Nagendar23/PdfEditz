"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFiles } from "@/services/api";
import { FileType } from "@/types/file";
import { useAuth } from "@/context/AuthContext";
import { deleteFile, uploadPdf } from "@/services/fileService";

export default function Dashboard() {
    const router = useRouter();
    const { token, isReady, user, logout } = useAuth();
    const [files, setFiles] = useState<FileType[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadFiles = useCallback(async (showLoading = false) => {
        if (showLoading) {
            setLoading(true);
        }

        try {
            const data = await getFiles();
            setFiles(data);
        } catch (error) {
            console.log("Error while fetching files :", error);
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (!token) {
            router.replace("/login");
            return;
        }

        void loadFiles(true);
    }, [isReady, token, router, loadFiles]);

    async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const MAX_SIZE = 10 * 1024 * 1024;

        if (file.type !== "application/pdf") {
            alert("Only PDF files allowed");
            e.target.value = "";
            return;
        }

        if (file.size > MAX_SIZE) {
            alert("File too large");
            e.target.value = "";
            return;
        }

        try {
            setUploading(true);
            console.log("Uploading:", file);

            const uploaded = await uploadPdf(file);

            console.log("Upload success:", uploaded);
            await loadFiles();
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    async function handleDelete(fileId: string) {
        const confirmed = window.confirm("Delete this file?");

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(fileId);
            await deleteFile(fileId);
            await loadFiles();
        } catch (error) {
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    }

    if (!isReady || !token) {
        return <div className="p-6">Loading authentication...</div>;
    }

    if (loading) {
        return <div className="p-6">Loading files...</div>;
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Your files</h1>
                    {user && <p className="text-sm text-slate-600">Signed in as {user.name}</p>}
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/tools/merge"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                        Merge PDFs
                    </Link>
                    <Link
                        href="/tools/watermark"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                        Watermark
                    </Link>
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <span>{uploading ? "Uploading..." : "Upload PDF"}</span>
                    </label>
                    <button
                        type="button"
                        onClick={logout}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {files.length === 0 ? (
                    <p className="text-sm text-slate-600">No files found</p>
                ) : (
                    <div className="space-y-3">
                        {files.map((file) => (
                            <div
                                key={file._id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                                <Link href={`/editor/${file._id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                                    {file.originalName}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(file._id)}
                                    disabled={deletingId === file._id}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {deletingId === file._id ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
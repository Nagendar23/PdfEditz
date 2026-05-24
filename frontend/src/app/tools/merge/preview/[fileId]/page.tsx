"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteFile, getFilePreviewUrl } from "@/services/fileService";
import { useAuth } from "@/context/AuthContext";

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer"), {
    ssr: false,
});

export default function MergePreviewPage() {
    const params = useParams();
    const router = useRouter();
    const { token, isReady } = useAuth();
    const [working, setWorking] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const fileIdParam = Array.isArray(params.fileId) ? params.fileId[0] : params.fileId;
    const fileId = typeof fileIdParam === "string" ? fileIdParam : "";

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (!token) {
            router.replace("/login");
        }
    }, [isReady, token, router]);

    async function handleApprove() {
        if (!fileId || working) return;

        setWorking(true);
        setStatus("Approved. Opening dashboard...");

        router.push("/dashboard");
    }

    async function handleDiscard() {
        if (!fileId || working) return;

        try {
            setWorking(true);
            setStatus("Discarding merged PDF...");
            await deleteFile(fileId);
            router.push("/tools/merge");
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Failed to discard merged PDF");
            setWorking(false);
        }
    }

    if (!fileId) {
        return <div className="p-6 text-slate-800">Invalid merged PDF reference.</div>;
    }

    if (!isReady || !token) {
        return <div className="p-6 text-slate-800">Loading authentication...</div>;
    }

    const fileObj = {
        url: getFilePreviewUrl(fileId),
        httpHeaders: {
            Authorization: `Bearer ${token}`,
        },
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Merge Preview</p>
                            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Review merged PDF</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                Check the merged document before saving it. Approve to keep it, or discard to remove it.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/tools/merge")}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                                disabled={working}
                            >
                                Back to merge
                            </button>
                        </div>
                    </div>

                    {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => void handleApprove()}
                            disabled={working}
                            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            Approve merged PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDiscard()}
                            disabled={working}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Discard merged PDF
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">Merged document preview</h2>
                        <p className="mt-1 text-sm text-slate-500">File ID: {fileId}</p>
                    </div>
                    <div className="bg-slate-100">
                        <PdfViewer fileUrl={fileObj} fileId={fileId} />
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFiles } from "@/services/api";
import { FileType } from "@/types/file";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
    const router = useRouter();
    const { token, isReady, user, logout } = useAuth();
    const [files, setFiles] = useState<FileType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (!token) {
            router.replace("/login");
            return;
        }

        const fetchFiles = async () => {
            try {
                const data = await getFiles();
                setFiles(data);
            } catch (error) {
                console.log("Error while fetching files :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [isReady, token, router]);

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
                <button
                    type="button"
                    onClick={logout}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                    Logout
                </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {files.length === 0 ? (
                    <p className="text-sm text-slate-600">No files found</p>
                ) : (
                    <div className="space-y-3">
                        {files.map((file) => (
                            <Link key={file._id} href={`/editor/${file._id}`}>
                                <div className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-400 hover:bg-slate-50">
                                    {file.originalName}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
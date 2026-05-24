import { getToken } from "@/services/authService";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function getBackendOrigin() {
    return BASE_URL.replace(/\/api\/?$/, "");
}

export function getFilePreviewUrl(fileId: string) {
    return `${BASE_URL}/files/${fileId}/preview`;
}

export function getDownloadUrl(fileId: string) {
    return `${BASE_URL}/files/${fileId}/preview`;
}

export function getUploadUrl(fileUrl: string) {
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        return fileUrl;
    }

    return `${getBackendOrigin()}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
}

export function normalizeUploadUrl(fileUrl: string) {
    if (fileUrl.includes("/api/uploads/")) {
        return fileUrl.replace(/\/api(?=\/uploads\/)/, "");
    }

    return getUploadUrl(fileUrl);
}

export interface UploadPdfResponse {
    _id: string;
    fileId?: string;
    fileUrl: string;
    originalName: string;
    fileType: string;
    size: number;
    message?: string;
}

export async function uploadPdf(file: File): Promise<UploadPdfResponse> {
    const token = getToken();

    if (!token) {
        throw new Error("Missing auth token");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/files/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || "Upload failed");
    }

    return data as UploadPdfResponse;
}

export async function deleteFile(fileId: string) {
    const token = getToken();

    if (!token) {
        throw new Error("Missing auth token");
    }

    const res = await fetch(`${BASE_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        throw new Error("Failed to delete file");
    }

    return res.json();
}

export interface MergePdfsResponse {
    message: string;
    file: {
        _id: string;
        originalName: string;
        storedName: string;
        fileType: string;
        size: number;
        operation: string;
    };
}

export async function mergePdfs(fileIds: string[]): Promise<MergePdfsResponse> {
    const token = getToken();

    if (!token) {
        throw new Error("Missing auth token");
    }

    const res = await fetch(`${BASE_URL}/files/merge`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileIds }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || "Failed to merge files");
    }

    return data as MergePdfsResponse;
}

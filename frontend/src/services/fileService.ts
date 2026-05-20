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

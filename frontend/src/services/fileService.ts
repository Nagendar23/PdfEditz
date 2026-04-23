export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function getFilePreviewUrl(fileId: string) {
    return `${BASE_URL}/files/${fileId}/preview`;
}

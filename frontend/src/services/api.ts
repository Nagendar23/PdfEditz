import { getToken } from "@/utils/auth";
// import { type } from 'os';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function getFiles(){
    try{
        const token = getToken();
        console.log("token is :",token)
        // If there's no auth token, return empty list instead of calling protected API
        if(!token){
            console.log("No auth token found — returning empty file list");
            return []
        }

        const response = await fetch(`${BASE_URL}/files`,{
            headers:{
                Authorization:`Bearer ${token}`,
            },
        });
        if(!response.ok){
            const text = await response.text().catch(()=>null)
            console.error("Failed to fetch files. Status:", response.status, "Body:", text)
            throw new Error(`Failed to fetch files, Error : ${response.status}`)
        }
        const data = await response.json();
        console.log("Raw API Response:", data);  // Debug log
        return data.userFiles || []
    }catch(err){
        console.log("API Error : ",err);
        throw err;
    }
}

export interface OverlayRequestPayload {
  elements: Array<
    | {
        type: "text";
        text: string;
        page: number;
        position: {
          x: number;
          y: number;
        };
        rotation: number;
        opacity: number;
        style: {
          fontSize: number;
          color: string;
          align?: "left" | "center" | "right";
          previewScale?: number;
        };
      }
    | {
        type: "image";
        imageFileId: string;
        page: number;
        position: {
          x: number;
          y: number;
        };
        size: {
          width: number;
          height: number;
        };
        previewScale?: number;
        rotation: number;
        opacity: number;
      }
  >;
}

export interface UploadedFile {
  _id: string;
  fileUrl: string;
  originalName: string;
  fileType: string;
  size: number;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
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

  return {
    _id: data._id || data.fileId,
    fileUrl: data.fileUrl,
    originalName: data.originalName,
    fileType: data.fileType,
    size: data.size,
  };
}

export interface ApplyOverlayResponse{
    message:string;
    file:{
        _id:string;
        originalName:string;
        storedName:string;
        fileType:string;
        size:number;
        operation:string;
    }
}

export async function applyOverlay(
    fileId:string,
    payload:OverlayRequestPayload
) : Promise<ApplyOverlayResponse>{
    const token = getToken();
    if(!token){
        console.log("Missing auth token")
        throw new Error("missing auth token");
    }
    const res = await fetch(`${BASE_URL}/files/${fileId}/add-overlay`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            Authorization: `Bearer ${token}`,
        },
        body:JSON.stringify(payload),
    });
    const data = await res.json().catch(()=>null)
    if(!res.ok){
        console.log("Overlay failed");
        throw new Error(data?.message || "Overlay Failed")
    }
    return data as ApplyOverlayResponse;
}
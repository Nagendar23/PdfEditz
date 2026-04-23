import { getToken } from "@/utils/auth";
// import { type } from 'os';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function getFiles(){
    try{
        const token = getToken();
        console.log("token is :",token)
        const response = await fetch(`${BASE_URL}/files`,{
            headers:{
                Authorization:`Bearer ${token}`,
            },
        });
        if(!response.ok){
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

export interface OverlayRequestPayload{
    elements:Array<{
        type:"text";
        text:string;
        page:number;
        position:{
            x:number;
            y:number;
        };
        rotation:number;
        opacity:number;
        style:{
            fontSize:number;
            color:string;
            align?:"left" | "center" | "right";
            previewScale?: number;
        }
    }>
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
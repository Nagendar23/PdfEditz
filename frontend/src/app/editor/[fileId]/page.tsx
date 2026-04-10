"use client"

import { useParams } from "next/navigation"
export default function EditorPage(){
    const params = useParams();

    const fileId = Array.isArray(params.fileId) 
    ? params.fileId[0] 
    : params.fileId;

if(!fileId){
    return <div>Invalid file</div>
}

    return(
        <div className="p-5">
            <h1>Editor Page</h1>
            <p>File ID : {fileId} </p>
        </div>
    )
}
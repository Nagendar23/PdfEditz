///fetch the files and simply display them

"use client"
import { useState, useEffect } from "react"
import { getFiles } from "@/services/api"
import { FileType } from "@/types/file"
import Link from "next/link"

export default function Dashboard(){
    const [files, setFiles] = useState<FileType[]>([])
    const [loading, setLoading]= useState(true);

    useEffect(()=>{
        const fetchFiles = async()=>{
            try{
                // const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDE1MTViNjVjZDllNjI0ZGQwODM2YiIsImVtYWlsIjoiYWRpdHlhQGdtYWlsLmNvbSIsIm5hbWUiOiJhZGl0eWEiLCJpYXQiOjE3NzU2NTgwOTYsImV4cCI6MTc3NjI2Mjg5Nn0.vh-bbRHqov-_ToB3NBwBqzYs_kqOoGhWxaTAFHW4cj4";
               
                const data = await getFiles();
                console.log("Files from API: ",data)
                setFiles(data);
            }catch(error){
                console.log("Error while fetching files :",error)
            }finally{
                setLoading(false);
            }
        };
        fetchFiles();
    },[])

    if(loading){
        return <div>Loading</div>
    }

    return(
        <div>
            <h1 className="text-center">Your files</h1>
            { 
                files.length ===0? (
                    <p>No files found</p>
                ):(
                    files.map((file)=>(
                        <Link key={file._id} href={`editor/${file._id}`}>
                            <div className="border border-gray-300  p-2.5 mb-2.5 cursor-pointer"
                            >{file.originalName}</div>
                        </Link>
                    ))
                )
            }
        </div>
    )
}
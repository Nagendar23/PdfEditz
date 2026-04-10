import { getToken } from "@/utils/auth";

const BASE_URL = "http://localhost:8000/api";

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
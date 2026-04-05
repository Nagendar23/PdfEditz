import fs from 'fs';
import path from 'path'
import File from '../models/fileModel.js'

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const uploadsDir = path.join(dirname(fileURLToPath(import.meta.url)), "..", "uploads")

const cleanUpExpiredFiles = async()=>{
    try{
        console.log("Running cleanup job");
        const now = new Date();
        //finding the expired files
        const expiredFiles = await File.find({
            expiresAt:{$lte : now}
        })
        console.log(`Found ${expiredFiles.length} expired files`);

        for (const file of expiredFiles){
            const filePath = path.join(uploadsDir, file.storedName);
            
            //delete from file system
            try{
                if(fs.existsSync(filePath)){
                    fs.unlinkSync(filePath);
                    console.log(`Deleted file from fs : ${file.storedName}`);

                }else{
                    console.log(`File is missing on disk: ${file.storedName}`);

                }
            }catch(err){
                console.log(`Error while deleting file ${file.storedName}`,err)
                continue   //not to break loop
            }
            //delete from db
            await File.findByIdAndDelete(file._id)
        }
        console.log("cleanup job finished")
    }catch(err){
        console.log("Cleanup failed : ",err)
    }
};

export default cleanUpExpiredFiles;

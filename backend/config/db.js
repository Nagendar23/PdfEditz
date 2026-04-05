import mongoose from "mongoose";
const connectDB = async()=>{
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        if(!conn){
            console.log("Failed to connect to Database")
        }
        console.log("MongoDB connected successfully")
    }catch(err){
        console.log('Some error while connecting to DB',err);
        process.exit(1)
    }
}

export default connectDB
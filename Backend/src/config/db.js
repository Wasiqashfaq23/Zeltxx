import mongoose from "mongoose";

const connectToMongo= async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("mongoose connected")
    }
    catch(error){
        console.log("Mongo Not Connected" , error);
    }
}

export {connectToMongo};
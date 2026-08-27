import mongoose from "mongoose";

const connectToMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'zeltxx'
        })
        console.log("mongoose connected to database: zeltxx")
    }
    catch (error) {
        console.log("Mongo Not Connected", error);
    }
}

export { connectToMongo };
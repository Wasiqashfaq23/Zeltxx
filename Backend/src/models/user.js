import mongoose from "mongoose";

const { schema } = mongoose;

const userSchema = new Schema({

    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    googleId: {
        type: String,
        unique: true,
        required: true,
    },
    avatar: {
        type: String,
    },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
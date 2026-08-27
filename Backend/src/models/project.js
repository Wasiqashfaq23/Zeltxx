import mongoose from "mongoose";

const { Schema } = mongoose;

const projectSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    githubUrl: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    members: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'collaborator'], default: 'collaborator' }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

export default mongoose.model('Project', projectSchema)

import mongoose, { Schema } from "mongoose";

const { schema } = mongoose;

const projectSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaboratorss: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'collaborator'], default: 'collaborator' }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamp: true })

export default mongoose.model('Project', projectSchema)

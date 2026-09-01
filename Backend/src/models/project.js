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
    webhookSecret: {
        type: String,
        default: '',
        select: false
    },
    webhookEvents: {
        type: [String],
        default: ['push', 'pr', 'issues', 'review']
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

projectSchema.index({ 'members.user': 1 })

export default mongoose.model('Project', projectSchema)

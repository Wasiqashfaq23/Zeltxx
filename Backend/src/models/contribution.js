import mongoose from 'mongoose'
import { WEIGHTS } from '../config/constants.js'

const { Schema } = mongoose

const contributionSchema = new Schema({
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: ['commit', 'comment', 'task_complete', 'file_upload', 'review', 'pr_opened', 'pr_merged', 'issues_opened', 'issues_closed'], required: true
    },
    weight: {
        type: Number,
        default: 1
    },
    meta: {
        type: Object
    },
    reactions: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, required: true }
    }]
}, { timestamps: true })


contributionSchema.pre('save', function (_next) {
    this.weight = WEIGHTS[this.type]
})

contributionSchema.index({ project: 1, createdAt: -1 })

export { WEIGHTS }

export default mongoose.model('Contribution', contributionSchema)
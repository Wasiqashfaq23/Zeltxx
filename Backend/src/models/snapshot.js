import mongoose from 'mongoose'

const { Schema } = mongoose

const snapshotSchema = new Schema({
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    totalCount: {
        type: Number,
        default: 0
    },
    totalWeight: {
        type: Number,
        default: 0
    },
    breakdown: {
        type: Map, of: Number
    }
}, { timestamps: true })

snapshotSchema.index({ project: 1, user: 1, date: 1 }, { unique: true })

export default mongoose.model('Snapshot', snapshotSchema)
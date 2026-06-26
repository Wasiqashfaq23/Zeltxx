import mongoose from 'mongoose'

const { Schema } = mongoose


const WEIGHTS = {
    commit: 4,
    review: 3,
    task_complete: 2,
    file_upload: 2,
    comment: 1
}


const contributionSchema = new Schema({
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
    type: {
        type: String,
        enum: ['commit', 'comment', 'task_complete', 'file_upload', 'review'], required: true
    },
    weight: {
        type: Number,
        default: 1
    },
    meta: {
        type: Object
    }
}, { timestamps: true })


contributionSchema.pre('save', function (next) {
    this.weight = WEIGHTS[this.type]
})

export { WEIGHTS }

export default mongoose.model('Contribution', contributionSchema)
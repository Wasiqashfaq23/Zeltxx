import mongoose from 'mongoose'

const { Schema } = mongoose

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['repo', 'docs', 'design', 'other'],
      default: 'other'
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
)

resourceSchema.index({ project: 1, createdAt: -1 })

export default mongoose.model('Resource', resourceSchema)

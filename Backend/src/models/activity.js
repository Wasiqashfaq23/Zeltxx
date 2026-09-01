import mongoose from 'mongoose'

const { Schema } = mongoose

const activitySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
)

activitySchema.index({ project: 1, createdAt: -1 })

export default mongoose.model('Activity', activitySchema)
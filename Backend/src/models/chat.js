import mongoose from 'mongoose'

const { Schema } = mongoose

const chatSchema = new Schema(
  {
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
    message: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
)

chatSchema.index({ project: 1, createdAt: -1 })

export default mongoose.model('Chat', chatSchema)

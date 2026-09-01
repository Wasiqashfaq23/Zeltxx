import mongoose from 'mongoose'

const { Schema } = mongoose

const sprintSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    goal: {
      type: String,
      default: ''
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
)

sprintSchema.index({ project: 1, startDate: -1 })

export default mongoose.model('Sprint', sprintSchema)
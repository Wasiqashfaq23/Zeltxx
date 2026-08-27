import mongoose from 'mongoose'

const { Schema } = mongoose

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dueDate: {
      type: Date
    },
    subtasks: [
      {
        title: { type: String, required: true },
        completed: { type: Boolean, default: false }
      }
    ],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
)

export default mongoose.model('Task', taskSchema)

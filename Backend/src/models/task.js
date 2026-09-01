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
    lastDueReminderDateKey: {
      type: String,
      default: null
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null
    },
    blockedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task'
      }
    ],
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    recurringParent: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    timeEntries: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        durationMinutes: { type: Number, required: true },
        note: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    doneAt: {
      type: Date,
      default: null
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
        reactions: [
          {
            user: { type: Schema.Types.ObjectId, ref: 'User' },
            emoji: { type: String, required: true }
          }
        ],
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

taskSchema.index({ project: 1, status: 1 })
taskSchema.index({ sprint: 1 })

// Track when a task is completed so sprint burndown charts are accurate.
taskSchema.pre('save', function markDoneAt(next) {
  if (this.status === 'done' && !this.doneAt) this.doneAt = new Date()
  if (this.status !== 'done') this.doneAt = null
  next()
})

export default mongoose.model('Task', taskSchema)

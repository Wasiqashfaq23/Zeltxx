import mongoose from 'mongoose'

const { Schema } = mongoose

const notificationSchema = new Schema({
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['project_invite', 'due_date', 'mention'], required: true },
  message:     { type: String, required: true },
  project:     { type: Schema.Types.ObjectId, ref: 'Project' },
  inviterName: { type: String, default: '' },
  role:        { type: String, enum: ['admin', 'collaborator'], default: 'collaborator' },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  read:        { type: Boolean, default: false }
}, { timestamps: true })

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)

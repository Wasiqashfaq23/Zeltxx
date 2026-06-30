import mongoose from 'mongoose'

const { Schema } = mongoose

const notificationSchema = new Schema({
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['project_invite'], required: true },
  message:   { type: String, required: true },
  project:   { type: Schema.Types.ObjectId, ref: 'Project' },
  read:      { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Notification', notificationSchema)

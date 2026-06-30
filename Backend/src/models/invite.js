import mongoose from 'mongoose'

const { Schema } = mongoose

const inviteSchema = new Schema({
  project:    { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  role:       { type: String, enum: ['admin', 'collaborator'], default: 'collaborator' },
  invitedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'accepted'], default: 'pending' }
}, { timestamps: true })

inviteSchema.index({ project: 1, email: 1 }, { unique: true })

export default mongoose.model('Invite', inviteSchema)

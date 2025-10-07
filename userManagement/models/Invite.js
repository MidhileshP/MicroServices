import mongoose from 'mongoose';
import crypto from 'crypto';

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['site_admin', 'operator', 'client_admin', 'client_user'],
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  organizationName: {
    type: String,
    default: null
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  acceptedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

inviteSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

inviteSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

inviteSchema.methods.isValid = function() {
  return this.status === 'pending' && !this.isExpired();
};

export default mongoose.model('Invite', inviteSchema);

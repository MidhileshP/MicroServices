import mongoose from 'mongoose';
import crypto from 'crypto';
import { ROLES, INVITE_STATUS } from '../config/constants.js';

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: [ROLES.SITE_ADMIN, ROLES.OPERATOR, ROLES.CLIENT_ADMIN, ROLES.CLIENT_USER],
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(INVITE_STATUS),
    default: INVITE_STATUS.PENDING,
    index: true
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

// Compound indexes for common queries
inviteSchema.index({ email: 1, status: 1 });
inviteSchema.index({ invitedBy: 1, status: 1 });

inviteSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

inviteSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

inviteSchema.methods.isValid = function() {
  return this.status === INVITE_STATUS.PENDING && !this.isExpired();
};

export default mongoose.model('Invite', inviteSchema);

import mongoose from 'mongoose';
import crypto from 'crypto';

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  replacedBy: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for token validation queries
refreshTokenSchema.index({ token: 1, isRevoked: 1 });
refreshTokenSchema.index({ user: 1, isRevoked: 1 });

refreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(64).toString('hex');
};

refreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt;
};

refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && !this.isExpired();
};

export default mongoose.model('RefreshToken', refreshTokenSchema);

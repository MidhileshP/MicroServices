import mongoose from 'mongoose';
import { TWO_FACTOR_METHODS } from '../config/constants.js';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: function() { return process.env.NODE_ENV !== 'test'; },
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  twoFactorMethod: {
    type: String,
    enum: Object.values(TWO_FACTOR_METHODS),
    default: TWO_FACTOR_METHODS.OTP
  },
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return process.env.NODE_ENV !== 'test'; },
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for active organizations lookup
organizationSchema.index({ isActive: 1 });

export default mongoose.model('Organization', organizationSchema);

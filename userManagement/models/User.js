import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, ROLES, TWO_FACTOR_METHODS } from '../config/constants.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true
  },
  twoFactorMethod: {
    type: String,
    enum: Object.values(TWO_FACTOR_METHODS),
    default: null
  },
  totpSecret: {
    type: String,
    default: null
  },
  totpEnabled: {
    type: Boolean,
    default: false
  },
  otpHash: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
userSchema.index({ organization: 1, isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS.PASSWORD);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.totpSecret;
  delete obj.otpHash;
  return obj;
};

export default mongoose.model('User', userSchema);

import RefreshToken from '../../models/RefreshToken.js';
import * as db from '../repository.js';

export class RefreshTokenRepository {
  async findByToken(token, options = {}) {
    return await db.findOne(RefreshToken, { token }, options);
  }

  async findById(id, options = {}) {
    return await db.findById(RefreshToken, id, options);
  }

  async findByUser(userId, options = {}) {
    return await db.find(RefreshToken, { user: userId }, options);
  }

  async findActiveByUser(userId) {
    return await db.find(RefreshToken, {
      user: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
  }

  async create(tokenData) {
    return await db.create(RefreshToken, tokenData);
  }

  async updateOne(query, updates) {
    return await db.updateOne(RefreshToken, query, updates);
  }

  async revokeToken(token, replacedBy = null) {
    const updates = { isRevoked: true };
    if (replacedBy) updates.replacedBy = replacedBy;
    return await db.updateOne(RefreshToken, { token }, updates);
  }

  async revokeAllByUser(userId) {
    return await db.updateMany(RefreshToken, { user: userId, isRevoked: false }, { isRevoked: true });
  }

  async deleteById(id) {
    return await db.deleteById(RefreshToken, id);
  }

  async deleteByToken(token) {
    return await db.deleteOne(RefreshToken, { token });
  }

  async deleteAllByUser(userId) {
    return await db.deleteMany(RefreshToken, { user: userId });
  }

  async deleteExpired() {
    return await db.deleteMany(RefreshToken, { expiresAt: { $lt: new Date() } });
  }

  async deleteRevokedOlderThan(date) {
    return await db.deleteMany(RefreshToken, { isRevoked: true, createdAt: { $lt: date } });
  }

  async countByUser(userId) {
    return await db.count(RefreshToken, { user: userId });
  }

  async countActiveByUser(userId) {
    return await db.count(RefreshToken, {
      user: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
  }

  async save(tokenDoc) {
    return await db.save(tokenDoc);
  }

  async findByIpAddress(ipAddress) {
    return await db.find(RefreshToken, { ipAddress });
  }

  async findByUserAgent(userAgent) {
    return await db.find(RefreshToken, { userAgent });
  }
}

export default new RefreshTokenRepository();

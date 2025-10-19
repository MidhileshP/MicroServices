import User from '../../models/User.js';
import * as db from '../repository.js';

export class UserRepository {
  async findByEmail(email, options = {}) {
    return await db.findOne(User, { email: email.toLowerCase() }, options);
  }

  async findById(id, options = {}) {
    return await db.findById(User, id, options);
  }

  async findByOrganization(organizationId, filters = {}) {
    const query = { organization: organizationId, ...filters };
    return await db.find(User, query, { select: '-password -totpSecret -otpHash', lean: true });
  }

  async findActiveByOrganization(organizationId) {
    return await this.findByOrganization(organizationId, { isActive: true });
  }

  async create(userData) {
    return await db.create(User, userData);
  }

  async updateById(id, updates) {
    return await db.updateById(User, id, updates);
  }

  async updateOne(query, updates) {
    return await db.updateOne(User, query, updates);
  }

  async softDeleteById(id) {
    return await db.updateById(User, id, { isActive: false });
  }

  async deleteById(id) {
    return await db.deleteById(User, id);
  }

  async existsByEmail(email) {
    return await db.exists(User, { email: email.toLowerCase() });
  }

  async countByOrganization(organizationId) {
    return await db.count(User, { organization: organizationId, isActive: true });
  }

  async findByRole(role, options = {}) {
    return await db.find(User, { role, isActive: true }, options);
  }

  async updateOTP(userId, otpHash, otpExpiry) {
    return await db.updateById(User, userId, { otpHash, otpExpiry });
  }

  async clearOTP(userId) {
    return await db.updateById(User, userId, { otpHash: null, otpExpiry: null });
  }

  async updateTOTP(userId, totpData) {
    return await db.updateById(User, userId, totpData);
  }

  async enableTOTP(userId) {
    return await db.updateById(User, userId, { totpEnabled: true });
  }

  async updateTwoFactorMethod(userId, twoFactorMethod) {
    return await db.updateById(User, userId, { twoFactorMethod });
  }

  async save(userDoc) {
    return await db.save(userDoc);
  }

  async populate(userDoc, paths) {
    return await db.populate(userDoc, paths);
  }
}

export default new UserRepository();

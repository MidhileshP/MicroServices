import Invite from '../../models/Invite.js';
import * as db from '../repository.js';

export class InviteRepository {
  async findById(id, options = {}) {
    return await db.findById(Invite, id, options);
  }

  async findByToken(token, options = {}) {
    return await db.findOne(Invite, { token }, options);
  }

  async findByEmailAndStatus(email, status) {
    return await db.findOne(Invite, { email: email.toLowerCase(), status });
  }

  async findByInviter(inviterId, filters = {}, options = {}) {
    const query = { invitedBy: inviterId, ...filters };
    const defaultOptions = { sort: { createdAt: -1 }, ...options };
    return await db.find(Invite, query, defaultOptions);
  }

  async create(inviteData) {
    return await db.create(Invite, inviteData);
  }

  async updateById(id, updates) {
    return await db.updateById(Invite, id, updates);
  }

  async updateOne(query, updates) {
    return await db.updateOne(Invite, query, updates);
  }

  async updateStatus(id, status) {
    return await db.updateById(Invite, id, { status });
  }

  async markAsAccepted(id, userId) {
    return await db.updateById(Invite, id, {
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedUserId: userId
    });
  }

  async markAsExpired(id) {
    return await db.updateById(Invite, id, { status: 'expired' });
  }

  async markAsRevoked(id) {
    return await db.updateById(Invite, id, { status: 'revoked' });
  }

  async refreshInvite(id, newToken, expiresAt) {
    return await db.updateById(Invite, id, { token: newToken, expiresAt, status: 'pending' });
  }

  async deleteById(id) {
    return await db.deleteById(Invite, id);
  }

  async countPendingByInviter(inviterId) {
    return await db.count(Invite, { invitedBy: inviterId, status: 'pending' });
  }

  async findExpired() {
    return await db.find(Invite, { status: 'pending', expiresAt: { $lt: new Date() } });
  }

  async save(inviteDoc) {
    return await db.save(inviteDoc);
  }

  async findByIdAndInviter(inviteId, inviterId) {
    return await db.findOne(Invite, { _id: inviteId, invitedBy: inviterId });
  }
}

export default new InviteRepository();

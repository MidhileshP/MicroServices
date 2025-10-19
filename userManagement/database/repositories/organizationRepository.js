import Organization from '../../models/Organization.js';
import * as db from '../repository.js';

export class OrganizationRepository {
  async findById(id, options = {}) {
    return await db.findById(Organization, id, options);
  }

  async findBySlug(slug) {
    return await db.findOne(Organization, { slug: slug.toLowerCase() });
  }

  async create(organizationData) {
    return await db.create(Organization, organizationData);
  }

  async updateById(id, updates) {
    return await db.updateById(Organization, id, updates);
  }

  async softDeleteById(id) {
    return await db.updateById(Organization, id, { isActive: false });
  }

  async deleteById(id) {
    return await db.deleteById(Organization, id);
  }

  async existsBySlug(slug) {
    return await db.exists(Organization, { slug: slug.toLowerCase() });
  }

  async findAllActive(options = {}) {
    return await db.find(Organization, { isActive: true }, options);
  }

  async findByAdminUser(adminUserId) {
    return await db.find(Organization, { adminUser: adminUserId });
  }

  async updateTwoFactorMethod(id, twoFactorMethod) {
    return await db.updateById(Organization, id, { twoFactorMethod });
  }

  async countActive() {
    return await db.count(Organization, { isActive: true });
  }

  async save(orgDoc) {
    return await db.save(orgDoc);
  }

  async updateSettings(id, settings) {
    return await db.updateById(Organization, id, { settings });
  }
}

export default new OrganizationRepository();

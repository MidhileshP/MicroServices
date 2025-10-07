const ROLE_HIERARCHY = {
  super_admin: ['site_admin', 'operator', 'client_admin'],
  site_admin: ['operator', 'client_admin'],
  operator: ['client_admin'],
  client_admin: ['client_user'],
  client_user: []
};

const ROLE_LEVELS = {
  super_admin: 5,
  site_admin: 4,
  operator: 3,
  client_admin: 2,
  client_user: 1
};

export const canInviteRole = (inviterRole, targetRole) => {
  const allowedRoles = ROLE_HIERARCHY[inviterRole] || [];
  return allowedRoles.includes(targetRole);
};

export const getRoleLevel = (role) => {
  return ROLE_LEVELS[role] || 0;
};

export const isHigherRole = (role1, role2) => {
  return getRoleLevel(role1) > getRoleLevel(role2);
};

export const getAllowedRolesForUser = (userRole) => {
  return ROLE_HIERARCHY[userRole] || [];
};

export const needsOrganization = (role) => {
  return ['client_admin', 'client_user'].includes(role);
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SITE_ADMIN: 'site_admin',
  OPERATOR: 'operator',
  CLIENT_ADMIN: 'client_admin',
  CLIENT_USER: 'client_user'
};

export const TWO_FACTOR_METHODS = {
  OTP: 'otp',
  TOTP: 'totp'
};

export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  OTP: 10 * 60 * 1000 // 10 minutes in ms
};

export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50
  }
};

export const BCRYPT_SALT_ROUNDS = {
  PASSWORD: 12,
  OTP: 10
};

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  OTP_LENGTH: 6,
  TOTP_LENGTH: 6
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

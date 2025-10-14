## Code Walkthrough (Line-by-Line Style)

This document explains the key files in the repository with a line-by-line (or block-by-block) commentary of what each part does. It focuses on production-relevant logic and omits boilerplate where possible.

Note: Exact line numbers can shift; use this as an orientation guide per file/section.

---

## userManagement/server.js

- import express, helmet, cors, rateLimit, dotenv: set up an Express app with security and env vars.
- import `connectDatabase`: connects to MongoDB.
- import socket and RabbitMQ utils: optional realtime and messaging.
- import auth/invite/organization routes: mounts feature areas.
- `dotenv.config()`: loads env.
- `const app = express(); const PORT = ...`: initialize app and port.
- `app.use(helmet())`: secure HTTP headers.
- `app.use(cors({...}))`: allow cross-origin requests based on `CORS_ORIGIN`.
- `app.use(express.json({ limit: '10mb' }))`: JSON parsing.
- Define `limiter` for generic rate limiting and mount on `/api/`.
- Define `authLimiter` to protect `/api/auth/login` specifically.
- `GET /health`: returns a health JSON.
- Mount `/api/auth`, `/api/invites`, `/api/organization`.
- 404 handler: returns `{ success:false, message:'Route not found' }`.
- Error handler: centralized fallback.
- `startServer()`: connects DB, initializes socket client, optionally connects RabbitMQ, and starts listening.
- SIGTERM/SIGINT: graceful shutdown (disconnects RabbitMQ).

---

## userManagement/middleware/validation.js

- import `body`, `validationResult` from `express-validator`.
- `validate(req,res,next)`: returns 400 with collected validation errors or calls `next()`.
- `loginValidation`: ensures `email` and `password` exist and are well-formed.
- `acceptInviteValidation`: validates token, firstName, lastName, strong password, and optional `twoFactorMethod` in ['otp','totp'].
- `createInviteValidation`: validates `email`, `role`, and accepts optional `organizationName` (non-empty when provided). Controller enforces when required for client_admin.
- `sixDigitCodeValidation(field,label)`: reusable 6-digit numeric validation for OTP/TOTP.
- `verifyOTPValidation`: uses `sixDigitCodeValidation('otp','OTP')`.

---

## userManagement/utils/response.js

- `ok(res, payload, meta)`: 200 success wrapper with unified shape.
- `created(res, payload, meta)`: 201 success wrapper.
- `badRequest/unauthorized/forbidden/notFound/serverError`: standardized error helpers returning `{ success:false, message }`.

---

## userManagement/utils/jwt.js (overview)

- Signs access tokens with `JWT_SECRET` and typical user claims.
- Verifies tokens to authenticate incoming requests.

---

## userManagement/utils/otp.js (overview)

- `generateOTP()`: random 6-digit string.
- `hashOTP(otp)`: bcrypt hashes OTP for secure comparison.
- `verifyOTP(plain, hash)`: compares OTPs.
- `getOTPExpiry(minutes)`: computes future expiry timestamp.

---

## userManagement/utils/totp.js (overview)

- `generateTOTPSecret(email)`: creates a TOTP secret and `otpauth://` URL for authenticator apps.
- `generateQRCode(otpauthUrl)`: returns a data-URL PNG QR image for the app to scan.
- `verifyTOTPToken(token, secret)`: verifies a 6-digit authenticator code.

---

## userManagement/models/* (high-level)

- `User.js`: schema fields (email, password, role, organization, 2FA fields), password hashing, `comparePassword`, `toSafeObject()` to omit sensitive fields, TOTP fields `totpSecret`, `totpEnabled`.
- `Organization.js`: name, slug, `twoFactorMethod` default, `adminUser` link.
- `Invite.js`: `token`, `email`, `role`, `status`, `expiresAt`, `isValid()` helper.
- `RefreshToken.js`: rotating refresh tokens, expiry, revocation chain.

---

## userManagement/middleware/auth.js (overview)

- `authenticate`: verifies JWT access token, attaches `req.user`.
- `authorize(...roles)`: ensures current user has a role in the allowed list.

---

## userManagement/controllers/authController.js

Imports:
- `User`, `RefreshToken`, `generateAccessToken`, OTP/TOTP utils, `sendOTPEmail`, and response helpers.
- `respondWithTokens(res,user,req)`: local helper to centralize token issuance responses.

Handlers:
- `login(req,res)`:
  - Validate email/password.
  - Load user with organization, check isActive and password.
  - Determine `twoFactorMethod` (org default or user-level).
  - If none: `respondWithTokens` (access/refresh tokens, `user`).
  - If `otp`: generate OTP, hash+store on user with expiry, send via email, return `{ requiresTwoFactor:true, twoFactorMethod:'otp', userId }`.
  - If `totp`: ensure `user.totpEnabled`; then return `{ requiresTwoFactor:true, twoFactorMethod:'totp', userId }`.
  - Errors via `unauthorized`, `badRequest`, `serverError`.

- `verifyOTPHandler(req,res)`:
  - Body: `{ userId, otp }`.
  - Load user, check OTP hash/expiry, validate OTP; clear OTP on success.
  - `respondWithTokens` returns tokens and user.

- `verifyTOTPHandler(req,res)`:
  - Body: `{ userId, token }`.
  - Load user, ensure TOTP enabled and secret present.
  - Verify 6-digit token; return tokens via `respondWithTokens`.

- `setupTOTP(req,res)`:
  - Auth required: use `req.user._id`.
  - Generate secret + QR, store `user.totpSecret`, return `{ secret, qrCode, message }` via `ok`.

- `confirmTOTP(req,res)`:
  - Body: `{ userId, token }` (invite setup flow).
  - Verify token against `user.totpSecret`, then set `totpEnabled=true` and `twoFactorMethod='totp'`.
  - Return success via `ok`.

- `refreshTokenHandler(req,res)`:
  - Body contains `refreshToken`.
  - Validates stored token, rotates refresh token, returns new pair via `ok`.

- `logout(req,res)`:
  - Best-effort revoke by `refreshToken` if provided; return `ok`.

- `getProfile(req,res)`:
  - Uses `req.user._id`; returns `user.toSafeObject()` via `ok`.

---

## userManagement/controllers/inviteController.js

Imports:
- `User`, `Invite`, `Organization`, `RefreshToken`.
- `canInviteRole`, `needsOrganization`, `sendInviteEmail`, `publishEvent`, `generateAccessToken`, `emitInviteAccepted`, `generateTOTPSecret`, `generateQRCode`, response helpers.

Handlers:
- `createInvite(req,res)`:
  - Validates inviter’s role capacity.
  - Rejects if user already exists or pending invite exists (refreshes if expired).
  - Creates `Invite` with 7-day expiry; emails invite and publishes a RabbitMQ event.
  - Returns 201 with invite summary.

- `acceptInvite(req,res)`:
  - Validates token and expiry.
  - Creates either: (a) an organization and admin user (client_admin path), or (b) a normal user.
  - Applies 2FA preference: request override > org default.
  - If TOTP selected: pre-generate secret + QR, store `user.totpSecret`, update invite to `accepted`, emit socket event, and return `{ requiresTwoFactor:true, userId, totp }` with 201 (no tokens yet).
  - If OTP/none: issue tokens (access/refresh) and return 201 with user.

- `getInviteDetails(req,res)`:
  - Returns invite summary by token (inviter info and expiration).

- `listInvites(req,res)`:
  - Lists invites created by current user, sorted by newest.

- `revokeInvite(req,res)`:
  - Only for pending invites by current user; sets status to `revoked` and returns success.

---

## userManagement/controllers/organizationController.js

- `getOrganization(req,res)`: Ensures user belongs to an org, loads org with admin user, returns summary via `ok`.
- `updateOrganization(req,res)`: `client_admin` and org admin only; updates name and/or `twoFactorMethod`, returns summary via `ok`.
- `getOrganizationMembers(req,res)`: Lists active org members via `ok`.

---

## userManagement/routes/*.js

- `routes/auth.js`: Maps to `authController` (login, verify-otp, verify-totp, refresh, logout, profile, totp/setup, totp/confirm). Uses `sixDigitCodeValidation('token','TOTP token')` for TOTP endpoints and `verifyOTPValidation` for OTP.
- `routes/invite.js`: Protected endpoints to create/list/revoke invites; public `accept` and `details` for invitees.
- `routes/organization.js`: Protected endpoints for org summary, update, and members.

---

## userManagement/utils/rabbitmq.js

- Maintains a single confirm-channel connection to RabbitMQ.
- `connectRabbit()`: builds URL (env or host/port), connects, creates confirm channel.
- `getRabbitChannel()`: returns current channel or throws if not initialized.
- `publishEvent(exchange, routingKey, message)`: asserts topic exchange and publishes a persistent JSON payload.
- `disconnectRabbit()`: closes channel/connection gracefully.

---

## notifications/server.js (overview)

- Similar Express setup (helmet, cors, JSON middleware).
- Connects to RabbitMQ via `config/rabbitmq.js`.
- Mounts `routes/email.js` for sending emails.
- Optionally configures Socket.io and Redis adapter for horizontal scaling (based on your environment).

### notifications/config/rabbitmq.js
- Same lifecycle: `connectRabbit`, `getRabbitChannel`, `disconnectRabbit`.
- Uses `RABBITMQ_URL` (or defaults) to connect.

### notifications/controllers/emailController.js
- Accepts a send-email request and uses `utils/mailer.js` to send.

---

## API Response Shape

- Success: `ok` (200) or `created` (201)
  ```json
  { "success": true, ...payload }
  ```
- Error: helpers like `badRequest`/`unauthorized`/`forbidden`/`notFound`/`serverError`
  ```json
  { "success": false, "message": "..." }
  ```

---

## Key Flows Summary

Login without 2FA → immediate tokens.

Login with OTP → backend emails OTP; client posts `/verify-otp` with `{ userId, otp }` → tokens returned.

Login with TOTP → client posts `/verify-totp` with `{ userId, token }` → tokens returned.

Accept Invite with TOTP → backend returns QR + secret and `requiresTwoFactor:true` (no tokens). Client confirms via `/auth/totp/confirm`, then can log in with TOTP.

---

## Production Notes

- Keep secrets in env; never commit.
- Use HTTPS and secure cookies on the frontend.
- Scale RabbitMQ with durable exchanges/queues and dead-lettering as needed.
- Monitor with logs/metrics around auth failures and invite flows.



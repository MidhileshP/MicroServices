## Microservice Monorepo: User Management + Notifications

This repository contains two Node.js services:

- `userManagement/`: Authentication, invitations, organizations, 2FA (OTP/TOTP)
- `notifications/`: Email delivery and realtime notifications via RabbitMQ/Socket.io

Both services are decoupled and communicate via RabbitMQ topics. This README explains the codebase end-to-end, what each part does, and how to run it in production-like mode.

### Contents
- Architecture overview
- Setup and environment
- Running locally
- User Management service
  - Configuration
  - Middleware
  - Models
  - Controllers and routes
  - Utilities
  - Auth and 2FA flows (OTP, TOTP)
- Notifications service
- API responses and error handling
- Operational notes

---

## Architecture Overview

- Services: Two independent express apps deployed separately.
  - `userManagement` exposes REST APIs used by frontend and emits domain events via RabbitMQ.
  - `notifications` consumes events (e.g., invite created) and sends emails or pushes realtime messages.
- Messaging: RabbitMQ with topic exchange. Producer/consumer wiring is in each service’s own `utils/config`.
- Storage:
  - MongoDB (Mongoose) for users, organizations, invites, refresh tokens.
  - Redis (in notifications) for Socket.io adapter if needed.
- Security:
  - JWT access tokens + rotating refresh tokens stored in DB.
  - Optional two-factor auth via Email OTP or TOTP (authenticator apps).
  - Helmet, CORS, and basic rate-limiting.

---

## Setup and Environment

Required services: MongoDB, optionally RabbitMQ, optionally Redis (if Socket.io redis adapter is used).

Common environment variables (configure per service):

```bash
# Mongo (userManagement)
MONGODB_URI=mongodb://localhost:27017/yourdb

# JWT (userManagement)
JWT_SECRET=supersecret

# CORS
CORS_ORIGIN=http://localhost:5173

# RabbitMQ (both services)
RABBITMQ_URL=amqp://localhost:5672
# or host/port/user/pass in userManagement if not using URL
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=
RABBITMQ_PASS=

# Notifications (email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=secret
SMTP_FROM="Acme <no-reply@acme.com>"
```

Install dependencies:

```bash
cd userManagement && npm install
cd ../notifications && npm install
```

Run locally (each service in its own terminal):

```bash
cd userManagement && npm run dev
cd notifications && npm run dev
```

---

## User Management Service

Entry: `userManagement/server.js`

- Loads env and connects to MongoDB (`config/database.js`).
- Sets security middleware (helmet, cors) and rate limits.
- Mounts routes:
  - `/api/auth` → `routes/auth.js`
  - `/api/invites` → `routes/invite.js`
  - `/api/organization` → `routes/organization.js`
- Initializes Socket.io client and RabbitMQ (if configured).

### Configuration
- `config/database.js`: connects Mongoose.
- `config/constants.js`: central place for service-level constants.

### Middleware
- `middleware/auth.js`:
  - `authenticate`: parses JWT access token, attaches `req.user`.
  - `authorize(...roles)`: role-based guard.
- `middleware/validation.js`:
  - `validate`: standard express-validator result handler.
  - `loginValidation`, `acceptInviteValidation`, `createInviteValidation`.
  - `sixDigitCodeValidation(field,label)`: shared validator for 6-digit codes.
  - `verifyOTPValidation`: uses `sixDigitCodeValidation('otp','OTP')`.

### Models
- `models/User.js`: user fields, password hashing, `toSafeObject()` to hide sensitive data, TOTP fields (`totpSecret`, `totpEnabled`).
- `models/Organization.js`: org details and default 2FA method.
- `models/Invite.js`: invite token, role, organization, expiry, helpers like `isValid()`.
- `models/RefreshToken.js`: rotating refresh tokens with `isValid()` and linkage to user.

### Controllers and Routes

Auth: `controllers/authController.js` + `routes/auth.js`
- `login`:
  - Verifies credentials.
  - If no 2FA: issues tokens via `respondWithTokens`.
  - If OTP: generates/hash OTP, emails it, returns `{ requiresTwoFactor:true, userId }`.
  - If TOTP: if enabled, returns `{ requiresTwoFactor:true, userId }`.
- `verify-otp` (body: `{ userId, otp }`): validates and issues tokens.
- `verify-totp` (body: `{ userId, token }`): validates authenticator code and issues tokens.
- `totp/setup` (auth required): creates a secret + QR for already logged-in users.
- `totp/confirm` (body: `{ userId, token }`): enables TOTP during setup (invite flow) and returns success.
- `refresh`, `logout`, `profile`.

Invites: `controllers/inviteController.js` + `routes/invite.js`
- `create` (auth + role-guard): creates invite; for `client_admin` may require `organizationName`.
- `accept`:
  - Creates the user (and organization for `client_admin` path) from invite.
  - Applies 2FA preference (request override > org default).
  - If TOTP selected, returns QR and does NOT issue tokens, forcing TOTP confirm first.
  - If OTP or none, issues tokens.
- `details/:token`, `list`, `revoke`.

Organization: `controllers/organizationController.js` + `routes/organization.js`
- `GET /api/organization`: fetch org summary for current user.
- `PUT /api/organization`: `client_admin` only; update name/twoFactorMethod.
- `GET /api/organization/members`: list active members.

### Utilities
- `utils/jwt.js`: JWT sign/verify.
- `utils/otp.js`: Email OTP generation, hashing, verifying.
- `utils/totp.js`: TOTP secret generation and verification, QR code creation.
- `utils/response.js`: normalized `ok/created/badRequest/...` helpers used across controllers.
- `utils/rabbitmq.js`: connect/publish/disconnect for RabbitMQ.
- `utils/notificationClient.js`: email send wrapper used for OTP and invites.
- `utils/roleHierarchy.js`: enforces who can invite whom.
- `utils/socketClient.js`: Socket.io client init for realtime.

---

## Auth and 2FA Flows

Login (no 2FA):
1) POST `/api/auth/login` → returns `accessToken`, `refreshToken`, `user`.

Login (OTP):
1) POST `/api/auth/login` → returns `{ requiresTwoFactor:true, twoFactorMethod:'otp', userId }` and emails code.
2) POST `/api/auth/verify-otp` with `{ userId, otp }` → returns tokens and user.

Login (TOTP):
1) POST `/api/auth/login` → returns `{ requiresTwoFactor:true, twoFactorMethod:'totp', userId }`.
2) POST `/api/auth/verify-totp` with `{ userId, token }` → returns tokens and user.

Accept invite with TOTP:
1) POST `/api/invites/accept` with `twoFactorMethod:'totp'` → returns `{ totp:{qrCode,secret}, userId, requiresTwoFactor:true }` (no tokens).
2) User scans QR and provides 6-digit code.
3) POST `/api/auth/totp/confirm` with `{ userId, token }` → enables TOTP.
4) User logs in, and can verify via TOTP.

---

## Notifications Service

Entry: `notifications/server.js`

- Express app with basic security middleware.
- RabbitMQ connection: `config/rabbitmq.js`.
- Email sending: `controllers/emailController.js` via `utils/mailer.js`.
- Optional Socket.io setup for realtime notifications (and Redis adapter if configured).

Routes
- `routes/email.js`: simple email send endpoint (can be extended for templated emails).

---

## API Responses and Error Handling

All success responses include `success: true` and a consistent body shape. Errors include `success: false` and a message.

- Success helpers: `ok(res, payload)`, `created(res, payload)`.
- Error helpers: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`.

Validation uses `express-validator` with a single shared `sixDigitCodeValidation` for OTP/TOTP.

---

## Operational Notes

- Rate-limiting: global limiter on `/api/` and stricter limiter on `/api/auth/login`.
- Token rotation: refresh tokens are stored in DB with revocation chain on refresh.
- Secrets: never commit `.env`. Use different secrets/URLs per environment.
- Messaging: service boundaries keep each RabbitMQ client in its own service; do not DRY across services.

---

## Quick Reference

User Management scripts:
```bash
npm run dev      # nodemon
npm start        # node server.js
```

Notifications scripts:
```bash
npm run dev
npm start
```

Health check:
```
GET /health  -> { success: true, message: "User Management Service is running", timestamp }
```

You now have a clean, production-style baseline with consistent responses, minimal duplication, and clear 2FA flows.



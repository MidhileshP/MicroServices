## User Management Service

Authentication, invitations, organizations, and two‑factor authentication (OTP/TOTP).

### Features
- Email + password authentication
- Optional 2FA: Email OTP or TOTP (authenticator apps)
- Invitation workflow with roles and optional organization bootstrap
- JWT access tokens + rotating refresh tokens
- Role‑based authorization (RBAC)
- Standardized responses and validations
- RabbitMQ event publishing for cross‑service communication

### Tech
- Node.js, Express, Mongoose (MongoDB)
- express‑validator, helmet, cors, express‑rate‑limit
- JWT, bcrypt
- speakeasy + qrcode for TOTP
- amqplib for RabbitMQ

---

## Run Locally

Environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017/yourdb
JWT_SECRET=supersecret
CORS_ORIGIN=http://localhost:5173
RABBITMQ_URL=amqp://localhost:5672
# Or optionally:
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=
RABBITMQ_PASS=
```

Install and start:
```bash
npm install
npm run dev   # nodemon
# or
npm start
```

Health check:
```
GET /health -> { success: true, message, timestamp }
```

---

## Architecture

Entry: `server.js`
- Connects to MongoDB
- Sets middleware (helmet, cors, json, rate‑limits)
- Mounts routes: `/api/auth`, `/api/invites`, `/api/organization`
- Initializes Socket.io client and RabbitMQ (if URL is set)

Configuration
- `config/database.js`: Mongoose connection
- `config/constants.js`: service constants

Middleware
- `middleware/auth.js`: `authenticate`, `authorize(...roles)`
- `middleware/validation.js`: `validate`, request validators, `sixDigitCodeValidation`

Models
- `models/User.js`: password hashing, `toSafeObject()`, TOTP fields
- `models/Organization.js`: org preferences (default 2FA)
- `models/Invite.js`: invite lifecycle and expiry
- `models/RefreshToken.js`: rotating refresh tokens

Utilities
- `utils/jwt.js`: sign/verify tokens
- `utils/otp.js`: generate/hash/verify 6‑digit email OTP
- `utils/totp.js`: TOTP secret/QR generation and token verification
- `utils/response.js`: `ok/created/badRequest/unauthorized/forbidden/notFound/serverError`
- `utils/rabbitmq.js`: connect/publish/disconnect
- `utils/notificationClient.js`: email send wrapper (OTP/invites)
- `utils/roleHierarchy.js`: role invite rules
- `utils/socketClient.js`: Socket.io client

---

## Routes

Base: `/api/auth`

- POST `/login`
  - Body: `{ email, password }`
  - Responses:
    - No 2FA: `{ success, accessToken, refreshToken, user }`
    - OTP: `{ success, requiresTwoFactor:true, twoFactorMethod:'otp', userId }`
    - TOTP: `{ success, requiresTwoFactor:true, twoFactorMethod:'totp', userId }`

- POST `/verify-otp`
  - Body: `{ userId, otp }`
  - Returns tokens and `user` on success

- POST `/verify-totp`
  - Body: `{ userId, token }`
  - Returns tokens and `user` on success

- POST `/totp/setup` (auth)
  - Returns `{ secret, qrCode, message }`

- POST `/totp/confirm`
  - Body: `{ userId, token }`
  - Enables TOTP for that user

- POST `/refresh`
  - Body: `{ refreshToken }`
  - Returns new access/refresh tokens (rotates stored token)

- POST `/logout`
  - Body: `{ refreshToken? }` (best effort revoke)

- GET `/profile` (auth)
  - Returns `user`

Base: `/api/invites`

- POST `/create` (auth + role‑guard)
  - Body: `{ email, role, organizationName? }`
  - Returns invite summary

- POST `/accept`
  - Body: `{ token, firstName, lastName, password, twoFactorMethod? }`
  - If `twoFactorMethod:'totp'`: returns `{ requiresTwoFactor:true, userId, totp:{qrCode,secret} }` (no tokens)
  - Else: returns tokens and `user`

- GET `/details/:token`
  - Public invite summary for UX

- GET `/list` (auth + role‑guard)
  - Invites created by current user

- DELETE `/:inviteId/revoke` (auth + role‑guard)
  - Only pending invites

Base: `/api/organization`

- GET `/` (auth)
  - Org summary for current user

- PUT `/` (auth, `client_admin`)
  - Update `{ name?, twoFactorMethod? }`

- GET `/members` (auth)
  - Active members list

---

## Auth & 2FA Flows

Login without 2FA
1) `/auth/login` → tokens

Login with OTP
1) `/auth/login` → `{ requiresTwoFactor:true, userId }`
2) `/auth/verify-otp` with `{ userId, otp }` → tokens

Login with TOTP
1) `/auth/login` → `{ requiresTwoFactor:true, userId }`
2) `/auth/verify-totp` with `{ userId, token }` → tokens

Accept Invite with TOTP
1) `/invites/accept` with `twoFactorMethod:'totp'` → `{ totp:{qrCode,secret}, userId, requiresTwoFactor:true }`
2) `/auth/totp/confirm` with `{ userId, token }` → enable TOTP
3) User then logs in normally and verifies via TOTP

---

## Response Shape

- Success: `ok` (200) / `created` (201)
  ```json
  { "success": true, ...payload }
  ```
- Errors: `badRequest` / `unauthorized` / `forbidden` / `notFound` / `serverError`
  ```json
  { "success": false, "message": "..." }
  ```

---

## Production Notes
- Keep secrets in env; rotate JWT secret responsibly
- Use HTTPS and secure frontend storage practices
- Apply stricter rate limits and monitoring on auth endpoints
- Prefer durable RabbitMQ exchanges with DLQs for critical events



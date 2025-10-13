# Complete Technical Documentation & Deep Dive

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack Explained](#technology-stack-explained)
3. [Code Structure & Patterns](#code-structure--patterns)
4. [Database Design](#database-design)
5. [Authentication Flow](#authentication-flow)
6. [Message Queue System](#message-queue-system)
7. [Real-time Notifications](#real-time-notifications)
8. [Security Implementation](#security-implementation)
9. [Alternative Libraries](#alternative-libraries)
10. [Common Interview Questions](#common-interview-questions)
11. [API Usage Examples](#api-usage-examples)

---

## Architecture Overview

### Microservices Pattern
This system follows a **microservices architecture** with two independent services:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                   (React/Vue/Angular)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──────────────────┬──────────────────────┐
                     │                  │                      │
         ┌───────────▼──────────┐  ┌────▼──────────┐  ┌──────▼──────┐
         │  User Management     │  │ Notifications  │  │   MongoDB   │
         │     Service          │  │    Service     │  │   Database  │
         │   (Port 3000)        │  │  (Port 4000)   │  │             │
         └──────────┬───────────┘  └────────┬───────┘  └─────────────┘
                    │                       │
                    └───────┬───────────────┘
                            │
                ┌───────────▼──────────┐
                │      RabbitMQ        │
                │  (Message Broker)    │
                └──────────────────────┘
```

**Why Microservices?**
- **Separation of Concerns**: Each service has a single responsibility
- **Scalability**: Scale services independently based on load
- **Fault Isolation**: If one service fails, others continue working
- **Technology Flexibility**: Each service can use different tech stacks
- **Team Independence**: Different teams can work on different services

---

## Technology Stack Explained

### 1. Node.js & Express.js

**What it is:** Runtime environment and web framework

**Why we use it:**
- **Non-blocking I/O**: Handles thousands of concurrent connections efficiently
- **JavaScript Everywhere**: Same language for frontend and backend
- **Large Ecosystem**: npm has 2+ million packages
- **Fast Development**: Quick to prototype and deploy

**How it works in our code:**
```javascript
// Express creates an HTTP server and handles routing
const app = express();
app.use(express.json()); // Parses JSON request bodies
app.use('/api/auth', authRoutes); // Routes to auth handlers
app.listen(3000); // Listens on port 3000
```

**Alternative Options:**
- **Fastify**: Faster than Express, better TypeScript support
- **Koa**: By Express creators, modern async/await support
- **NestJS**: Enterprise framework, similar to Angular
- **Hapi**: Configuration-driven, great for large teams

---

### 2. MongoDB & Mongoose

**What it is:** NoSQL database and ODM (Object Document Mapper)

**Why we use it:**
- **Flexible Schema**: Easy to modify data structure
- **JSON-like Documents**: Natural fit with JavaScript
- **Horizontal Scaling**: Sharding support for massive data
- **Rich Queries**: Complex queries without SQL

**How it works in our code:**
```javascript
// Schema defines the structure
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'user'] }
});

// Model is a class for database operations
const User = mongoose.model('User', userSchema);

// Query the database
const user = await User.findOne({ email: 'user@example.com' });
```

**Why Mongoose over plain MongoDB driver:**
- **Schema Validation**: Ensures data consistency
- **Middleware**: Run code before/after database operations
- **Relationships**: Easy population of references
- **Type Casting**: Automatic data type conversion

**Alternative Options:**
- **PostgreSQL + Prisma**: SQL database with modern ORM
- **PostgreSQL + TypeORM**: SQL with decorators
- **MySQL + Sequelize**: Traditional SQL ORM
- **Supabase**: PostgreSQL with built-in auth and real-time (Firebase alternative)

---

### 3. JSON Web Tokens (JWT)

**What it is:** Stateless authentication mechanism

**Why we use it:**
- **Stateless**: No session storage needed on server
- **Scalable**: Works across multiple servers
- **Self-contained**: Token contains all user info
- **Cross-domain**: Works across different domains

**Structure of JWT:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.signature
│──────── HEADER ──────────│─────── PAYLOAD ─────│─ SIGNATURE ─│
```

**How it works:**
```javascript
// Creating a token
const token = jwt.sign(
  { userId: user._id, role: user.role }, // Payload
  'secret-key', // Secret
  { expiresIn: '15m' } // Options
);

// Verifying a token
const decoded = jwt.verify(token, 'secret-key');
// decoded = { userId: '123', role: 'admin', iat: 1234, exp: 5678 }
```

**Access Token vs Refresh Token:**
- **Access Token**: Short-lived (15 min), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

**Why Two Tokens?**
- If access token is stolen, it expires quickly
- Refresh token is stored securely and can be revoked

**Alternative Options:**
- **Session Cookies**: Traditional server-side sessions
- **OAuth 2.0**: Industry standard for third-party auth
- **Passport.js**: Authentication middleware with many strategies
- **Auth0**: Managed authentication service

---

### 4. bcrypt.js

**What it is:** Password hashing library

**Why we use it:**
- **Slow by Design**: Makes brute-force attacks impractical
- **Salt Built-in**: Automatic random salt generation
- **Adaptive**: Can increase difficulty over time

**How it works:**
```javascript
// Hashing (during registration)
const salt = await bcrypt.genSalt(12); // Generate salt
const hash = await bcrypt.hash('password123', salt);
// Stored in DB: $2a$12$abcd...xyz (contains salt + hash)

// Comparing (during login)
const isValid = await bcrypt.compare('password123', hash);
// Returns true if password matches
```

**Why salt rounds = 12?**
- Each increase doubles the time to hash
- 12 rounds ≈ 250ms (good balance of security and speed)
- More rounds = more secure but slower login

**Alternative Options:**
- **Argon2**: Winner of password hashing competition, more secure
- **scrypt**: Memory-hard function, prevents GPU attacks
- **PBKDF2**: Older standard, widely supported

---

### 5. RabbitMQ (AMQP)

**What it is:** Message broker for asynchronous communication

**Why we use it:**
- **Decoupling**: Services don't need to know about each other
- **Reliability**: Messages are persisted and guaranteed delivery
- **Load Balancing**: Distribute work across multiple consumers
- **Retry Logic**: Automatic retry on failures

**Key Concepts:**

**Exchange:** Routes messages to queues
```javascript
await channel.assertExchange('events', 'topic', { durable: true });
```

**Queue:** Stores messages until consumed
```javascript
await channel.assertQueue('notifications.email', { durable: true });
```

**Binding:** Connects exchange to queue with routing key
```javascript
await channel.bindQueue('notifications.email', 'events', 'user.invite.created');
```

**How it works in our code:**

**Publisher (User Management Service):**
```javascript
// Publish an event
await publishEvent(
  'events', // Exchange
  'user.invite.created', // Routing key
  { to: 'user@example.com', subject: 'Invite', html: '...' } // Message
);
```

**Consumer (Notifications Service):**
```javascript
// Listen for messages
channel.consume('notifications.email', async (msg) => {
  const payload = JSON.parse(msg.content.toString());
  await sendEmail(payload);
  channel.ack(msg); // Acknowledge message processed
});
```

**Why Routing Keys?**
- `user.invite.created` → Send email
- `user.invite.accepted` → Send notification
- `user.*` → All user events
- `*.invite.*` → All invite events

**Alternative Options:**
- **Apache Kafka**: Better for event streaming, higher throughput
- **Redis Pub/Sub**: Simpler, in-memory, no persistence
- **AWS SQS/SNS**: Managed queue service
- **NATS**: Lightweight, cloud-native messaging

---

### 6. Socket.IO

**What it is:** Real-time bidirectional communication library

**Why we use it:**
- **Real-time**: Push notifications instantly
- **Automatic Reconnection**: Handles network issues
- **Room Support**: Send messages to specific users
- **Fallback**: Uses polling if WebSocket unavailable

**How WebSockets work:**
```
Client                          Server
  │────── HTTP Upgrade ────────→│
  │←──── Switching Protocols ───│
  │                              │
  │←─────── WebSocket ──────────→│  Full-duplex
  │        (bidirectional)       │  communication
```

**How it works in our code:**

**Server:**
```javascript
io.on('connection', (socket) => {
  // User joins their personal room
  socket.on('register', ({ userId }) => {
    socket.join(`user:${userId}`);
  });

  // Send notification to specific user
  io.to(`user:${userId}`).emit('notification', {
    type: 'inviteAccepted',
    message: 'Someone accepted your invite'
  });
});
```

**Client:**
```javascript
const socket = io('http://localhost:4000');

// Register to receive notifications
socket.emit('register', { userId: '123' });

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data.message);
});
```

**Alternative Options:**
- **Native WebSocket API**: Lower level, more control
- **ws library**: Minimal WebSocket server
- **Server-Sent Events (SSE)**: One-way server-to-client only
- **Firebase Realtime Database**: Managed real-time sync

---

### 7. Redis

**What it is:** In-memory data store (cache and pub/sub)

**Why we use it:**
- **Speed**: All data in RAM, microsecond latency
- **Socket.IO Adapter**: Scale WebSockets across servers
- **Session Storage**: Fast session lookups
- **Caching**: Reduce database load

**How Redis Adapter works:**

Without Redis (single server):
```
Client A ──→ Server 1 (has socket connections for A, B, C)
Client B ──→ Server 1
Client C ──→ Server 1
```

With Redis (multiple servers):
```
Client A ──→ Server 1 ──┐
Client B ──→ Server 2 ──┼──→ Redis Pub/Sub
Client C ──→ Server 3 ──┘
```

When Server 1 sends to Client B, Redis forwards to Server 2.

**Alternative Options:**
- **Memcached**: Simpler, only caching (no pub/sub)
- **KeyDB**: Redis fork, multi-threaded
- **Dragonfly**: Modern Redis alternative, faster

---

### 8. Nodemailer

**What it is:** Email sending library

**Why we use it:**
- **SMTP Support**: Works with any email provider
- **HTML Emails**: Rich email formatting
- **Attachments**: Send files with emails
- **Fallback**: Auto-generates test account if no SMTP configured

**How it works:**
```javascript
// Create transporter (connection to SMTP server)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'app-password'
  }
});

// Send email
await transporter.sendMail({
  from: '"App Name" <noreply@app.com>',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our app!</h1>'
});
```

**Alternative Options:**
- **SendGrid SDK**: Managed email service, better deliverability
- **AWS SES**: Amazon's email service, cheap at scale
- **Mailgun**: Developer-friendly email API
- **Postmark**: Focus on transactional emails

---

### 9. Speakeasy & QRCode

**What it is:** TOTP (Time-based One-Time Password) implementation

**Why we use it:**
- **Standard Protocol**: Works with Google Authenticator, Authy, etc.
- **Time-based**: 6-digit code changes every 30 seconds
- **No Internet**: Works offline on phone

**How TOTP works:**

1. **Setup**: Generate secret key
```javascript
const secret = speakeasy.generateSecret({
  name: 'MyApp (user@example.com)',
  length: 32
});
// secret.base32 = 'JBSWY3DPEHPK3PXP...'
```

2. **Generate QR Code**: User scans with phone
```javascript
const qrCode = await QRCode.toDataURL(secret.otpauth_url);
// Returns: data:image/png;base64,iVBORw0KGgo...
```

3. **Verify Token**: User enters 6-digit code
```javascript
const isValid = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: '123456', // User's code
  window: 2 // Allow 2 time steps (60 seconds)
});
```

**Math Behind TOTP:**
```
Token = HMAC-SHA1(Secret, TimeCounter) % 1,000,000
TimeCounter = floor(CurrentTime / 30)
```

**Alternative Options:**
- **OTPAuth**: Modern TOTP/HOTP library
- **Two-factor**: Simple 2FA library
- **Authy SDK**: Managed 2FA service

---

## Code Structure & Patterns

### 1. MVC Pattern (Modified)

We use a modified MVC pattern:

```
Routes → Controllers → Models → Database
  │
  ├─→ Middleware (auth, validation)
  └─→ Utils (helpers, services)
```

**Routes (API Endpoints):**
```javascript
// Define URL paths and HTTP methods
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
```

**Middleware (Request Processing):**
```javascript
// Runs before controller
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  const decoded = verifyToken(token);
  req.user = await User.findById(decoded.userId);
  next(); // Continue to controller
};
```

**Controllers (Business Logic):**
```javascript
// Handle requests, call models, return responses
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid' });
  const isValid = await user.comparePassword(password);
  if (!isValid) return res.status(401).json({ error: 'Invalid' });
  const token = generateToken(user);
  res.json({ token, user });
};
```

**Models (Data Layer):**
```javascript
// Define schema and database methods
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String
});

// Middleware: Hash password before saving
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Method: Compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

---

### 2. Async/Await Pattern

**Why we use async/await:**
```javascript
// Old way (callback hell)
User.findOne({ email }, (err, user) => {
  if (err) return handleError(err);
  user.comparePassword(password, (err, isValid) => {
    if (err) return handleError(err);
    if (!isValid) return res.status(401).json({ error: 'Invalid' });
    generateToken(user, (err, token) => {
      if (err) return handleError(err);
      res.json({ token });
    });
  });
});

// New way (clean and readable)
try {
  const user = await User.findOne({ email });
  const isValid = await user.comparePassword(password);
  if (!isValid) return res.status(401).json({ error: 'Invalid' });
  const token = await generateToken(user);
  res.json({ token });
} catch (error) {
  handleError(error);
}
```

---

### 3. Error Handling Pattern

**Consistent error responses:**
```javascript
// Success
res.json({
  success: true,
  data: { user, token }
});

// Error
res.status(400).json({
  success: false,
  message: 'Invalid credentials'
});
```

**Try-catch blocks:**
```javascript
export const createUser = async (req, res) => {
  try {
    // Business logic
    const user = await User.create(req.body);
    res.status(201).json({ success: true, user });
  } catch (error) {
    // Log error for debugging
    console.error('Create user error:', error);

    // Return user-friendly message
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

---

## Database Design

### Schema Relationships

```
User ──────┬───────→ Organization (many-to-one)
│          │
│          └───────→ User (invitedBy - self-reference)
│
├─────────→ Invite (many-to-one - created by)
│
└─────────→ RefreshToken (one-to-many)

Organization ───────→ User (adminUser - one-to-one)

Invite ─────┬───────→ User (invitedBy - many-to-one)
            │
            ├───────→ Organization (many-to-one)
            │
            └───────→ User (acceptedUserId - many-to-one)
```

### Indexing Strategy

**Why indexes matter:**
- Without index: Scan 1,000,000 documents (slow)
- With index: Find in 3-4 lookups (fast)

**Indexes in our models:**
```javascript
// Unique indexes (automatically created)
email: { type: String, unique: true } // Fast lookup + prevents duplicates

// Compound index example (for queries like: find invites by email and status)
inviteSchema.index({ email: 1, status: 1 });

// Text index (for search)
userSchema.index({ firstName: 'text', lastName: 'text' });
```

---

## Authentication Flow

### Complete Login Flow (with 2FA)

```
1. User submits email + password
   │
   ├─→ Find user in database
   │   └─→ If not found: Return 401
   │
   ├─→ Compare password hash
   │   └─→ If invalid: Return 401
   │
   ├─→ Check 2FA setting
   │
   ├─→ If no 2FA:
   │   └─→ Generate access + refresh tokens
   │       └─→ Return tokens + user data
   │
   ├─→ If OTP 2FA:
   │   ├─→ Generate 6-digit OTP
   │   ├─→ Hash OTP and store in user document
   │   ├─→ Send OTP email via RabbitMQ
   │   └─→ Return { requiresTwoFactor: true, userId }
   │
   └─→ If TOTP 2FA:
       └─→ Return { requiresTwoFactor: true, userId }

2a. User submits OTP code
   │
   ├─→ Find user by userId
   ├─→ Check OTP not expired
   ├─→ Compare OTP hash
   ├─→ Clear OTP from user
   └─→ Generate tokens + return

2b. User submits TOTP token
   │
   ├─→ Find user by userId
   ├─→ Verify token using secret key
   │   (Time-based algorithm checks if valid)
   └─→ Generate tokens + return
```

### Token Refresh Flow

```
1. Access token expires (after 15 minutes)
   │
   └─→ Frontend receives 401 Unauthorized

2. Frontend sends refresh token
   │
   ├─→ Find refresh token in database
   ├─→ Check not expired (7 days)
   ├─→ Check not revoked
   │
   ├─→ Mark old refresh token as revoked
   ├─→ Create new refresh token
   ├─→ Generate new access token
   │
   └─→ Return { accessToken, refreshToken }

3. Frontend uses new access token
```

**Why revoke old refresh token?**
- **Security**: Limits exposure if token is stolen
- **Rotation**: Ensures tokens are regularly updated
- **Tracking**: Can track token reuse (potential attack)

---

## Message Queue System

### RabbitMQ Patterns Used

**1. Publisher/Subscriber Pattern:**
```
Publisher (User Service)
    │
    ├─→ Exchange: "events" (type: topic)
    │       │
    │       ├─→ Queue: "notifications.email"
    │       │     └─→ Consumer: Email Service
    │       │
    │       └─→ Queue: "notifications.sms"
    │             └─→ Consumer: SMS Service
```

**2. Routing Keys:**
```
user.invite.created ──→ Send email
user.invite.accepted ──→ Send notification
user.password.reset ──→ Send reset email
```

**3. Message Format:**
```javascript
{
  to: 'user@example.com',
  subject: 'You have been invited',
  html: '<h1>Invitation</h1>',
  text: 'Invitation'
}
```

### Reliability Features

**1. Durable Queues:**
```javascript
await channel.assertQueue('notifications.email', { durable: true });
// Messages survive RabbitMQ restart
```

**2. Persistent Messages:**
```javascript
channel.publish(exchange, routingKey, payload, { persistent: true });
// Messages written to disk
```

**3. Acknowledgments:**
```javascript
channel.consume(queue, async (msg) => {
  try {
    await processMessage(msg);
    channel.ack(msg); // Success: Remove from queue
  } catch (error) {
    channel.nack(msg, false, false); // Failure: Discard bad message
  }
});
```

---

## Security Implementation

### 1. Password Security

**Best Practices:**
```javascript
// Strong hashing
const salt = await bcrypt.genSalt(12); // 2^12 iterations
const hash = await bcrypt.hash(password, salt);

// Validation rules
password.isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
```

### 2. JWT Security

**Token Structure:**
```javascript
// Access Token (short-lived)
{
  userId: '123',
  role: 'admin',
  iat: 1234567890, // Issued at
  exp: 1234568790  // Expires in 15 min
}

// Refresh Token (long-lived, stored in DB)
{
  token: 'random-64-bytes-hex',
  user: '123',
  expiresAt: Date + 7 days,
  isRevoked: false
}
```

### 3. Rate Limiting

**Prevents brute-force attacks:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
});

app.use('/api/', limiter);

// Stricter for login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 failed login attempts
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
```

### 4. Input Validation

**Using express-validator:**
```javascript
body('email')
  .isEmail() // Valid email format
  .normalizeEmail() // Convert to lowercase, trim
  .withMessage('Valid email required');

body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters');
```

### 5. Role-Based Access Control (RBAC)

**Hierarchy:**
```javascript
const ROLE_LEVELS = {
  super_admin: 5,    // Can invite: site_admin, operator, client_admin
  site_admin: 4,     // Can invite: operator, client_admin
  operator: 3,       // Can invite: client_admin
  client_admin: 2,   // Can invite: client_user
  client_user: 1     // Cannot invite anyone
};

export const canInviteRole = (inviterRole, targetRole) => {
  const allowedRoles = ROLE_HIERARCHY[inviterRole] || [];
  return allowedRoles.includes(targetRole);
};
```

---

## Alternative Libraries

### Complete Alternatives Table

| Current Library | Alternative 1 | Alternative 2 | Alternative 3 | When to Use Alternative |
|----------------|--------------|--------------|--------------|------------------------|
| **Express** | Fastify | Koa | NestJS | Fastify: Need speed; NestJS: Enterprise apps |
| **Mongoose** | Prisma | TypeORM | Sequelize | Prisma: Better TypeScript; Sequelize: SQL databases |
| **MongoDB** | PostgreSQL | MySQL | Supabase | PostgreSQL: Need ACID compliance; Supabase: Firebase alternative |
| **JWT (jsonwebtoken)** | jose | passport-jwt | OAuth 2.0 | jose: Modern JWT; OAuth: Third-party auth |
| **bcrypt** | argon2 | scrypt | crypto.pbkdf2 | argon2: More secure; pbkdf2: Built-in Node.js |
| **RabbitMQ** | Kafka | Redis Pub/Sub | AWS SQS | Kafka: Event streaming; Redis: Simple pub/sub |
| **Socket.IO** | ws | Server-Sent Events | WebRTC | ws: Lower level; SSE: One-way only |
| **Redis** | Memcached | KeyDB | Dragonfly | Memcached: Simple cache; KeyDB: Multi-threaded |
| **Nodemailer** | SendGrid | AWS SES | Mailgun | SendGrid/SES: Better deliverability |
| **Speakeasy** | otpauth | authenticator | node-2fa | otpauth: Modern library |
| **QRCode** | qr-image | qrcode-svg | node-qrcode | qr-image: PNG/SVG support |

---

## Common Interview Questions

### Q1: Explain the authentication flow in detail

**Answer:**
"Our system uses JWT-based authentication with optional 2FA. Here's the flow:

1. User submits credentials → We validate against bcrypt hash
2. If 2FA enabled → Generate OTP/TOTP and wait for verification
3. Once verified → Generate two tokens:
   - Access token (15 min, contains user ID and role)
   - Refresh token (7 days, stored in database)
4. Client stores tokens → Uses access token for API requests
5. When access expires → Client uses refresh token to get new access token

We use two tokens for security: access token is short-lived, so if stolen, attacker has limited time. Refresh token is revoked after use (token rotation) to detect reuse attacks."

### Q2: How does the invite system work?

**Answer:**
"The invite system follows this flow:

1. Admin creates invite → System generates unique token and stores in database
2. Email sent via RabbitMQ → Async to avoid blocking the API
3. Recipient clicks link → Frontend opens with token in URL
4. User fills form → Submits with token, name, password
5. Backend validates token → Creates user account
6. If client_admin role → Also creates organization
7. Socket.IO notifies inviter → Real-time update

Key features:
- Tokens expire after 7 days
- Role hierarchy prevents privilege escalation
- Invites can be revoked before acceptance
- We track who invited whom for audit trails"

### Q3: Why use RabbitMQ instead of direct HTTP calls?

**Answer:**
"RabbitMQ provides several advantages:

1. **Decoupling**: Services don't need to know about each other's location
2. **Reliability**: If notification service is down, messages queue up and process later
3. **Load balancing**: Multiple consumers can process messages in parallel
4. **Retry logic**: Failed messages automatically retry
5. **Scalability**: Can add more consumers without changing publisher

For example, when user creates invite:
- Without RabbitMQ: API waits for email to send (slow)
- With RabbitMQ: API returns immediately, email sends asynchronously (fast)

This makes our system more resilient and responsive."

### Q4: Explain how TOTP works

**Answer:**
"TOTP (Time-based One-Time Password) works like this:

1. **Setup Phase**:
   - Generate random secret key (256 bits)
   - Create QR code containing: secret + app name + user email
   - User scans with authenticator app

2. **Token Generation**:
   - Algorithm: HMAC-SHA1(secret, time_counter)
   - time_counter = floor(current_time / 30 seconds)
   - Result: 6-digit number that changes every 30 seconds

3. **Verification**:
   - User enters 6-digit code
   - Server generates code using same algorithm
   - Compares user's code with generated code (with ±1 time window)

**Security**: Even if someone intercepts the code, it's useless after 30 seconds. The secret never leaves the devices."

### Q5: How would you scale this system?

**Answer:**
"Here's my scaling strategy:

**Horizontal Scaling:**
1. **Multiple service instances** behind load balancer
2. **Redis for Socket.IO** adapter → Sync connections across servers
3. **MongoDB replica set** → Read replicas for queries
4. **RabbitMQ cluster** → High availability

**Caching:**
1. Redis for session data → Fast user lookups
2. Cache user profiles → Reduce DB queries
3. Cache organization settings → Shared across users

**Database Optimization:**
1. Add indexes on frequently queried fields
2. Use aggregation pipelines for reports
3. Archive old data → Separate collection

**Monitoring:**
1. APM tools (New Relic, DataDog) → Track performance
2. Log aggregation (ELK stack) → Centralized logging
3. Alerts → Notify on errors/slowdowns

**Cost-effective approach**: Start with single server, add caching, then horizontal scaling as needed."

---

## API Usage Examples

### Complete Workflow Example

**Step 1: Super Admin Creates Site Admin Invite**
```bash
# Login as super admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "super@admin.com",
    "password": "SuperAdmin123"
  }'

# Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123...",
  "user": { "role": "super_admin", ... }
}

# Create invite for site admin
curl -X POST http://localhost:3000/api/invites/create \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "siteadmin@example.com",
    "role": "site_admin"
  }'

# Response:
{
  "success": true,
  "message": "Invitation created successfully",
  "invite": {
    "id": "507f...",
    "email": "siteadmin@example.com",
    "role": "site_admin",
    "expiresAt": "2024-01-15T10:30:00.000Z",
    "token": "c7e84e24de26a82b421d9d1ae46eed1971191894229733470ffeb81eb854a243"
  }
}
```

**Step 2: Recipient Accepts Invite**
```bash
# Check invite details first (no auth required)
curl http://localhost:3000/api/invites/details/c7e84e24de26a82b421d9d1ae46eed1971191894229733470ffeb81eb854a243

# Response:
{
  "success": true,
  "invite": {
    "email": "siteadmin@example.com",
    "role": "site_admin",
    "invitedBy": {
      "name": "Super Admin",
      "email": "super@admin.com"
    },
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}

# Accept invite
curl -X POST http://localhost:3000/api/invites/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "c7e84e24de26a82b421d9d1ae46eed1971191894229733470ffeb81eb854a243",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePass123"
  }'

# Response: Automatically logged in!
{
  "success": true,
  "message": "Account created successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "xyz789...",
  "user": {
    "email": "siteadmin@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "site_admin"
  }
}
```

**Step 3: Setup TOTP (Optional)**
```bash
# Setup TOTP - Get QR code
curl -X POST http://localhost:3000/api/auth/totp/setup \
  -H "Authorization: Bearer eyJhbGc..."

# Response:
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "message": "Scan the QR code with your authenticator app"
}

# Confirm TOTP with code from app
curl -X POST http://localhost:3000/api/auth/totp/confirm \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{ "token": "123456" }'

# Response:
{
  "success": true,
  "message": "TOTP enabled successfully"
}
```

---

## API Endpoint Fix

### Issue with Invite Details API

**Your URL:**
```
http://localhost:3000/api/invites/details/:c7e84e24de26a82b421d9d1ae46eed1971191894229733470ffeb81eb854a243
```

**Problem:** The `:` should not be in the URL. It's a route parameter placeholder.

**Correct URL:**
```
http://localhost:3000/api/invites/details/c7e84e24de26a82b421d9d1ae46eed1971191894229733470ffeb81eb854a243
```

**Why?**
```javascript
// In the route definition
router.get('/details/:token', getInviteDetails);
//                   ↑
//                   This is a placeholder

// Express maps:
// URL: /details/abc123  →  req.params.token = 'abc123'
// URL: /details/:abc123 →  req.params.token = ':abc123' (literal colon)
```

**Testing:**
```bash
# Wrong (with colon)
curl http://localhost:3000/api/invites/details/:abc123

# Correct (without colon)
curl http://localhost:3000/api/invites/details/abc123
```

---

## Conclusion

This system demonstrates:
- **Microservices architecture** with proper separation
- **Secure authentication** with JWT and 2FA
- **Async communication** via RabbitMQ
- **Real-time updates** via Socket.IO
- **Production-ready patterns** (error handling, validation, rate limiting)

**Key Takeaways:**
1. Use microservices for scalability and maintainability
2. Implement defense in depth (multiple security layers)
3. Design for failure (retry logic, fallbacks)
4. Make it observable (logging, monitoring)
5. Keep it simple (don't over-engineer)

---

**Questions to Ask Yourself:**
1. Why did we choose MongoDB over PostgreSQL?
2. What happens if RabbitMQ is down?
3. How would you add a third service (e.g., SMS notifications)?
4. What security vulnerabilities might still exist?
5. How would you deploy this to production?

Think through these scenarios to deepen your understanding!

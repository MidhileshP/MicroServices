# User Management System - Complete Documentation

## Overview

This is a microservices-based User Management System built with Node.js and Express. The system consists of two main services:

1. **User Management Service** - Handles authentication, user invitations, and organization management
2. **Notifications Service** - Handles email notifications and real-time updates via Socket.IO

## Architecture

The system uses:
- **MongoDB** for data persistence
- **RabbitMQ** for asynchronous message queuing
- **Redis** for Socket.IO adapter (scaling WebSocket connections)
- **Socket.IO** for real-time notifications
- **Nodemailer** for email delivery
- **JWT** for authentication tokens
- **TOTP/OTP** for two-factor authentication

## Project Structure

```
.
├── userManagement/           # User Management Service
│   ├── config/
│   │   └── database.js      # MongoDB connection
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── inviteController.js
│   │   └── organizationController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication & authorization
│   │   └── validation.js    # Request validation
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Invite.js
│   │   ├── Organization.js
│   │   └── RefreshToken.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── invite.js
│   │   └── organization.js
│   ├── utils/               # Helper functions
│   │   ├── jwt.js
│   │   ├── notificationClient.js
│   │   ├── otp.js
│   │   ├── rabbitmq.js
│   │   ├── roleHierarchy.js
│   │   ├── socketClient.js
│   │   └── totp.js
│   ├── .env
│   ├── package.json
│   └── server.js            # Entry point
│
└── notifications/           # Notifications Service
    ├── config/
    │   ├── rabbitmq.js      # RabbitMQ connection
    │   └── redis.js         # Redis connection
    ├── controllers/
    │   └── emailController.js
    ├── routes/
    │   └── email.js
    ├── utils/
    │   └── mailer.js        # Email sending logic
    ├── .env
    ├── package.json
    ├── server.js            # Entry point
    └── tsconfig.json
```

---

## User Management Service

### Environment Variables

Create a `.env` file in the `userManagement/` directory:

```env
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/user_management

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Notification Service
NOTIFICATION_SERVICE_URL=http://localhost:4000

# Frontend URL (for invite links in emails)
FRONTEND_URL=http://localhost:5173

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# CORS
CORS_ORIGIN=*
```

### Installation & Running

```bash
cd userManagement
npm install
npm start        # Production
npm run dev      # Development with hot reload
```

### Data Models

#### User Model
- `email`: String (unique, required)
- `password`: String (hashed, required)
- `firstName`: String (required)
- `lastName`: String (required)
- `role`: Enum ['super_admin', 'site_admin', 'operator', 'client_admin', 'client_user']
- `organization`: ObjectId (ref: Organization)
- `twoFactorMethod`: Enum ['otp', 'totp']
- `totpSecret`: String
- `totpEnabled`: Boolean
- `otpHash`: String
- `otpExpiry`: Date
- `isActive`: Boolean
- `invitedBy`: ObjectId (ref: User)
- Timestamps: `createdAt`, `updatedAt`

#### Invite Model
- `email`: String (required)
- `role`: Enum ['site_admin', 'operator', 'client_admin', 'client_user']
- `invitedBy`: ObjectId (ref: User, required)
- `organization`: ObjectId (ref: Organization)
- `organizationName`: String
- `token`: String (unique, required)
- `status`: Enum ['pending', 'accepted', 'expired', 'revoked']
- `expiresAt`: Date (required)
- `acceptedAt`: Date
- `acceptedUserId`: ObjectId (ref: User)
- Timestamps: `createdAt`, `updatedAt`

#### Organization Model
- `name`: String (required)
- `slug`: String (unique, required)
- `twoFactorMethod`: Enum ['otp', 'totp'], default: 'otp'
- `adminUser`: ObjectId (ref: User, required)
- `isActive`: Boolean
- `settings`: Map
- Timestamps: `createdAt`, `updatedAt`

#### RefreshToken Model
- `token`: String (unique, required)
- `user`: ObjectId (ref: User, required)
- `expiresAt`: Date (required)
- `isRevoked`: Boolean
- `replacedBy`: String
- `userAgent`: String
- `ipAddress`: String
- Timestamps: `createdAt`, `updatedAt`

### Role Hierarchy

The system implements a hierarchical role-based access control:

```
super_admin (Level 5)
  ↓ can invite
site_admin (Level 4)
  ↓ can invite
operator (Level 3)
  ↓ can invite
client_admin (Level 2)
  ↓ can invite
client_user (Level 1)
```

---

## API Endpoints

### Authentication APIs

Base URL: `http://localhost:3000/api/auth`

#### 1. Login

Authenticates a user and returns access/refresh tokens or initiates 2FA.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (No 2FA):**
```json
{
  "success": true,
  "requiresTwoFactor": false,
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client_user",
    "organization": "507f1f77bcf86cd799439012",
    "isActive": true
  }
}
```

**Response (With OTP 2FA):**
```json
{
  "success": true,
  "requiresTwoFactor": true,
  "twoFactorMethod": "otp",
  "userId": "507f1f77bcf86cd799439011",
  "message": "OTP sent to your email"
}
```

**Response (With TOTP 2FA):**
```json
{
  "success": true,
  "requiresTwoFactor": true,
  "twoFactorMethod": "totp",
  "userId": "507f1f77bcf86cd799439011",
  "message": "Please provide your TOTP token"
}
```

---

#### 2. Verify OTP

Verifies the OTP sent to user's email during login.

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client_user"
  }
}
```

---

#### 3. Verify TOTP

Verifies the TOTP token from authenticator app.

**Endpoint:** `POST /api/auth/verify-totp`

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client_user"
  }
}
```

---

#### 4. Setup TOTP

Generates a TOTP secret and QR code for user to scan with authenticator app.

**Endpoint:** `POST /api/auth/totp/setup`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoA...",
  "message": "Scan the QR code with your authenticator app"
}
```

---

#### 5. Confirm TOTP Setup

Confirms TOTP setup by verifying a token from the authenticator app.

**Endpoint:** `POST /api/auth/totp/confirm`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "TOTP enabled successfully"
}
```

---

#### 6. Refresh Token

Generates new access and refresh tokens using a valid refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "x1y2z3..."
}
```

---

#### 7. Logout

Revokes the refresh token.

**Endpoint:** `POST /api/auth/logout`

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 8. Get Profile

Retrieves the authenticated user's profile.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client_user",
    "organization": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Acme Corp",
      "slug": "acme-corp"
    },
    "twoFactorMethod": "otp",
    "totpEnabled": false,
    "isActive": true
  }
}
```

---

### Invite Management APIs

Base URL: `http://localhost:3000/api/invites`

#### 1. Create Invite

Creates an invitation for a new user.

**Endpoint:** `POST /api/invites/create`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `super_admin`, `site_admin`, `operator`, `client_admin`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "client_user",
  "organizationName": "New Company"
}
```

**Notes:**
- `organizationName` is required only when inviting a `client_admin`
- Users can only invite roles below their hierarchy level

**Response:**
```json
{
  "success": true,
  "message": "Invitation created successfully",
  "invite": {
    "id": "507f1f77bcf86cd799439013",
    "email": "newuser@example.com",
    "role": "client_user",
    "expiresAt": "2024-01-15T10:30:00.000Z",
    "token": "a1b2c3d4e5f6g7h8i9j0..."
  }
}
```

---

#### 2. Accept Invite

Accepts an invitation and creates a new user account.

**Endpoint:** `POST /api/invites/accept`

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0...",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "SecurePassword123",
  "twoFactorMethod": "otp"
}
```

**Notes:**
- `twoFactorMethod` is optional; defaults to organization's setting
- Password must be at least 8 characters with uppercase, lowercase, and number

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "x1y2z3...",
  "user": {
    "_id": "507f1f77bcf86cd799439014",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "client_user",
    "organization": "507f1f77bcf86cd799439012"
  }
}
```

---

#### 3. Get Invite Details

Retrieves details of an invitation by token.

**Endpoint:** `GET /api/invites/details/:token`

**Response:**
```json
{
  "success": true,
  "invite": {
    "email": "newuser@example.com",
    "role": "client_user",
    "organizationName": "Acme Corp",
    "invitedBy": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### 4. List Invites

Lists all invitations created by the authenticated user.

**Endpoint:** `GET /api/invites/list?status=pending`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `super_admin`, `site_admin`, `operator`, `client_admin`

**Query Parameters:**
- `status` (optional): Filter by status ('pending', 'accepted', 'expired', 'revoked')

**Response:**
```json
{
  "success": true,
  "invites": [
    {
      "id": "507f1f77bcf86cd799439013",
      "email": "newuser@example.com",
      "role": "client_user",
      "status": "pending",
      "organizationName": null,
      "createdAt": "2024-01-08T10:30:00.000Z",
      "expiresAt": "2024-01-15T10:30:00.000Z",
      "acceptedAt": null,
      "acceptedUser": null
    },
    {
      "id": "507f1f77bcf86cd799439015",
      "email": "another@example.com",
      "role": "client_admin",
      "status": "accepted",
      "organizationName": "Tech Startup",
      "createdAt": "2024-01-05T10:30:00.000Z",
      "expiresAt": "2024-01-12T10:30:00.000Z",
      "acceptedAt": "2024-01-06T14:22:00.000Z",
      "acceptedUser": {
        "name": "Alice Johnson",
        "email": "another@example.com"
      }
    }
  ]
}
```

---

#### 5. Revoke Invite

Revokes a pending invitation.

**Endpoint:** `DELETE /api/invites/:inviteId/revoke`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `super_admin`, `site_admin`, `operator`, `client_admin`

**Response:**
```json
{
  "success": true,
  "message": "Invite revoked successfully"
}
```

---

### Organization Management APIs

Base URL: `http://localhost:3000/api/organization`

#### 1. Get Organization

Retrieves the authenticated user's organization details.

**Endpoint:** `GET /api/organization`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `client_admin`, `client_user`

**Response:**
```json
{
  "success": true,
  "organization": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "twoFactorMethod": "otp",
    "isActive": true,
    "admin": {
      "name": "John Doe",
      "email": "john@acme.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### 2. Update Organization

Updates organization settings (admin only).

**Endpoint:** `PUT /api/organization`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `client_admin` (and must be the organization admin)

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "twoFactorMethod": "totp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organization updated successfully",
  "organization": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "twoFactorMethod": "totp",
    "isActive": true
  }
}
```

---

#### 3. Get Organization Members

Lists all active members of the organization.

**Endpoint:** `GET /api/organization/members`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** `client_admin`, `client_user`

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client_admin",
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "email": "jane@acme.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "client_user",
      "isActive": true
    }
  ]
}
```

---

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "message": "User Management Service is running",
  "timestamp": "2024-01-08T10:30:00.000Z"
}
```

---

## Notifications Service

### Environment Variables

Create a `.env` file in the `notifications/` directory:

```env
NODE_ENV=development
PORT=4000

# Redis
REDIS_URL=redis://localhost:6379

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="User Management System" <noreply@example.com>

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=events
RABBITMQ_QUEUE_EMAIL=notifications.email
RABBITMQ_ROUTE_INVITE=user.invite.created

# CORS
CORS_ORIGIN=*
```

### Installation & Running

```bash
cd notifications
npm install
npm start        # Production
npm run dev      # Development with hot reload
```

### API Endpoints

Base URL: `http://localhost:4000/api/email`

#### 1. Send Email

Sends an email to the specified recipient.

**Endpoint:** `POST /api/email/send`

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello World</h1><p>This is a test email.</p>",
  "text": "Hello World. This is a test email."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<abc123@example.com>"
}
```

---

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "message": "Notifications Service is running",
  "timestamp": "2024-01-08T10:30:00.000Z"
}
```

---

### Socket.IO Events

The Notifications Service provides real-time notifications via Socket.IO.

**Connection:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});
```

#### Client Events (Emit)

##### 1. register
Register a user to receive notifications.

```javascript
socket.emit('register', {
  userId: '507f1f77bcf86cd799439011'
});
```

##### 2. inviteAccepted
Notify that an invite was accepted (typically emitted by backend).

```javascript
socket.emit('inviteAccepted', {
  userId: '507f1f77bcf86cd799439011',
  message: 'newuser@example.com has accepted their invitation as client_user',
  timestamp: '2024-01-08T10:30:00.000Z'
});
```

#### Server Events (Listen)

##### 1. notification
Receives notifications specific to the registered user.

```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // data: { type, message, timestamp }
});
```

##### 2. inviteStatusUpdate
Receives updates about invite acceptances (broadcast to all clients).

```javascript
socket.on('inviteStatusUpdate', (data) => {
  console.log('Invite Status:', data);
  // data: { type, userId, message, timestamp }
});
```

---

## Common Error Responses

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Security Features

### 1. Password Security
- Passwords are hashed using bcrypt with salt rounds of 12
- Password requirements: minimum 8 characters, uppercase, lowercase, and number

### 2. JWT Tokens
- **Access Token**: Short-lived (15 minutes), used for API authentication
- **Refresh Token**: Long-lived (7 days), stored securely, used to get new access tokens

### 3. Two-Factor Authentication
- **OTP**: 6-digit code sent via email, valid for 10 minutes
- **TOTP**: Time-based token from authenticator app (Google Authenticator, Authy, etc.)

### 4. Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Login endpoint: 50 requests per 15 minutes per IP (failed attempts only)

### 5. Security Headers
- Helmet.js middleware for secure HTTP headers

### 6. Role-Based Access Control (RBAC)
- Hierarchical role system with strict permission checks
- Users can only invite roles below their level

---

## Message Queue Integration

The system uses RabbitMQ for asynchronous communication between services.

### Exchange & Routing

- **Exchange:** `events` (topic exchange)
- **Queue:** `notifications.email`
- **Routing Key:** `user.invite.created`

### Event Flow

1. User Management Service publishes events to RabbitMQ
2. Notifications Service consumes events from the queue
3. Emails are sent based on the event data

**Event Payload Example:**
```json
{
  "to": "user@example.com",
  "subject": "You have been invited",
  "html": "<p>Invitation email content...</p>"
}
```

---

## Development Tips

### Running Services Locally

1. Start MongoDB:
```bash
mongod
```

2. Start Redis:
```bash
redis-server
```

3. Start RabbitMQ:
```bash
rabbitmq-server
```

4. Start Notifications Service:
```bash
cd notifications
npm run dev
```

5. Start User Management Service:
```bash
cd userManagement
npm run dev
```

### Testing Emails

If you don't have SMTP credentials, the system will automatically fall back to Ethereal Email (test email service). Check the console logs for preview URLs to view sent emails.

### Database Seeding

To create a super admin user, you'll need to manually insert a user into MongoDB or use the invite system with a temporary super_admin account.

---

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running on `localhost:27017`
- Check `MONGODB_URI` in `.env`

### RabbitMQ Connection Issues
- Ensure RabbitMQ is running on `localhost:5672`
- Services will continue to work without RabbitMQ, but email notifications via queue won't work

### Redis Connection Issues
- Ensure Redis is running on `localhost:6379`
- Required for Socket.IO scaling (not critical for single instance)

### Email Not Sending
- Check SMTP credentials in `.env`
- If using Gmail, enable "App Passwords" in your Google Account settings
- System will fall back to Ethereal Email if SMTP fails

---

## Production Deployment Checklist

- [ ] Change all secret keys in `.env` files
- [ ] Use production-grade MongoDB (e.g., MongoDB Atlas)
- [ ] Use production-grade Redis (e.g., Redis Cloud)
- [ ] Use production-grade RabbitMQ (e.g., CloudAMQP)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Use HTTPS for all services
- [ ] Set up proper logging (e.g., Winston, Morgan)
- [ ] Configure health check monitoring
- [ ] Set up backup strategies for MongoDB
- [ ] Use environment-specific configuration management
- [ ] Enable rate limiting and DDoS protection
- [ ] Review and harden security settings

---

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.

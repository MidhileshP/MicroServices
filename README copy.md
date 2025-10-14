# Invite-Only User Management Microservices

Production-ready invite-only user-management microservice architecture with full JavaScript source code (Node.js, ES modules).

## Architecture Overview

This system consists of two microservices:

1. **User Management Service** - Handles users, roles, organizations, invites, and authentication
2. **Notifications Service** - Handles emails and real-time notifications with Socket.IO and Redis

## Tech Stack

- **Node.js** (ES modules, `"type": "module"`)
- **Express.js** - REST API framework
- **MongoDB + Mongoose** - Database and ODM
- **Redis** - Caching and Socket.IO adapter for horizontal scaling
- **Socket.IO** - Real-time notifications
- **JWT** - Authentication (access + refresh tokens)
- **bcryptjs** - Password hashing
- **Speakeasy + QRCode** - TOTP (Time-based OTP)
- **Nodemailer** - Email delivery
- **Docker + Docker Compose** - Containerization

## Features

### Role-Based Access Control

- **Roles**: `super_admin`, `site_admin`, `operator`, `client_admin`, `client_user`
- **Invite Hierarchy**:
  - `super_admin` → can invite `site_admin`, `operator`, `client_admin`
  - `site_admin` → can invite `operator`, `client_admin`
  - `operator` → can invite `client_admin`
  - `client_admin` → can invite `client_user`

### Organization Management

- An **Organization** is automatically created when a `client_admin` is invited
- Both `client_admin` and `client_user` belong to an Organization
- Organization-level 2FA preference (OTP or TOTP)

### Invite System

- Users can **only** be created via single-use, expiring invite links
- No open/public signup
- Invites expire after 7 days
- Email notifications sent automatically

### Two-Factor Authentication

- **OTP (One-Time Password)**: Sent via email, hashed before storing in DB
- **TOTP (Time-based OTP)**: QR code generation with Speakeasy, supports authenticator apps
- Organization-level preference determines which method is used

### Authentication & Security

- **Password hashing** with bcryptjs (12 salt rounds)
- **JWT authentication**:
  - Access token (short-lived, default: 15 minutes)
  - Refresh token (long-lived, default: 7 days)
- **Refresh token rotation** with database storage
- **Security middleware**: Helmet, CORS, rate limiting
- **Input validation**: express-validator

### Real-Time Notifications

- Socket.IO with Redis adapter for horizontal scaling
- Event: `inviteAccepted` → Real-time toast notification to inviter
- Broadcast updates to higher-role users

## Project Structure

```
.
├── docker-compose.yml
├── README.md
├── .env.example
└── services/
    ├── userManagement/
    │   ├── models/
    │   │   ├── User.js
    │   │   ├── Organization.js
    │   │   ├── Invite.js
    │   │   └── RefreshToken.js
    │   ├── controllers/
    │   │   ├── authController.js
    │   │   ├── inviteController.js
    │   │   └── organizationController.js
    │   ├── routes/
    │   │   ├── auth.js
    │   │   ├── invite.js
    │   │   └── organization.js
    │   ├── middleware/
    │   │   ├── auth.js
    │   │   └── validation.js
    │   ├── utils/
    │   │   ├── jwt.js
    │   │   ├── otp.js
    │   │   ├── totp.js
    │   │   ├── roleHierarchy.js
    │   │   ├── notificationClient.js
    │   │   └── socketClient.js
    │   ├── config/
    │   │   └── database.js
    │   ├── server.js
    │   ├── package.json
    │   ├── Dockerfile
    │   └── .env.example
    └── notifications/
        ├── controllers/
        │   └── emailController.js
        ├── routes/
        │   └── email.js
        ├── config/
        │   └── redis.js
        ├── utils/
        │   └── mailer.js
        ├── server.js
        ├── package.json
        ├── Dockerfile
        └── .env.example
```

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 20+** (if running locally without Docker)
- **MongoDB**, **Redis** (if running locally without Docker)

### Option 1: Run with Docker Compose (Recommended)

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd <your-repo-name>
```

2. **Configure environment variables**

Copy the example files:

```bash
cp .env.example .env
cp services/userManagement/.env.example services/userManagement/.env
cp services/notifications/.env.example services/notifications/.env
```

Edit the `.env` files as needed. For testing, you can use [Ethereal Email](https://ethereal.email/) for SMTP.

3. **Start all services**

```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- RabbitMQ (ports 5672, 15672)
- User Management Service (port 3000)
- Notifications Service (port 4000)

4. **Check service health**

```bash
curl http://localhost:3000/health
curl http://localhost:4000/health
```

5. **Create the first super admin** (manual DB insert)

Connect to MongoDB:

```bash
docker exec -it microservices_mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

Switch to the database and create a super admin:

```javascript
use user_management

db.users.insertOne({
  email: "admin@example.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.sJOWHm", // password: Admin123!
  firstName: "Super",
  lastName: "Admin",
  role: "super_admin",
  organization: null,
  twoFactorMethod: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Note**: The hashed password above is `Admin123!`. For production, create a new hash using bcrypt.

### Option 2: Run Locally (Without Docker)

1. **Start MongoDB and Redis locally**

```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

2. **Install dependencies for both services**

```bash
# User Management Service
cd services/userManagement
npm install

# Notifications Service
cd ../notifications
npm install
```

3. **Configure environment variables**

Copy and edit the `.env.example` files in each service directory.

4. **Start both services**

In separate terminal windows:

```bash
# Terminal 1 - Notifications Service
cd services/notifications
npm start

# Terminal 2 - User Management Service
cd services/userManagement
npm start
```

## API Endpoints

### User Management Service (Port 3000)

#### Authentication

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/verify-totp` - Verify TOTP token
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `GET /api/auth/profile` - Get current user profile (requires auth)
- `POST /api/auth/totp/setup` - Setup TOTP (requires auth)
- `POST /api/auth/totp/confirm` - Confirm TOTP setup (requires auth)

#### Invites

- `POST /api/invites/create` - Create invite (requires auth + appropriate role)
- `POST /api/invites/accept` - Accept invite (public)
- `GET /api/invites/details/:token` - Get invite details (public)
- `GET /api/invites/list` - List sent invites (requires auth)
- `DELETE /api/invites/:inviteId/revoke` - Revoke invite (requires auth)

#### Organization

- `GET /api/organization` - Get organization details (requires auth)
- `PUT /api/organization` - Update organization (requires client_admin role)
- `GET /api/organization/members` - Get organization members (requires auth)

### Notifications Service (Port 4000)

#### Email

- `POST /api/email/send` - Send email (used by User Management Service)

#### Socket.IO Events

**Client → Server:**
- `register` - Register user socket connection: `{ userId: string }`

**Server → Client:**
- `notification` - Receive notification: `{ type: string, message: string, timestamp: string }`
- `inviteStatusUpdate` - Broadcast invite status update

## API Usage Examples

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

Response (no 2FA):
```json
{
  "success": true,
  "requiresTwoFactor": false,
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3d4...",
  "user": { ... }
}
```

Response (with 2FA):
```json
{
  "success": true,
  "requiresTwoFactor": true,
  "twoFactorMethod": "otp",
  "userId": "507f1f77bcf86cd799439011",
  "message": "OTP sent to your email"
}
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "otp": "123456"
  }'
```

### 3. Create Invite

```bash
curl -X POST http://localhost:3000/api/invites/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "email": "newuser@example.com",
    "role": "client_admin",
    "organizationName": "Acme Corp"
  }'
```

### 4. Accept Invite

```bash
curl -X POST http://localhost:3000/api/invites/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePass123!"
  }'
```

### 5. Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4..."
  }'
```

## Socket.IO Client Integration

### Connect to Notifications Service

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to notifications service');

  // Register user
  socket.emit('register', { userId: 'user-id-here' });
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('Notification received:', data);
  // Show toast notification
});

socket.on('inviteStatusUpdate', (data) => {
  console.log('Invite status update:', data);
});
```

## Security Best Practices

### Passwords
- Minimum 8 characters
- Must contain uppercase, lowercase, and number
- Hashed with bcryptjs (12 salt rounds)

### JWT Tokens
- Access tokens are short-lived (15 minutes by default)
- Refresh tokens are long-lived (7 days by default)
- Refresh token rotation prevents replay attacks
- All refresh tokens stored in database for revocation

### OTP/TOTP
- OTP codes are hashed before storing in database
- OTP expires after 10 minutes
- TOTP secrets stored encrypted
- TOTP verification window: 2 steps (±1 minute)

### Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Login endpoint: 5 failed attempts per 15 minutes per IP

### Headers & CORS
- Helmet.js for security headers
- CORS configured (adjust `CORS_ORIGIN` in production)

## Production Deployment

### Environment Variables

**CRITICAL**: Change all secrets in production!

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- MongoDB credentials
- Redis password
- SMTP credentials

### Deployment Options

#### Option 1: Docker + PM2

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: PM2 (without Docker)

```bash
# Install PM2
npm install -g pm2

# Start services
cd services/userManagement
pm2 start server.js --name user-management

cd ../notifications
pm2 start server.js --name notifications

# Save PM2 config
pm2 save
pm2 startup
```

#### Option 3: Kubernetes

Create Kubernetes manifests for:
- Deployments (userManagement, notifications)
- Services (ClusterIP, LoadBalancer)
- ConfigMaps (environment variables)
- Secrets (sensitive data)
- StatefulSets (MongoDB, Redis)

### HTTPS/TLS

Use a reverse proxy (Nginx, Traefik) or load balancer to terminate TLS:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /user-management/ {
        proxy_pass http://localhost:3000/;
    }

    location /notifications/ {
        proxy_pass http://localhost:4000/;
    }
}
```

### Monitoring & Logging

- Use **PM2** for process monitoring
- Use **Winston** or **Pino** for structured logging
- Use **Prometheus + Grafana** for metrics
- Use **Sentry** or **Rollbar** for error tracking

### Scaling

#### Horizontal Scaling

Socket.IO with Redis adapter supports multiple instances:

```bash
docker-compose up --scale user_management=3 --scale notifications=3
```

Add a load balancer (Nginx, HAProxy, or cloud LB) in front.

#### Database Scaling

- Use MongoDB replica sets for high availability
- Use Redis Cluster for distributed caching
- Add read replicas for read-heavy workloads

## Testing SMTP with Ethereal

1. Visit [https://ethereal.email](https://ethereal.email)
2. Click "Create Ethereal Account"
3. Copy the credentials to your `.env` file:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-username@ethereal.email
SMTP_PASS=your-password
```

4. All emails will be captured at [https://ethereal.email/messages](https://ethereal.email/messages)

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check logs
docker logs microservices_mongodb

# Test connection
docker exec -it microservices_mongodb mongosh -u admin -p admin123
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it microservices_redis redis-cli ping
```

### Socket.IO Connection Issues

- Ensure CORS is configured correctly
- Check firewall rules
- Verify Redis adapter is connected
- Check browser console for errors

### Email Not Sending

- Verify SMTP credentials
- Check notification service logs: `docker logs notifications_service`
- Test with Ethereal Email first

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on GitHub.

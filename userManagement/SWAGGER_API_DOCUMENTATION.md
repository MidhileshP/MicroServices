# API Documentation with Swagger

This document describes how to access and use the Swagger API documentation for the User Management Service.

## Accessing the Documentation

Once the server is running, you can access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

Or if you're running on a different port:
```
http://localhost:<PORT>/api-docs
```

## Features

The Swagger UI provides:

- **Interactive API Testing**: Try out API endpoints directly from the browser
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Schema Definitions**: View data models and their properties
- **Authentication**: Test authenticated endpoints using Bearer tokens
- **Grouped Endpoints**: APIs are organized by tags (Authentication, Invites, Organization, Health)

## API Overview

### Authentication Endpoints (`/api/auth`)

- `POST /api/auth/login` - User login with email and password
- `POST /api/auth/verify-otp` - Verify OTP code sent via email
- `POST /api/auth/verify-totp` - Verify TOTP code from authenticator app
- `POST /api/auth/totp/setup` - Generate QR code for TOTP setup
- `POST /api/auth/totp/confirm` - Confirm TOTP setup with verification
- `POST /api/auth/mfa/change` - Change MFA method (OTP ↔ TOTP) [Admin roles only]
- `GET /api/auth/profile` - Get authenticated user's profile
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout and revoke refresh token

### Invite Endpoints (`/api/invites`)

- `POST /api/invites/create` - Create user invitation
- `POST /api/invites/accept` - Accept invitation and create account
- `GET /api/invites/details/:token` - Get invitation details
- `GET /api/invites/list` - List all invitations (with optional status filter)
- `DELETE /api/invites/:inviteId/revoke` - Revoke pending invitation

### Organization Endpoints (`/api/organization`)

- `GET /api/organization` - Get organization details
- `PUT /api/organization` - Update organization (name, MFA method)
- `GET /api/organization/members` - Get all organization members

### Health Check

- `GET /health` - Service health check

## Using Authentication

Many endpoints require authentication. To test authenticated endpoints in Swagger UI:

1. First, login using `POST /api/auth/login`
2. Copy the `accessToken` from the response
3. Click the "Authorize" button at the top of the Swagger UI
4. Enter: `Bearer <your-access-token>`
5. Click "Authorize" to save
6. Now you can test authenticated endpoints

Example:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWE...
```

## Role-Based Access Control

Different endpoints require different user roles:

| Endpoint | Allowed Roles |
|----------|---------------|
| Change MFA Method | `super_admin`, `site_admin`, `client_admin` |
| Create Invite | `super_admin`, `site_admin`, `operator`, `client_admin` |
| Update Organization | `client_admin` (must be org admin) |
| View Organization | `client_admin`, `client_user` |

## MFA Implementation Details

### Client User MFA Rules
- `client_user` role **always inherits** their organization's MFA method
- They **cannot** change their own MFA method
- Their MFA changes when the `client_admin` updates the organization's `twoFactorMethod`

### Admin MFA Rules
- `super_admin`, `site_admin`, and `client_admin` **can** change their MFA method
- Use `POST /api/auth/mfa/change` with `{ "method": "otp" }` or `{ "method": "totp" }`
- When switching to TOTP, a QR code is provided for authenticator app setup

### TOTP Setup Flow
1. User sets method to TOTP (during invite acceptance or via MFA change)
2. System generates QR code
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. User verifies with 6-digit code from app
5. TOTP is enabled after successful verification

### Incomplete TOTP Setup
- If TOTP is set but not confirmed, user will receive QR code again at login
- User must verify TOTP code to complete login
- After successful verification, TOTP is automatically enabled

## Example Workflows

### 1. Complete User Onboarding (Client User)

```
1. Admin creates invite:
   POST /api/invites/create
   {
     "email": "user@example.com",
     "role": "client_user"
   }

2. User accepts invite:
   POST /api/invites/accept
   {
     "token": "...",
     "firstName": "John",
     "lastName": "Doe",
     "password": "SecurePass123"
   }

3. User inherits organization's MFA method automatically

4. At login, user completes MFA verification based on org's method
```

### 2. Admin Changes MFA Method

```
1. Login:
   POST /api/auth/login
   { "email": "admin@example.com", "password": "..." }

2. Change to TOTP:
   POST /api/auth/mfa/change
   { "method": "totp" }

3. Scan QR code with authenticator app

4. Confirm TOTP:
   POST /api/auth/totp/confirm
   { "userId": "...", "token": "123456" }
```

### 3. Organization Admin Updates Organization MFA

```
1. Login as client_admin

2. Update organization:
   PUT /api/organization
   { "twoFactorMethod": "totp" }

3. All client_user members will now use TOTP at their next login
```

## Swagger JSON

You can also access the raw Swagger specification in JSON format at:

```
http://localhost:3000/api-docs.json
```

This is useful for:
- Importing into Postman
- Generating client SDKs
- Integration with other API tools

## Development

### Adding New Endpoints

To add documentation for new endpoints:

1. Create or update a file in `/swagger/` directory
2. Add JSDoc comments with Swagger annotations
3. The swagger configuration automatically picks up files matching `/swagger/*.js`
4. Restart the server to see changes

Example:
```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Your endpoint description
 *     tags: [YourTag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success response
 */
```

## Security Notes

- Swagger UI is enabled by default for development
- In production, consider:
  - Restricting access to `/api-docs` by IP or authentication
  - Disabling Swagger UI completely if not needed
  - Using environment variables to control Swagger availability

## Support

For issues or questions about the API, please contact the development team or create an issue in the project repository.

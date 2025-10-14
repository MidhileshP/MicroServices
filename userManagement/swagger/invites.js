/**
 * @swagger
 * /api/invites/create:
 *   post:
 *     summary: Create user invite
 *     description: Send an invitation to a new user (super_admin, site_admin, operator, and client_admin only)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               role:
 *                 type: string
 *                 enum: [site_admin, operator, client_admin, client_user]
 *                 example: client_user
 *               organizationName:
 *                 type: string
 *                 description: Required for client_admin role
 *                 example: Acme Corporation
 *     responses:
 *       201:
 *         description: Invitation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Invitation created successfully
 *                 invite:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     email:
 *                       type: string
 *                       example: newuser@example.com
 *                     role:
 *                       type: string
 *                       example: client_user
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     token:
 *                       type: string
 *                       example: a1b2c3d4e5f6...
 *       400:
 *         description: Invalid request or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/invites/accept:
 *   post:
 *     summary: Accept invitation
 *     description: Accept an invitation and create user account
 *     tags: [Invites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - firstName
 *               - lastName
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: a1b2c3d4e5f6...
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePassword123
 *               twoFactorMethod:
 *                 type: string
 *                 enum: [otp, totp]
 *                 description: Optional for admin roles, ignored for client_user (inherits organization MFA)
 *                 example: otp
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Account created successfully
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: a1b2c3d4e5f6...
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 - type: object
 *                   description: When TOTP setup is required
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Account created successfully. Complete TOTP setup to continue.
 *                     requiresTwoFactor:
 *                       type: boolean
 *                       example: true
 *                     twoFactorMethod:
 *                       type: string
 *                       example: totp
 *                     userId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     totp:
 *                       type: object
 *                       properties:
 *                         secret:
 *                           type: string
 *                           example: JBSWY3DPEHPK3PXP
 *                         qrCode:
 *                           type: string
 *                           example: data:image/png;base64,iVBORw0KG...
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Invite not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/invites/details/{token}:
 *   get:
 *     summary: Get invite details
 *     description: Get details of an invitation using its token
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *         example: a1b2c3d4e5f6...
 *     responses:
 *       200:
 *         description: Invite details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 invite:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: newuser@example.com
 *                     role:
 *                       type: string
 *                       example: client_user
 *                     organizationName:
 *                       type: string
 *                       example: Acme Corporation
 *                     invitedBy:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: admin@example.com
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid or expired invite
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Invite not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/invites/list:
 *   get:
 *     summary: List invites
 *     description: List all invites created by the authenticated user
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, expired, revoked]
 *         description: Filter by invite status
 *         example: pending
 *     responses:
 *       200:
 *         description: Invites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 invites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invite'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/invites/{inviteId}/revoke:
 *   delete:
 *     summary: Revoke invitation
 *     description: Revoke a pending invitation
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Invite revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Invite revoked successfully
 *       400:
 *         description: Cannot revoke non-pending invite
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Invite not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

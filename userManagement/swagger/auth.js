/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password. Returns tokens if no MFA required, or MFA challenge if enabled.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecurePassword123
 *     responses:
 *       200:
 *         description: Login successful or MFA required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: a1b2c3d4e5f6...
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     requiresTwoFactor:
 *                       type: boolean
 *                       example: true
 *                     twoFactorMethod:
 *                       type: string
 *                       enum: [otp, totp]
 *                       example: otp
 *                     userId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     message:
 *                       type: string
 *                       example: OTP sent to your email
 *                     requiresTOTPSetup:
 *                       type: boolean
 *                       example: false
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
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     description: Verify the OTP sent to user's email during login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - otp
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: a1b2c3d4e5f6...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/verify-totp:
 *   post:
 *     summary: Verify TOTP
 *     description: Verify the TOTP token from authenticator app during login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: TOTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: a1b2c3d4e5f6...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid TOTP token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/totp/setup:
 *   post:
 *     summary: Setup TOTP
 *     description: Generate QR code for TOTP setup (authenticated users only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 secret:
 *                   type: string
 *                   example: JBSWY3DPEHPK3PXP
 *                 qrCode:
 *                   type: string
 *                   example: data:image/png;base64,iVBORw0KG...
 *                 message:
 *                   type: string
 *                   example: Scan the QR code with your authenticator app
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/totp/confirm:
 *   post:
 *     summary: Confirm TOTP setup
 *     description: Verify TOTP token to complete setup
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: TOTP enabled successfully
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
 *                   example: TOTP enabled successfully
 *       400:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/mfa/change:
 *   post:
 *     summary: Change MFA method
 *     description: Change MFA method between OTP and TOTP (super_admin, site_admin, and client_admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [otp, totp]
 *                 example: totp
 *     responses:
 *       200:
 *         description: MFA method changed successfully
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
 *                   example: MFA method changed to totp
 *                 requiresTOTPConfirmation:
 *                   type: boolean
 *                   example: true
 *                 totpSetup:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                       example: JBSWY3DPEHPK3PXP
 *                     qrCode:
 *                       type: string
 *                       example: data:image/png;base64,iVBORw0KG...
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (client_user and operator cannot change MFA)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: a1b2c3d4e5f6...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: x1y2z3a4b5c6...
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Logout user and revoke refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: a1b2c3d4e5f6...
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: Logged out successfully
 */

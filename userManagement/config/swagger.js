import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management Service API',
      version: '1.0.0',
      description: 'API documentation for User Management Service with Multi-Factor Authentication',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'site_admin', 'operator', 'client_admin', 'client_user'],
              example: 'client_user'
            },
            organization: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            twoFactorMethod: {
              type: 'string',
              enum: ['otp', 'totp'],
              example: 'otp'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Acme Corporation'
            },
            slug: {
              type: 'string',
              example: 'acme-corporation'
            },
            twoFactorMethod: {
              type: 'string',
              enum: ['otp', 'totp'],
              example: 'otp'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            admin: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'John Doe'
                },
                email: {
                  type: 'string',
                  example: 'admin@acme.com'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Invite: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              example: 'newuser@example.com'
            },
            role: {
              type: 'string',
              enum: ['site_admin', 'operator', 'client_admin', 'client_user'],
              example: 'client_user'
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'expired', 'revoked'],
              example: 'pending'
            },
            organizationName: {
              type: 'string',
              example: 'Acme Corporation'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and MFA management endpoints'
      },
      {
        name: 'Invites',
        description: 'User invitation management endpoints'
      },
      {
        name: 'Organization',
        description: 'Organization management endpoints'
      },
      {
        name: 'Health',
        description: 'Service health check endpoints'
      }
    ]
  },
  apis: ['./routes/*.js', './swagger/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);

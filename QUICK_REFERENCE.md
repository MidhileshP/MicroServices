# Quick Reference Guide - Refactored Codebase

## 🚀 What Changed

### New Files Created
```
userManagement/
├── config/constants.js          ← Centralized configuration
├── utils/logger.js               ← Structured logging
├── utils/errors.js               ← Custom error classes
├── services/authService.js       ← Authentication business logic
├── services/inviteService.js     ← Invitation business logic
└── services/organizationService.js ← Organization business logic
```

### Files Significantly Improved
```
✅ controllers/authController.js       (277 → 175 lines, 37% reduction)
✅ controllers/inviteController.js     (368 → 135 lines, 63% reduction)
✅ controllers/organizationController.js (106 → 63 lines, 41% reduction)
✅ server.js                           (cleaner, logger-based)
✅ config/database.js                  (structured logging)
✅ utils/otp.js                        (uses constants)
```

### Cleanup
```
🗑️ Removed duplicate node_modules directories (saved ~60MB disk space)
```

---

## 📖 How to Use New Structure

### 1. Adding New Authentication Features

**Before** (Everything in controller):
```javascript
export const myNewAuthFeature = async (req, res) => {
  try {
    // 50+ lines of business logic mixed with HTTP handling
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
```

**After** (Clean separation):
```javascript
// In services/authService.js - Add business logic
async myNewFeature(userId, data) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  // Business logic here
  return result;
}

// In controllers/authController.js - Add HTTP handler
export const myNewAuthFeature = async (req, res) => {
  try {
    const result = await authService.myNewFeature(req.user._id, req.body);
    return ok(res, result);
  } catch (error) {
    logger.error('Feature error', { error: error.message, userId: req.user._id });
    if (error.statusCode === 404) return notFound(res, error.message);
    return serverError(res);
  }
};
```

### 2. Using the Logger

**Old way**:
```javascript
console.log('User logged in');
console.error('Login failed:', error);
console.warn('Database slow');
```

**New way**:
```javascript
import { logger } from '../utils/logger.js';

logger.info('User logged in', { userId, email });
logger.error('Login failed', { error: error.message, email });
logger.warn('Database slow', { queryTime: 1500 });
logger.debug('Debug info'); // Only shows in development
```

### 3. Throwing Errors

**Old way**:
```javascript
if (!user) {
  return res.status(404).json({ success: false, message: 'User not found' });
}
```

**New way (in services)**:
```javascript
import { NotFoundError, ValidationError, AuthenticationError } from '../utils/errors.js';

if (!user) {
  throw new NotFoundError('User not found');
}

if (!isValid) {
  throw new ValidationError('Invalid input', errors);
}

if (!authenticated) {
  throw new AuthenticationError('Invalid credentials');
}
```

### 4. Using Constants

**Old way**:
```javascript
if (user.role === 'client_admin') {
  // Magic string
}

const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // What is this?
```

**New way**:
```javascript
import { ROLES, TOKEN_EXPIRY } from '../config/constants.js';

if (user.role === ROLES.CLIENT_ADMIN) {
  // Clear and refactorable
}

const expiry = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_TOKEN);
```

---

## 🔧 Common Patterns

### Controller Pattern
```javascript
export const controllerFunction = async (req, res) => {
  try {
    // 1. Extract data from request
    const { param1, param2 } = req.body;

    // 2. Call service
    const result = await someService.doSomething(param1, param2);

    // 3. Return response
    return ok(res, result);

  } catch (error) {
    // 4. Handle errors
    logger.error('Operation failed', { error: error.message });
    if (error.statusCode === 404) return notFound(res, error.message);
    if (error.statusCode === 400) return badRequest(res, error.message);
    return serverError(res);
  }
};
```

### Service Pattern
```javascript
class MyService {
  async doSomething(param1, param2) {
    // 1. Validate input
    if (!param1) {
      throw new ValidationError('param1 is required');
    }

    // 2. Fetch data
    const data = await Model.findOne({ param1 });

    // 3. Business logic
    if (!data) {
      throw new NotFoundError('Data not found');
    }

    // 4. Process and return
    const result = this.processData(data, param2);
    return result;
  }

  processData(data, param) {
    // Helper methods keep things clean
    return transformedData;
  }
}

export default new MyService();
```

---

## 📁 File Organization

### Controllers
**Purpose**: Handle HTTP requests and responses only
**Should**:
- Extract data from req
- Call service methods
- Return formatted responses
- Handle HTTP-specific errors

**Should NOT**:
- Contain business logic
- Access database directly (except for simple reads)
- Have complex validation logic

### Services
**Purpose**: Contain all business logic
**Should**:
- Implement business rules
- Orchestrate database operations
- Validate business constraints
- Throw domain-specific errors

**Should NOT**:
- Access req or res objects
- Know about HTTP status codes
- Format responses

### Models
**Purpose**: Define data structure and simple operations
**Should**:
- Define schema
- Have instance methods (like `toSafeObject()`)
- Have model-specific validations

**Should NOT**:
- Contain business logic
- Know about services or controllers

---

## 🐛 Debugging Tips

### 1. Check Logs
New structured logging makes debugging easier:
```bash
# Logs now show:
[2025-01-15T10:30:45.123Z] [ERROR] Login error {"error":"Invalid credentials","email":"user@example.com"}
```

### 2. Error Tracking
All errors include:
- Error message
- Status code
- Context (user ID, email, etc.)
- Stack trace (in logs)

### 3. Service Layer Testing
```javascript
// Easy to test services in isolation
import authService from '../services/authService.js';

// Mock database
const mockUser = { _id: '123', email: 'test@example.com' };
User.findOne = jest.fn().mockResolvedValue(mockUser);

// Test service
const result = await authService.authenticate('test@example.com', 'password');
expect(result).toBe(mockUser);
```

---

## 🔄 Migration from Old Code

If you have custom modifications in old files:

1. **Controllers**: Move business logic to appropriate service
2. **Console.logs**: Replace with logger calls
3. **Magic values**: Add to constants.js
4. **Error handling**: Use custom error classes

---

## 📚 Key Files to Remember

| File | Purpose | When to Edit |
|------|---------|--------------|
| `config/constants.js` | All configuration values | Adding new roles, changing timeouts |
| `utils/logger.js` | Logging | Rarely (it's complete) |
| `utils/errors.js` | Custom errors | Adding new error types |
| `services/*.js` | Business logic | Most feature additions |
| `controllers/*.js` | HTTP handlers | New endpoints only |

---

## ⚡ Performance Notes

1. **Database queries**: Consider adding `.lean()` for read-only operations
2. **Caching**: Services are ready for Redis caching integration
3. **Indexes**: Review `models/*.js` for index opportunities

---

## 🧪 Testing Strategy

### Unit Tests (Services)
```javascript
describe('AuthService', () => {
  it('should authenticate valid user', async () => {
    // Test business logic in isolation
  });
});
```

### Integration Tests (Controllers)
```javascript
describe('POST /api/auth/login', () => {
  it('should return token for valid credentials', async () => {
    // Test full request/response cycle
  });
});
```

---

## 🎯 Best Practices

1. **Always use logger** instead of console.log
2. **Throw custom errors** in services
3. **Keep controllers thin** (< 20 lines per function)
4. **Use constants** for magic values
5. **Write descriptive commit messages** referencing this refactor

---

## 📞 Need Help?

1. Check [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) for detailed explanations
2. Look at existing services for patterns
3. Review logger output for insights
4. Test in development environment first

---

## ✅ Checklist for New Features

- [ ] Add business logic to appropriate service
- [ ] Add HTTP handler to controller
- [ ] Use logger for important events
- [ ] Throw custom errors (not generic Error)
- [ ] Use constants for magic values
- [ ] Keep functions small and focused
- [ ] Add route to appropriate routes file
- [ ] Test thoroughly

---

**Happy coding with the refactored codebase! 🎉**

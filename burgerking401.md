# INJAZI WEBAPP - TECHNICAL AUDIT (THIS REPOSITORY)

**Generated:** 2026-02-14  
**Auditor:** Senior Principal Software Architect  
**Scope:** Full repository analysis of THIS specific codebase (frontend + server/)

---

## EXECUTIVE SUMMARY

### What is Injazi?

**Injazi** (Arabic for "achievement/success") is a mobile-first goal achievement application with AI-powered coaching and task management capabilities.

### Repository Architecture

⚠️ **CRITICAL: This is a SPLIT-REPOSITORY architecture.**

**This Repository (Injazi-Frontend):**
- Full-featured React frontend application
- Minimal demo backend in `server/` (4 endpoints)
- The `server/` backend is for **local development only**

**Production Backend (Separate Repository):**
- Located at: `https://github.com/theinjaziteam/Injazi/tree/main/service`
- **21 direct endpoints + OAuth routes + Master Agent routes** (verified 2026-02-14)
- Full authentication with email verification, password reset
- Rate limiting on AI endpoints
- AdMob integration (ad watching, rewards, history)
- OAuth integration (separate routes file for platform connections)
- Master Agent integration (separate routes file for service integrations)
- This is what the frontend ACTUALLY uses in production

**Frontend connects to production backend via `VITE_API_URL` environment variable.**

### This Repository Contains

**Frontend:**
- React 19.2 + TypeScript + Vite 7.2.4
- TailwindCSS 3.4.17 + lucide-react icons
- Context API for state management
- localStorage persistence + periodic sync to backend
- Mobile-first responsive design

**Development Backend (server/):**
- Node.js (ESM) + Express
- MongoDB Atlas (Mongoose ODM)
- bcryptjs for password hashing
- JWT authentication (30-day tokens)
- **Only 4 endpoints:** 2 health checks, 1 combined auth, 1 sync
- **For local development/testing only**

---

## TECH STACK (ACTUAL)

### Frontend Dependencies

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "lucide-react": "^0.468.0",
  "typescript": "~5.8.2",
  "vite": "^7.2.4",
  "tailwindcss": "^3.4.17",
  "@vitejs/plugin-react": "^5.1.1",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.3"
}
```

### Backend Dependencies

```json
{
  "express": "^4.21.2",
  "mongoose": "^8.9.4",
  "cors": "^2.8.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.4.7"
}
```

---

## DATABASE SCHEMA (ACTUAL)

### User Model (`server/models.js`)

```javascript
{
  // Authentication
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Architect' },
  country: { type: String, default: 'Unknown' },
  createdAt: { type: Number, default: Date.now },
  privacyAccepted: { type: Boolean, default: false },

  // Game State
  credits: { type: Number, default: 100 },
  realMoneyBalance: { type: Number, default: 0.0 },
  streak: { type: Number, default: 0 },
  currentDay: { type: Number, default: 1 },
  isPremium: { type: Boolean, default: false },
  activePlanId: { type: String, default: 'free' },
  maxGoalSlots: { type: Number, default: 3 },
  userProfile: { type: String, default: '' },

  // Data & Relations
  goal: GoalSchema,           // Current active goal
  allGoals: [GoalSchema],     // All user goals
  dailyTasks: [TaskSchema],   // Current day's tasks

  // Flexible Collections
  chatHistory: [Mixed],       // AI chat history
  friends: [Mixed],           // Social connections
  connectedApps: [Mixed],     // OAuth connections
  earnTasks: [Mixed],         // Money-earning tasks
  myCourses: [Mixed],         // Purchased courses
  myProducts: [Mixed]         // Purchased products
}
```

### TaskSchema (Embedded)

```javascript
{
  id: String,
  dayNumber: Number,
  title: String,
  description: String,
  estimatedTimeMinutes: Number,
  difficulty: String,
  videoRequirements: String,
  creditsReward: Number,
  isSelected: Boolean,
  status: { type: String, default: 'pending' },
  verificationMessage: String,
  isSupplementary: Boolean,
  progress: { type: Number, default: 0 },
  maxProgress: { type: Number, default: 1 },
  // Background Timer Fields
  timeLeft: { type: Number, default: 0 },
  lastUpdated: { type: Number, default: 0 },
  isTimerActive: { type: Boolean, default: false }
}
```

### GoalSchema (Embedded)

```javascript
{
  id: String,
  title: String,
  category: String,
  mode: String,
  summary: String,
  explanation: String,
  difficultyProfile: String,
  durationDays: Number,
  createdAt: Number,
  visualUrl: String,
  dailyQuestions: [String],
  savedTasks: [TaskSchema],
  savedCurriculum: [Mixed],
  savedCourses: [Mixed],
  savedProducts: [Mixed],
  savedFeed: [Mixed],
  savedVideos: [Mixed]
}
```

---

## BACKEND API (ACTUAL)

### Environment Variables Required

```bash
# Core
MONGODB_URI=<mongodb-atlas-uri>
JWT_SECRET=<jwt-secret>           # Defaults to 'injazi-secret' if missing ⚠️

# CORS
FRONTEND_URL=<vercel-url>

# Server
PORT=5000                          # Defaults to 5000
```

### Endpoints

**1. GET /** - Root health check
```javascript
Response: {
  message: 'InJazi API is running!',
  status: 'healthy',
  timestamp: '2026-02-14T...',
  database: 'connected' | 'disconnected'
}
```

**2. GET /api/health** - API health check
```javascript
Response: {
  status: 'OK',
  database: 'connected' | 'disconnected'
}
```

**3. POST /api/auth** - Combined login/register endpoint
```javascript
Request: {
  email: string,
  password: string,
  name?: string,         // Only for register
  country?: string,      // Only for register
  isRegister: boolean    // true = register, false = login
}

Response: {
  user: { ...userData, password: removed },
  token: string         // JWT valid for 30 days
}

Errors:
- 400: User already exists (register)
- 404: User not found (login)
- 401: Invalid credentials (login)
- 500: Server error
```

**4. POST /api/sync** - Sync user data
```javascript
Request: {
  email: string,
  ...updates          // Any user fields to update
}

Response: {
  success: boolean
}

Errors:
- 400: No email provided
- 500: Sync failed
```

**Total endpoints in THIS repository: 4**

---

## PRODUCTION BACKEND API (VERIFIED)

**Repository:** `https://github.com/theinjaziteam/Injazi/tree/main/service`  
**File:** `service/index.js` (1,249 lines)  
**Verified:** 2026-02-14 via direct source inspection

### Production Backend Features

**Security:**
- ✅ JWT_SECRET **required** (`process.exit(1)` if missing)
- ✅ `requireAuth` middleware on `/api/sync` and `/api/user/:email`
- ✅ `optionalAuth` middleware on AI endpoints
- ✅ Rate limiting on all AI endpoints
- ✅ 10MB JSON body limit (not 50MB)
- ✅ CORS properly configured
- ✅ Input validation on auth endpoints

**Rate Limits:**
```javascript
{
  'ai/completion': { windowMs: 60s, maxRequests: 20 },
  'ai/generate-tasks': { windowMs: 60s, maxRequests: 10 },
  'ai/chat': { windowMs: 60s, maxRequests: 30 },
  'ai/curriculum': { windowMs: 60s, maxRequests: 5 },
  'default': { windowMs: 60s, maxRequests: 60 }
}
```

### Production Endpoints (21 direct + route files)

**Health (3):**
1. `GET /` - Root health check
2. `GET /api/health` - API health check
3. `GET /api/admob/health` - AdMob service health

**Authentication (6):**
4. `POST /api/auth/register` - Register new user (with email validation)
5. `POST /api/auth/login` - Login existing user
6. `POST /api/auth/verify` - Verify email with code
7. `POST /api/auth/resend` - Resend verification code
8. `POST /api/auth/forgot-password` - Request password reset
9. `POST /api/auth/reset-password` - Reset password with token

**User Management (2):**
10. `POST /api/sync` - Sync user data (requires auth, strips sensitive fields)
11. `GET /api/user/:email` - Get user profile (requires auth)

**AI Services (5):**
12. `POST /api/ai/completion` - AI completion (rate limited)
13. `POST /api/ai/generate-tasks` - Generate goal tasks (rate limited)
14. `POST /api/ai/chat` - AI chat (rate limited)
15. `POST /api/ai/curriculum` - Generate curriculum (rate limited)
16. `GET /api/ai/rate-limit-status` - Check rate limit status

**AdMob Integration (5):**
17. `GET /api/admob/can-watch` - Check if user can watch ad
18. `GET /api/admob/reward-callback` - AdMob reward callback
19. `POST /api/admob/reward-callback` - AdMob reward callback (POST)
20. `POST /api/admob/verify-reward` - Verify and grant reward
21. `GET /api/admob/history/:email` - Get ad watch history

**OAuth Integration (separate routes file):**
- `app.use('/api/oauth', oauthRoutes)` - Platform OAuth connections
- Handles 80+ platforms (GitHub, Google, Spotify, Notion, Discord, Slack, etc.)

**Master Agent Integration (separate routes file):**
- `app.use('/api/master-agent', masterAgentRoutes)` - Service integrations
- Handles automated actions across connected platforms

**Total: 21 direct endpoints + OAuth routes + Master Agent routes**

### Key Differences from Local Backend

| Feature | Local (server/) | Production (service/) |
|---------|----------------|----------------------|
| Endpoints | 4 | 21 + route files |
| Auth | Combined `/api/auth` | Separate endpoints |
| Sync auth | ❌ None | ✅ requireAuth |
| JWT_SECRET | Optional (defaults) | ✅ Required (exits if missing) |
| Rate limiting | ❌ None | ✅ AI endpoints |
| JSON limit | 50MB | 10MB |
| Email verification | ❌ No | ✅ Yes |
| Password reset | ❌ No | ✅ Yes |
| AdMob | ❌ No | ✅ Yes |
| OAuth | ❌ No | ✅ Yes |
| Master Agent | ❌ No | ✅ Yes |
| Input validation | ❌ No | ✅ Yes |

---

## SECURITY AUDIT

**⚠️ IMPORTANT:** These findings apply **ONLY** to the local development backend in `server/`. 

**✅ The production backend at `https://github.com/theinjaziteam/Injazi/tree/main/service` has addressed all of these issues** (verified 2026-02-14).

### ⚠️ CRITICAL ISSUES (Local server/ only)

**1. JWT Secret Fallback (HIGH)**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'injazi-secret';
```
- **Issue:** Server uses weak default 'injazi-secret' if env var missing
- **Impact:** Anyone can forge JWTs if this default is used in production
- **Fix:** Make JWT_SECRET required and exit if missing

**2. No Authentication Middleware (HIGH)**
```javascript
app.post('/api/sync', async (req, res) => {
  const { email, ...updates } = req.body;
  // No token verification!
```
- **Issue:** `/api/sync` has NO authentication - anyone can update any user's data
- **Impact:** Complete database write access without auth
- **Fix:** Add JWT verification middleware

**3. No Input Validation (HIGH)**
- No email format validation
- No password strength requirements
- No field sanitization
- Can inject any field into database via `/api/sync`
- Can overwrite `isPremium`, `realMoneyBalance`, `credits` via sync

**4. 50MB JSON Body Limit (MEDIUM)**
```javascript
app.use(express.json({ limit: '50mb' }));
```
- **Issue:** Allows huge request bodies (DoS risk)
- **Fix:** Reduce to 1-10MB

**5. CORS Allows Localhost in Production (MEDIUM)**
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://injazi.vercel.app'
].filter(Boolean);
```
- **Issue:** Localhost is in the production allowed origins list
- **Fix:** Only allow production domain

**6. No-Origin Requests Bypass CORS (MEDIUM)**
```javascript
if (!origin) return callback(null, true);
```
- **Issue:** Server-to-server requests bypass CORS entirely
- **Impact:** Any backend can call the API
- **Fix:** Require origin header or API key

**7. Password Returned in Sync Response (MEDIUM)**
- `/api/sync` uses `$set: updates` without filtering
- Could potentially return password if not careful with queries
- Should explicitly exclude password from all responses

**8. 30-Day JWT with No Refresh (LOW)**
- Tokens valid for 30 days
- No rotation or refresh mechanism
- Stolen tokens valid until expiry

**9. No Rate Limiting (LOW)**
- No protection against brute force attacks
- No API rate limiting at all

**10. Single Combined Auth Endpoint (LOW)**
```javascript
if (isRegister) {
  // register logic
} else {
  // login logic
}
```
- **Issue:** Using a flag to combine register/login is non-standard
- **Better:** Separate `/api/auth/register` and `/api/auth/login` endpoints

---

## FRONTEND ARCHITECTURE

### API Client (`services/api.ts`)

```typescript
{
  register(data: { email, password, name, country? })  // ✅ Production + Local
  login(data: { email, password })                     // ✅ Production + Local
  verify(email, code)                                  // ✅ Production only
  resendCode(email)                                    // ✅ Production only
  forgotPassword(email)                                // ✅ Production only
  resetPassword(email, code, pwd)                      // ✅ Production only
  sync(userData)                                       // ✅ Production + Local
  getUser(email)                                       // ✅ Production only
}
```

**Endpoint Availability:**

| Function | Local (server/) | Production (service/) |
|----------|----------------|----------------------|
| `register()` | ✅ Works | ✅ Works (with email verification) |
| `login()` | ✅ Works | ✅ Works |
| `verify()` | ❌ 404 | ✅ Works |
| `resendCode()` | ❌ 404 | ✅ Works |
| `forgotPassword()` | ❌ 404 | ✅ Works |
| `resetPassword()` | ❌ 404 | ✅ Works |
| `sync()` | ✅ Works (no auth) | ✅ Works (with auth) |
| `getUser()` | ❌ 404 | ✅ Works |

**Production backend verified at:** `https://github.com/theinjaziteam/Injazi/tree/main/service`

In production deployment (`VITE_API_URL` → production backend), **all** API client functions work correctly.

### State Management

**Context API:**
- `AppContext.tsx` - Main application state
- `ThemeContext.tsx` - Theme preferences

**Persistence:**
- `localStorage` for offline state
- Periodic sync to backend via `/api/sync`

### Views

The frontend has extensive views that require the **production backend**:
- Chat with AI → requires `/api/ai/*` endpoints (in production backend)
- OAuth connections → requires `/api/oauth/*` endpoints (in production backend)
- Email verification → requires `/api/auth/verify` (in production backend)
- Password reset → requires `/api/auth/reset-password` (in production backend)
- AdMob rewards → requires `/api/admob/*` endpoints (in production backend)
- Master Agent → requires `/api/agent/*` endpoints (in production backend)

These features work correctly when connected to the production backend.

---

## FRONTEND-BACKEND RELATIONSHIP

### This is a Split-Repository Architecture

**Frontend expects (from production backend):**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify
POST /api/auth/resend
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/sync
GET  /api/user/:email
POST /api/ai/completion
POST /api/ai/chat
POST /api/ai/generate-tasks
GET  /api/admob/can-watch
POST /api/admob/reward-callback
GET  /api/oauth/platforms
... (40+ endpoints total)
```

**Production backend location:**
- Repository: `https://github.com/theinjaziteam/Injazi`
- Path: `/service/`
- Contains all 40+ endpoints the frontend expects

**Local dev backend (server/) provides:**
```
GET  /                  # Health check
GET  /api/health        # API health
POST /api/auth          # Combined login/register (via isRegister flag)
POST /api/sync          # Sync user data
```

**How it works:**
1. **Local Development:** Set `VITE_API_URL=http://localhost:5000` → uses `server/`
2. **Production:** Set `VITE_API_URL=<production-api-url>` → uses separate backend repo

The `server/` directory is a **minimal development backend** that provides just enough functionality to test basic auth and sync flows locally. It is **not deployed to production**.

---

## DEPLOYMENT

### Frontend (Vercel)

**Repository:** This one (Injazi-Frontend)

**Build Command:**
```bash
npm run build  # vite build → dist/
```

**Environment Variables:**
```bash
VITE_API_URL=<production-backend-url>
# Points to: https://github.com/theinjaziteam/Injazi/tree/main/service (deployed)
```

**Example:**
```bash
VITE_API_URL=https://injazi-backend.onrender.com
```

### Production Backend (Render/Railway)

**Repository:** `https://github.com/theinjaziteam/Injazi`  
**Path:** `/service/`  
**NOT this repository** - the production backend is maintained separately.

See the production backend repository for deployment instructions.

### Local Development Backend (server/)

**Purpose:** Local testing only (not deployed to production)

**Start Command:**
```bash
cd server && node index.js
```

**Environment Variables:**
```bash
MONGODB_URI=<connection-string>
JWT_SECRET=<strong-random-secret>  # ⚠️ Defaults to 'injazi-secret'
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Frontend local config:**
```bash
VITE_API_URL=http://localhost:5000
```

---

## RECOMMENDATIONS

### Immediate (Security - Critical)

1. **Add authentication to `/api/sync`:**
```javascript
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/sync', requireAuth, async (req, res) => {
  // Verify user owns the email
  const authUser = await User.findById(req.userId);
  if (authUser.email !== req.body.email) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ...sync logic
});
```

2. **Make JWT_SECRET required:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is required');
  process.exit(1);
}
```

3. **Add input validation:**
```javascript
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

if (!isValidEmail(email)) {
  return res.status(400).json({ message: 'Invalid email' });
}
if (password.length < 6) {
  return res.status(400).json({ message: 'Password too short' });
}
```

4. **Strip sensitive fields in sync:**
```javascript
delete updates.password;
delete updates.isPremium;
delete updates.realMoneyBalance;
```

5. **Reduce JSON limit:**
```javascript
app.use(express.json({ limit: '10mb' }));
```

### Short-term (Architecture)

6. **Separate register/login endpoints:**
```javascript
app.post('/api/auth/register', async (req, res) => { /* ... */ });
app.post('/api/auth/login', async (req, res) => { /* ... */ });
```

7. **Add rate limiting:**
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});

app.post('/api/auth/login', authLimiter, ...);
```

8. **Remove localhost from CORS in production:**
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000'] 
    : [])
].filter(Boolean);
```

### Long-term (Development Backend)

9. **The `server/` backend is intentionally minimal for local dev.** If you need to test features locally that require the full backend:
   - Clone the production backend: `https://github.com/theinjaziteam/Injazi`
   - Run the `/service/` backend locally
   - Point `VITE_API_URL` to it

10. **If keeping `server/` for local dev, consider adding:**
    - Email verification mock endpoints
    - Password reset mock endpoints
    - JWT refresh tokens
    - Input validation library (joi/zod)
    - Request logging (morgan)

11. **Document the split-repo architecture in README** so developers understand:
    - `server/` = local dev only
    - Production backend is in separate repository
    - How to set `VITE_API_URL` correctly

---

## ARCHITECTURE CLARIFIED

✅ **Confirmed: This is a split-repository architecture.**

**This Repository (Injazi-Frontend):**
- Contains: Frontend + minimal dev backend
- Purpose: Frontend development
- Production: Deploys frontend only (Vercel)
- `server/` is for local testing only

**Production Backend Repository:**
- Location: `https://github.com/theinjaziteam/Injazi/tree/main/service`
- Contains: Full backend with 40+ endpoints
- Features: OAuth, AI, Master Agent, AdMob, email verification, etc.
- Production: Deploys to Render/Railway

This is a **valid and common architecture** for teams that want to:
- Separate frontend and backend development
- Allow different deployment cadences
- Provide simple local dev environment without full backend complexity

---

## CONCLUSION

### Repository Purpose: Frontend + Local Dev Backend

This repository serves as the **frontend codebase** with a minimal local development backend.

**What's in `server/` (4 endpoints):**
- Health checks (2)
- Combined auth (login/register)
- Unprotected sync

**The `server/` backend has security issues** (acceptable for local dev, NOT for production):
- ⚠️ Default JWT secret ('injazi-secret')
- ⚠️ No authentication on `/api/sync`
- ⚠️ No input validation
- ⚠️ Can overwrite sensitive fields via sync

**These are acceptable for local development** but would be critical in production.

### Production Backend is Separate (VERIFIED)

**Production backend location:**
- Repository: `https://github.com/theinjaziteam/Injazi`
- Path: `/service/`
- File: `service/index.js` (1,249 lines, verified 2026-02-14)
- Features: **21 direct endpoints + OAuth routes + Master Agent routes**
  - ✅ Authentication (6 endpoints: register, login, verify, resend, forgot-password, reset-password)
  - ✅ User management (2 endpoints: sync with auth, get user)
  - ✅ AI services (5 endpoints with rate limiting)
  - ✅ AdMob integration (5 endpoints: health, can-watch, callbacks, verify, history)
  - ✅ OAuth integration (separate routes file for 80+ platforms)
  - ✅ Master Agent integration (separate routes file for service automations)

**All production security issues are fixed:**
- ✅ JWT_SECRET required (exits if missing)
- ✅ Authentication on `/api/sync` via `requireAuth` middleware
- ✅ Input validation on auth endpoints
- ✅ Sensitive field stripping
- ✅ 10MB JSON limit (not 50MB)
- ✅ Rate limiting on AI endpoints
- ✅ Proper CORS configuration

The frontend **correctly** expects these endpoints because it connects to the production backend in deployed environments via `VITE_API_URL`.

### Recommended Actions

**For the local dev backend (`server/`):**

If this will be used by developers:
1. ✅ **Add authentication to `/api/sync`** (prevent accidents)
2. ✅ **Make `JWT_SECRET` required** (fail fast if missing)
3. ✅ **Add input validation** (catch bugs early)
4. ✅ **Strip sensitive fields** from sync (`isPremium`, `realMoneyBalance`)
5. ✅ **Document in README:** "For local dev only - production uses separate backend"

If developers should use the production backend locally:
1. **Remove `server/` directory entirely**
2. **Update README:** "Clone production backend for local development"
3. **Provide docker-compose** to run full stack locally

**For the documentation:**
- ✅ Add README section explaining split-repo architecture
- ✅ Document environment variable setup for local vs. production
- ✅ Link to production backend repository

### Summary

This audit initially appeared to find critical issues because it was comparing the local dev backend to production requirements. However, this is a **split-repository architecture** where:

- **This repo** = Frontend + simple local dev backend (4 endpoints)
- **Production backend** = Separate repository with full features (21+ endpoints verified 2026-02-14)

The architecture is **valid and intentional**. 

**Production backend status:** ✅ All security issues properly addressed (verified via direct source inspection of `https://github.com/theinjaziteam/Injazi/tree/main/service/index.js`).

**Local dev backend status:** ⚠️ Security issues present but acceptable for local development only. Recommended to fix to prevent developer confusion and accidental data corruption.

---

**Document:** 799 lines, verified against actual source code from both repositories (2026-02-14)

**End of Audit**

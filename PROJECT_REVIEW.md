# Family Hub - Comprehensive Project Review

**Date:** 2025-12-23  
**Reviewer:** AI Code Audit  
**Repository:** Bjogert/Family  

---

## Executive Summary

This document provides a comprehensive review of the Family Hub project, identifying areas for improvement, security risks, dead code, redundant implementations, and overly complicated patterns. The project is a Raspberry Pi-hosted family management web application built with Fastify (backend), SvelteKit (frontend), and PostgreSQL (database).

**Overall Assessment:** The project is functional but has several areas requiring attention, particularly around security hardening, code organization, documentation inconsistencies, and dead/redundant code.

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [Architecture & Documentation Issues](#2-architecture--documentation-issues)
3. [Dead Code & Unused Modules](#3-dead-code--unused-modules)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Overly Complicated Patterns](#5-overly-complicated-patterns)
6. [Database & Schema Issues](#6-database--schema-issues)
7. [Configuration & Environment Issues](#7-configuration--environment-issues)
8. [Missing Features & Improvements](#8-missing-features--improvements)
9. [Recommendations Summary](#9-recommendations-summary)

---

## 1. Critical Security Issues

### 1.1 🔴 CRITICAL: Google OAuth Credentials Exposed in Repository

**File:** `client_secret_812450815876-t0gpevplge8feor2u9cfj0qgvtg3dpf2.apps.googleusercontent.com.json`

**Issue:** This file contains production Google OAuth credentials including:
- `client_id`: `812450815876-t0gpevplge8feor2u9cfj0qgvtg3dpf2.apps.googleusercontent.com`
- `client_secret`: `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`

These credentials are committed directly to the repository and publicly accessible.

**Risk:** 
- Anyone with access to the repository can use these credentials to impersonate your application
- Potential for OAuth token theft and unauthorized access to Google Calendar data
- Violates Google Cloud Platform Terms of Service

**Recommendation:**
1. **IMMEDIATELY** revoke these credentials in Google Cloud Console
2. Create new OAuth credentials
3. Add `client_secret_*.json` to `.gitignore`
4. Store credentials in environment variables or secure secret management
5. Remove the file from Git history using `git filter-branch` or BFG Repo-Cleaner
6. Rotate any other potentially compromised secrets

### 1.2 🟠 Weak Password Requirements

**Files:** 
- `apps/api/src/modules/auth/routes.ts` (lines 350-353)
- `apps/api/src/modules/auth/routes.ts` (lines 474-479, 516-522)

**Issue:** Password validation only requires 4 characters minimum:
```typescript
if (!newPassword || newPassword.length < 4) {
  return reply.status(400).send({ success: false, error: 'Password must be at least 4 characters' });
}
```

**Risk:** 
- Passwords like "1234" or "pass" are accepted
- Vulnerable to brute force attacks
- No complexity requirements (uppercase, numbers, special characters)

**Recommendation:**
- Increase minimum password length to at least 8-12 characters
- Add password complexity requirements or use a password strength library like `zxcvbn`
- Consider implementing rate limiting on password reset and login attempts

### 1.3 🟠 Session Cookies Not Always Secure in Production

**File:** `apps/api/src/modules/auth/routes.ts` (line 57)

**Issue:** Session cookies are only marked as `secure` when `NODE_ENV === 'production'`:
```typescript
secure: process.env.NODE_ENV === 'production',
```

However, the config uses `config.isDev` elsewhere. Inconsistent environment checking could lead to insecure cookies in production.

**Recommendation:**
- Use consistent environment checking: `secure: !config.isDev`
- Always set `secure: true` for production deployments
- Consider using SameSite='strict' for additional CSRF protection

### 1.4 🟠 Missing CSRF Protection

**Issue:** No CSRF token implementation for state-changing operations.

**Risk:** 
- Vulnerable to Cross-Site Request Forgery attacks
- Attackers could trick authenticated users into performing unwanted actions

**Recommendation:**
- Implement CSRF tokens for POST/PUT/DELETE requests
- Use `@fastify/csrf-protection` plugin
- Add CSRF token validation middleware

### 1.5 🟠 No Rate Limiting

**Issue:** No rate limiting on authentication endpoints or API routes.

**Risk:**
- Vulnerable to brute force attacks on login/password reset
- Potential for DoS attacks
- API abuse

**Recommendation:**
- Implement rate limiting using `@fastify/rate-limit`
- Apply strict limits on `/api/auth/login`, `/api/auth/forgot-password`
- Consider IP-based and session-based rate limiting

### 1.6 🟡 Debug Logging in Production

**Files:** Multiple files contain `console.log` statements:
- `apps/api/src/modules/auth/routes.ts` (lines 133-134, 144)
- `apps/api/src/modules/auth/repository.ts` (lines 240, 247)
- Multiple files in `modules/googleCalendar/`, `modules/tasks/`, etc.

**Issue:** Debug console.log statements leak sensitive information and should not run in production.

Example:
```typescript
console.log('[DELETE USER] sessionId:', sessionId ? sessionId.substring(0, 10) + '...' : 'MISSING');
console.log('[CREATE SESSION] Creating session:', { id: id.substring(0, 10), familyId, userId });
```

**Risk:**
- Session IDs and user data logged to console
- Performance overhead
- Difficulty troubleshooting in production

**Recommendation:**
- Remove all `console.log` statements
- Use the existing `logger` utility consistently
- Add a linter rule to prevent console statements (e.g., `no-console` ESLint rule)

### 1.7 🟡 Error Messages May Leak Information

**File:** `apps/api/src/app.ts` (lines 93-110)

**Issue:** Error handler returns full error messages in development, but the condition checking could fail silently.

**Recommendation:**
- Ensure production error handling never exposes stack traces
- Log detailed errors server-side but return generic messages to client
- Add structured error codes instead of free-text messages

### 1.8 🟡 No Input Sanitization for XSS Prevention

**Issue:** No evidence of HTML sanitization for user-generated content (grocery names, bulletin notes, etc.)

**Risk:**
- Potential XSS attacks through stored content
- Especially risky in bulletin notes with HTML content

**Recommendation:**
- Sanitize all user input before storage
- Use libraries like `DOMPurify` on the frontend
- Implement Content Security Policy (CSP) headers

---

## 2. Architecture & Documentation Issues

### 2.1 🟡 Documentation Inconsistency: SQLite vs PostgreSQL

**Files:**
- `README.md` line 12: Claims to use "SQLite (better-sqlite3)"
- `CLAUDE.md` line 25: Claims "SQLite + better-sqlite3"
- Actual implementation: PostgreSQL (apps/api/src/db/index.ts)

**Issue:** Documentation is outdated and misleading.

**Recommendation:**
- Update README.md and CLAUDE.md to reflect PostgreSQL
- Remove any SQLite references
- Add migration notes explaining the switch

### 2.2 🟡 Multiple Schema Definitions

**Files:**
- `apps/api/src/db/index.ts` - Creates tables programmatically (271 lines)
- `apps/api/src/db/schema.sql` - Partial SQL schema (only sessions table)
- `create_tables.sql` - Additional tables (activities, tasks)
- `scripts/*.sql` - Migration scripts for various features

**Issue:** Schema is fragmented across multiple files with no clear migration strategy.

**Recommendation:**
- Consolidate schema into a single source of truth
- Implement proper database migration tool (e.g., `node-pg-migrate`, `knex`, or `Prisma`)
- Remove programmatic table creation from application startup code
- Separate schema initialization from application code

### 2.3 🟡 Hardcoded Family Data

**File:** `apps/api/src/db/index.ts` (lines 186-229)

**Issue:** Default family "Familjen Wiesel" and users (robert, julia, tore) are hardcoded and auto-created.

**Risk:**
- Not suitable for multi-tenant deployment
- Seed data mixed with schema initialization
- Difficult to customize for different deployments

**Recommendation:**
- Move seed data to separate seeding script
- Make default family creation optional via environment variable
- Provide proper migration/seed tooling

### 2.4 🟡 Inconsistent Module Patterns

**Issue:** Some modules have `index.ts` exports, others don't:
- `modules/bulletin/index.ts` - Exports routes
- `modules/groceries/index.ts` - Exports routes
- `modules/push/index.ts` - Exports routes and init function
- `modules/auth/` - No index.ts
- `modules/families/` - No index.ts

**Recommendation:**
- Standardize on either using index.ts for all modules or none
- Create consistent export patterns

---

## 3. Dead Code & Unused Modules

### 3.1 🟢 Unused Routes and Pages

**Frontend Routes with No Backend:**
- `apps/web/src/routes/forgot-password/+page.svelte` - References `/api/auth/forgot-password`
- `apps/web/src/routes/reset-password/+page.svelte` - References `/api/auth/reset-password`
- `apps/web/src/routes/verify-email/+page.svelte` - References `/api/auth/verify-email`

**Analysis:** These routes exist but may not be fully functional:
- Email service is disabled by default (`EMAIL_ENABLED=false`)
- Email functionality requires SMTP configuration
- Users table has email columns but they're not populated in seed data

**Status:** Not dead code, but incomplete feature requiring email setup.

### 3.2 🟢 Unused Database Columns

**File:** `apps/api/src/db/index.ts`

**Issue:** Several user table columns added via migration but not consistently used:
- `role` - Added but no role-based access control implemented
- `email`, `email_verified`, `email_verification_token` - Email system not enabled
- `password_reset_token`, `password_reset_expires` - Password reset not fully integrated

**Recommendation:**
- Document which features are planned vs implemented
- Remove unused columns if features are not planned
- Complete email verification and password reset features

### 3.3 🟢 Orphaned Schema Files

**Files:**
- `apps/api/src/db/schema.sql` - Only defines sessions table (incomplete)
- `create_tables.sql` - Defines activities/tasks tables but these are created in `db/index.ts`

**Issue:** Duplicate/redundant schema definitions.

**Recommendation:**
- Remove redundant SQL files
- Use single source of truth for schema

### 3.4 🟢 Unused WebSocket Message Types

**File:** `apps/api/src/websocket/routes.ts` (lines 60-67)

**Issue:** WebSocket handler has a `subscribe` message type that does nothing:
```typescript
case 'subscribe':
  // Future: handle channel subscriptions
  logger.debug('Client subscribed', { channel: message.payload });
  break;
```

**Recommendation:**
- Remove unimplemented message types
- Add TODO comment if this is planned functionality

---

## 4. Code Quality Issues

### 4.1 🟡 Mixed Error Handling Patterns

**Issue:** Inconsistent error handling across the codebase:
- Some functions use try/catch with logger
- Some use .catch() on promises
- Some log with console.error, some with logger.error
- Error responses have inconsistent structure

**Examples:**
```typescript
// Pattern 1: try/catch (good)
try { ... } catch (error) { logger.error(...) }

// Pattern 2: .catch() on async
await sendNotification().catch((error) => console.error(...))

// Pattern 3: No error handling
const result = await someAsyncFunction();
```

**Recommendation:**
- Standardize on try/catch with proper logging
- Create error handling utilities/middleware
- Define standard error response format

### 4.2 🟡 Lack of Input Validation

**Issue:** Many routes don't use Zod schema validation despite having shared schemas.

**Examples:**
- Bulletin routes use `CreateBulletinNoteInput` type but don't validate with Zod
- Auth routes manually check fields instead of using schemas
- Inconsistent validation between routes

**Recommendation:**
- Use Zod schemas consistently for request validation
- Add Fastify schema validation using Zod
- Create validation middleware

### 4.3 🟡 Type Safety Issues

**Issue:** Excessive use of `any` type and type assertions:
- `apps/api/src/modules/auth/middleware.ts` (lines 37-45) uses `(request as any)`
- Multiple files use `(error as Error)` casting without verification

**Recommendation:**
- Define proper TypeScript interfaces for extended Request types
- Use Fastify's type generics properly
- Avoid `any` type

### 4.4 🟡 No Tests

**Issue:** Zero test files found in the repository.

**Recommendation:**
- Add unit tests for business logic (services)
- Add integration tests for API endpoints
- Add frontend component tests
- Set up CI/CD with test running
- Minimum 70% code coverage for critical paths

### 4.5 🟡 Inconsistent Naming Conventions

**Issue:** Mixed naming styles:
- Some files use `camelCase.ts`
- Some routes use `snake_case` for columns but `camelCase` for JS
- Inconsistent between `display_name` (DB) and `displayName` (TS)

**Recommendation:**
- Use camelCase for TypeScript/JavaScript
- Use snake_case for database columns
- Be consistent with conversions between layers

---

## 5. Overly Complicated Patterns

### 5.1 🟡 Database Initialization in Application Code

**File:** `apps/api/src/db/index.ts` (271 lines)

**Issue:** The `initDatabase()` function is massive and does too much:
- Creates tables
- Handles migrations
- Seeds default data
- Catches errors inconsistently
- Runs on every application startup

**Problems:**
- Schema changes require code changes
- Difficult to test
- No rollback capability
- Slow application startup
- Risk of data corruption

**Recommendation:**
- Extract schema to SQL migration files
- Use a proper migration tool (Knex, Prisma, or node-pg-migrate)
- Separate initialization from application bootstrap
- Run migrations as a separate step in deployment

### 5.2 🟡 Dual Configuration Pattern

**File:** `apps/api/src/config.ts` (lines 6-10)

**Issue:** Config tries to load .env from multiple locations:
```typescript
dotenvConfig({ path: resolve(__dirname, '../.env') }); // apps/api/.env
dotenvConfig({ path: resolve(__dirname, '../../../.env') }); // project root .env
```

**Problem:** 
- Unclear which config takes precedence
- Hard to debug configuration issues
- Multiple sources of truth

**Recommendation:**
- Load .env only from project root
- Use environment variable `NODE_ENV` to determine which env file to load
- Document the configuration loading order

### 5.3 🟡 WebSocket Connection Manager Singleton

**File:** `apps/api/src/websocket/connectionManager.ts`

**Issue:** Uses singleton pattern which makes testing difficult and creates hidden dependencies.

**Recommendation:**
- Inject connection manager as dependency
- Make it testable by avoiding singleton pattern
- Consider using Fastify decorators instead

### 5.4 🟡 Manual SQL String Construction

**Issue:** All database queries use manual SQL string construction instead of query builder.

**Risk:**
- More prone to SQL injection (though parameterized queries are used)
- Difficult to maintain
- No type safety on queries

**Recommendation:**
- Consider using an ORM (Prisma, TypeORM) or query builder (Knex)
- At minimum, create SQL template utilities
- Use TypeScript to enforce query result types

---

## 6. Database & Schema Issues

### 6.1 🟡 Missing Indexes

**Issue:** Several foreign key columns lack indexes:
- `bulletin_notes` table (if it exists) may lack family_id index
- `push_subscriptions.user_id` has index but could benefit from composite indexes
- Missing indexes on frequently queried columns

**Recommendation:**
- Add indexes on all foreign keys
- Add composite indexes for common query patterns
- Analyze query performance and add appropriate indexes

### 6.2 🟡 No Database Backup Strategy

**Issue:** No evidence of backup scripts or procedures.

**Recommendation:**
- Implement automated database backups
- Document backup and restore procedures
- Test restore process regularly

### 6.3 🟡 Inconsistent ON DELETE Behavior

**Issue:** Some foreign keys use `ON DELETE CASCADE`, others use `ON DELETE SET NULL`, without clear reasoning.

**Examples:**
- `groceries.family_id` - CASCADE (deleting family deletes all groceries) ✓
- `groceries.added_by` - No cascade specified (defaults to RESTRICT)
- `activities.transport_user_id` - SET NULL ✓

**Recommendation:**
- Document the expected cascade behavior
- Ensure consistency based on business logic
- Add comments explaining cascade choices

### 6.4 🟡 Missing Audit Fields

**Issue:** No audit trail for data changes (who modified, when).

**Recommendation:**
- Add `updated_by` columns where appropriate
- Consider implementing audit log table
- Track data history for compliance

---

## 7. Configuration & Environment Issues

### 7.1 🟡 Default Secrets in Code

**File:** `apps/api/src/config.ts`

**Issue:** Development secrets are hardcoded as defaults:
```typescript
sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars!!',
```

**Risk:**
- Developers might forget to change these in production
- Validation only checks if env vars exist in production, not their values

**Recommendation:**
- Fail fast if required secrets are not set (even in development)
- Remove default values for security-critical config
- Add startup validation for secret strength

### 7.2 🟡 Hardcoded IP Address in Deployment Script

**File:** `scripts/deploy.ps1` (line 9)

**Issue:** Raspberry Pi IP is hardcoded: `$PI_HOST = "robert@192.168.68.127"`

**Recommendation:**
- Move to environment variable or config file
- Document deployment setup
- Consider DNS name instead of IP

### 7.3 🟡 CORS Configuration Too Permissive

**File:** `apps/api/src/config.ts` (line 22)

**Issue:** CORS origin is set to `true` which reflects any request origin:
```typescript
corsOrigin: process.env.CORS_ORIGIN || true,
```

**Risk:**
- Allows any origin to make credentialed requests
- Vulnerable to CORS attacks

**Recommendation:**
- Whitelist specific origins
- Use environment variable for allowed origins
- Never use `true` in production

---

## 8. Missing Features & Improvements

### 8.1 Missing Monitoring and Logging

**Issue:** No application monitoring, metrics, or centralized logging.

**Recommendation:**
- Add application monitoring (e.g., Prometheus metrics)
- Implement structured logging
- Set up error tracking (e.g., Sentry)
- Add health check endpoints

### 8.2 No API Documentation

**Issue:** No OpenAPI/Swagger documentation for API endpoints.

**Recommendation:**
- Generate OpenAPI documentation from Zod schemas
- Use `@fastify/swagger` plugin
- Document all endpoints, request/response formats

### 8.3 Missing Deployment Documentation

**Issue:** No documentation for:
- How to set up PostgreSQL
- How to run migrations
- How to configure systemd services
- How to set up Caddy reverse proxy

**Recommendation:**
- Create comprehensive deployment guide
- Document all infrastructure requirements
- Add troubleshooting section

### 8.4 No CI/CD Pipeline

**Issue:** No automated testing, linting, or deployment pipeline.

**Recommendation:**
- Set up GitHub Actions for CI/CD
- Run tests, linting, type checking on PRs
- Automate deployment to production

### 8.5 No Dependency Vulnerability Scanning

**Issue:** No automated dependency scanning for security vulnerabilities.

**Recommendation:**
- Enable GitHub Dependabot
- Add `npm audit` / `pnpm audit` to CI pipeline
- Regularly update dependencies

---

## 9. Recommendations Summary

### Immediate Actions (Critical)

1. **REVOKE AND ROTATE** Google OAuth credentials exposed in repository
2. **REMOVE** `client_secret_*.json` from Git history
3. **ADD** `client_secret_*.json` to `.gitignore`
4. **IMPLEMENT** rate limiting on authentication endpoints
5. **REMOVE** all console.log statements and use logger consistently

### High Priority (Security)

1. Strengthen password requirements (min 8-12 chars, complexity)
2. Implement CSRF protection
3. Add input sanitization for XSS prevention
4. Fix CORS configuration to whitelist specific origins
5. Ensure session cookies are always secure in production

### High Priority (Code Quality)

1. Implement proper database migration system
2. Add unit and integration tests
3. Update documentation to reflect PostgreSQL
4. Standardize error handling patterns
5. Remove dead code and unused schema files

### Medium Priority

1. Consolidate schema definitions
2. Add API documentation (OpenAPI/Swagger)
3. Implement proper TypeScript types (avoid `any`)
4. Add monitoring and logging infrastructure
5. Set up CI/CD pipeline

### Low Priority (Improvements)

1. Use query builder or ORM for type safety
2. Implement audit logging
3. Add database backup strategy
4. Create deployment documentation
5. Standardize module export patterns

---

## Conclusion

The Family Hub project is functional but requires significant security hardening before being considered production-ready. The most critical issue is the exposed Google OAuth credentials which must be addressed immediately. 

The codebase would benefit from:
- Better separation of concerns (schema, migrations, seed data)
- Consistent patterns and conventions
- Comprehensive testing
- Security hardening
- Proper documentation

With these improvements, the project would be more maintainable, secure, and scalable for future development.

---

**Review completed:** 2025-12-23  
**Files reviewed:** 85+ TypeScript and Svelte files  
**Issues identified:** 40+ across security, architecture, code quality, and documentation

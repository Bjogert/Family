# Email & GDPR Implementation Plan

## Overview
Add email functionality for parents and GDPR compliance for a future public SaaS launch.

## Phase 1: Database & Types
- [ ] Add `email` column to `users` table (nullable, unique for non-null)
- [ ] Add `email_verified` boolean column
- [ ] Add `email_verification_token` column
- [ ] Add `email_verification_expires` column
- [ ] Add `password_reset_token` column
- [ ] Add `password_reset_expires` column
- [ ] Update shared User type to include email fields

## Phase 2: Email Service Setup
- [ ] Create email service module (using nodemailer or similar)
- [ ] Configure SMTP settings (Gmail, SendGrid, or Resend)
- [ ] Create email templates:
  - [ ] Email verification template (Swedish)
  - [ ] Password reset template (Swedish)
- [ ] Add environment variables for email config

## Phase 3: API Endpoints
- [ ] `POST /api/auth/verify-email` - Send verification email
- [ ] `GET /api/auth/verify-email/:token` - Verify email with token
- [ ] `POST /api/auth/forgot-password` - Request password reset
- [ ] `POST /api/auth/reset-password` - Reset password with token
- [ ] `GET /api/users/me/data` - Export user data (GDPR)
- [ ] `DELETE /api/users/me` - Delete account (GDPR)
- [ ] Update user creation to accept email

## Phase 4: Frontend - User Management
- [ ] Update signup/edit user form:
  - [ ] Email field (required for pappa/mamma, hidden for barn/bebis)
  - [ ] Show verification status badge
- [ ] Add "Skicka verifieringsmail" button
- [ ] Add email verification success page

## Phase 5: Frontend - Password Reset
- [ ] Create "Glömt lösenord?" link on login page
- [ ] Create forgot password page (`/forgot-password`)
- [ ] Create reset password page (`/reset-password/:token`)

## Phase 6: Frontend - GDPR/Privacy
- [ ] Create privacy policy page (`/privacy` or `/integritetspolicy`)
- [ ] Create account settings page with:
  - [ ] Export my data button
  - [ ] Delete my account button
- [ ] Add consent checkbox at signup: "Jag godkänner integritetspolicyn"

## Phase 7: Privacy Policy Content
Swedish privacy policy covering:
- [ ] What data we collect (name, email, activities, etc.)
- [ ] Why we collect it (to run the service)
- [ ] How long we store it (until account deletion)
- [ ] User rights (access, export, delete)
- [ ] Contact information
- [ ] Cookie information (we don't use tracking cookies)

## Technical Details

### Email Service Options
1. **Gmail SMTP** - Free for low volume, easy setup
2. **Resend** - Developer-friendly, generous free tier
3. **SendGrid** - Established, 100 emails/day free

**Recommendation:** Start with Resend (simple API, good free tier)

### Database Changes
```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMPTZ;
```

### Environment Variables
```
EMAIL_SERVICE=resend  # or smtp
EMAIL_FROM=noreply@familjehubben.vip
RESEND_API_KEY=re_xxx  # if using Resend
# OR for SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
```

## Estimated Effort
- Phase 1: 30 min
- Phase 2: 1 hour
- Phase 3: 1.5 hours
- Phase 4: 1 hour
- Phase 5: 45 min
- Phase 6: 1 hour
- Phase 7: 30 min

**Total: ~6-7 hours** (2-3 sessions)

## Questions to Resolve
1. Which email service do you want to use? (Recommend: Resend)
2. Do you have a domain email set up for `@familjehubben.vip`?
3. Do you want email notifications for activities later? (Can add later)

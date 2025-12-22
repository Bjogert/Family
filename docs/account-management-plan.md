# Account Management Features Plan

## Overview
This document outlines the implementation plan for three account management features:
1. Account/Family deletion
2. Password recovery via email
3. Simplified member password UI (optional passwords hidden by default)

---

## 1. Account/Family Deletion

### Requirements
- Family admins can delete the entire family (and all members)
- Individual members can be removed from a family
- Confirmation required before deletion
- All related data should be cleaned up (grocery lists, calendar events, etc.)

### Implementation Steps

#### Backend (API)
1. **Add DELETE endpoint for families**
   - `DELETE /api/families/:familyId` - Delete entire family
   - Requires family password verification
   - Cascades to delete all:
     - Family members (users)
     - Grocery lists and items
     - Calendar events
     - Any other family-related data

2. **Add DELETE endpoint for individual members**
   - `DELETE /api/families/:familyId/users/:userId`
   - Only family admin or the user themselves can delete

3. **Database changes**
   - Ensure foreign keys have `ON DELETE CASCADE`
   - Or handle cleanup manually in transaction

#### Frontend (Web)
1. **Family Settings Page** (new page: `/settings`)
   - "Delete Family" button (danger zone)
   - Requires password confirmation
   - Shows warning about data loss

2. **Member Management**
   - Add "Remove member" option in family settings
   - Confirmation modal

### Files to Modify
- `apps/api/src/routes/families.ts` - Add DELETE endpoints
- `apps/web/src/routes/settings/+page.svelte` - New settings page
- `apps/web/src/routes/+layout.svelte` - Add settings link to menu

---

## 2. Password Recovery via Email

### Requirements
- Users can request password reset
- Email sent with secure reset link
- Reset link expires after 1 hour
- Works for both family passwords and individual member passwords

### Implementation Steps

#### Database
1. **Add email field to families table**
   ```sql
   ALTER TABLE families ADD COLUMN email VARCHAR(255);
   ```

2. **Add password_reset_tokens table**
   ```sql
   CREATE TABLE password_reset_tokens (
     id SERIAL PRIMARY KEY,
     family_id INTEGER REFERENCES families(id),
     user_id INTEGER REFERENCES users(id),  -- NULL for family password reset
     token VARCHAR(64) UNIQUE NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     used BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

#### Backend (API)
1. **Email service setup**
   - Use nodemailer with SMTP (Gmail, SendGrid, or similar)
   - Add to `.env`:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=app-specific-password
     EMAIL_FROM=noreply@familjehubben.vip
     ```

2. **New API endpoints**
   - `POST /api/auth/forgot-password` - Request reset email
     - Input: `{ email: string, type: 'family' | 'member' }`
     - Generates secure token, stores in DB, sends email
   
   - `POST /api/auth/reset-password` - Reset with token
     - Input: `{ token: string, newPassword: string }`
     - Validates token, updates password, marks token used

3. **Email templates**
   - Create HTML email template for password reset
   - Include reset link: `https://familjehubben.vip/reset-password?token=xxx`

#### Frontend (Web)
1. **Add email field to family creation**
   - Optional but recommended
   - Show on welcome page when creating family

2. **Forgot Password page** (`/forgot-password`)
   - Email input
   - "Send reset link" button
   - Success message

3. **Reset Password page** (`/reset-password`)
   - Token from URL
   - New password input
   - Confirm password input

### Files to Create
- `apps/api/src/services/email.ts` - Email service
- `apps/api/src/routes/auth.ts` - Password reset endpoints
- `apps/web/src/routes/forgot-password/+page.svelte`
- `apps/web/src/routes/reset-password/+page.svelte`

### Files to Modify
- `apps/api/src/db/schema.sql` - Add tables
- `apps/web/src/routes/welcome/+page.svelte` - Add email to family creation
- `apps/web/src/routes/login/[familyId]/+page.svelte` - Add "Forgot password?" link

---

## 3. Simplified Member Password UI

### Requirements
- Default: No password for individual members
- Password option hidden by default
- Small "Add password" button to reveal password field
- Clean, uncluttered UI

### Implementation Steps

#### Frontend Changes Only
1. **Family Creation (Welcome page)**
   - Hide password field for members by default
   - Add small link: "🔒 Add password (optional)"
   - When clicked, show password field
   - Can collapse again if empty

2. **Member Selection (Login page)**
   - If member has no password, log in immediately on click
   - If member has password, show password prompt
   - Remove "Password (optional)" label confusion

### UI Mockup

**Before (current):**
```
Member Name: [___________]
Password:    [___________] (optional)
Display:     [___________]
```

**After (improved):**
```
Member Name: [___________]
Display:     [___________]
            [+ Add password]  ← small text link

When clicked:
Member Name: [___________]
Display:     [___________]
Password:    [___________]  👁
            [- Remove password]
```

### Files to Modify
- `apps/web/src/routes/welcome/+page.svelte` - Update member creation UI

---

## Implementation Priority

### Phase 1 (Quick wins) ⚡
- [x] Loading spinners (done!)
- [ ] **Simplified member password UI** - Frontend only, ~30 min

### Phase 2 (Medium effort) 🔧
- [ ] **Account deletion** - Backend + Frontend, ~2 hours
  - Delete family
  - Delete individual members

### Phase 3 (Larger effort) 📧
- [ ] **Password recovery via email** - ~4 hours
  - Database changes
  - Email service setup
  - API endpoints
  - Frontend pages
  - Email templates

---

## Questions to Clarify

1. **Email provider**: Which email service should we use?
   - Gmail (free, easy, but rate limited)
   - SendGrid (free tier: 100 emails/day)
   - Mailgun
   - Self-hosted SMTP on Pi?

2. **Who owns the family?**
   - Should there be a "family admin" concept?
   - Or can any member delete the family with the family password?

3. **Data export before deletion?**
   - Should users be able to export their data before deleting?

---

## Next Steps

1. ✅ Review this plan
2. Start with **Phase 1** - Simplified member password UI
3. Then implement **Phase 2** - Account deletion
4. Finally **Phase 3** - Email password recovery

Let me know which feature you'd like to start with!

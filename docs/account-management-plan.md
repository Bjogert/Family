# Account Management & User Profile Enhancement Plan

## Overview
This document outlines the implementation plan for enhanced user profiles and account management:
1. **Enhanced User Profiles** - Role, birthday, gender, avatar, color, nicknames
2. **Improved Family Creation** - Password confirmation, better member forms
3. Account/Family deletion
4. Password recovery via email

---

## 1. Enhanced User Profiles & Family Creation

### Requirements
- **Password Confirmation**: Two matching password fields for family password
- **Single Name Field**: First name only (no last name - family name serves as last name)
- **Family Roles**: Pappa, Mamma, Barn, Bebis, etc.
- **Birthday**: Full date (YYYY-MM-DD) for auto-age calculation
- **Gender**: For children (optional for parents)
- **Avatar**: Emoji selector for profile picture
- **Color Preference**: Personal color for UI distinction (calendar, grocery lists, etc.)
- **Display Name/Nickname**: 
  - Parents: Dropdown with role-based options (Far/Pappa/Farsan for Pappa, Mor/Mamma/Morsan for Mamma)
  - Children: Use first name or custom nickname

### Database Schema Changes

#### Update `users` table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS color VARCHAR(20);
-- display_name already exists, will be used for nicknames
```

**User Roles:**
- `pappa` - Father
- `mamma` - Mother
- `barn` - Child
- `bebis` - Baby
- `annan` - Other

**Colors (Pastel Earthy Palette):**
- `orange` - Orange tones
- `amber` - Amber/yellow tones
- `rose` - Pink/rose tones
- `green` - Green tones
- `blue` - Blue tones
- `purple` - Purple tones
- `stone` - Gray/neutral tones

### Implementation Steps

#### 1. Backend (API)

**Files to Modify:**
- `apps/api/src/db/index.ts` - Add new columns to users table
- `packages/shared/src/types/auth.ts` - Update User type
- `packages/shared/src/schemas/auth.ts` - Add validation for new fields
- `apps/api/src/modules/auth/repository.ts` - Include new fields in queries
- `apps/api/src/modules/auth/service.ts` - Handle new fields in user creation
- `apps/api/src/modules/families/repository.ts` - Return new fields for family members

**New Type Definition:**
```typescript
interface User {
  id: number;
  familyId: number;
  username: string;
  displayName: string;
  role?: 'pappa' | 'mamma' | 'barn' | 'bebis' | 'annan';
  birthday?: Date;
  gender?: 'pojke' | 'flicka' | 'annat';
  avatarEmoji?: string;
  color?: string;
  hasPassword: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
```

**Validation Schema:**
```typescript
createUserSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(4).optional(),
  displayName: z.string().min(1).max(100),
  role: z.enum(['pappa', 'mamma', 'barn', 'bebis', 'annan']).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['pojke', 'flicka', 'annat']).optional(),
  avatarEmoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});
```

#### 2. Frontend (Web)

**Create Reusable Components:**

1. **`EmojiPicker.svelte`** - Emoji selector component
   - Categories: Faces (😀😃😄😁), Animals (🐶🐱🐭🐹), Objects (⚽🎨🎮🎸)
   - Simple grid layout with click selection
   - Store selected emoji as string

2. **`ColorPicker.svelte`** - Color selector component
   - Predefined pastel earthy colors matching theme
   - Visual color swatches with selection indicator
   - Store color name (not hex)

3. **`NicknameDropdown.svelte`** - Role-based nickname selector
   - For Pappa: Far, Pappa, Farsan, Papa, Paps
   - For Mamma: Mor, Mamma, Morsan, Mama, Mams
   - For Barn/Bebis: Use first name or custom input
   - Allow custom entry

**Update Welcome Page (`apps/web/src/routes/welcome/+page.svelte`):**

**Family Password Section:**
```svelte
<label>Familjens Lösenord</label>
<input type="password" bind:value={familyPassword} />

<label>Bekräfta Lösenord</label>
<input type="password" bind:value={familyPasswordConfirm} />
{#if familyPassword !== familyPasswordConfirm}
  <span class="error">Lösenorden matchar inte</span>
{/if}
```

**Member Creation Form:**
```svelte
<label>Förnamn</label>
<input type="text" bind:value={member.name} />

<label>Familjeroll</label>
<select bind:value={member.role}>
  <option value="pappa">👨 Pappa</option>
  <option value="mamma">👩 Mamma</option>
  <option value="barn">🧒 Barn</option>
  <option value="bebis">👶 Bebis</option>
  <option value="annan">🙂 Annan</option>
</select>

<label>Födelsedatum</label>
<input type="date" bind:value={member.birthday} />

{#if member.role === 'barn' || member.role === 'bebis'}
  <label>Kön</label>
  <select bind:value={member.gender}>
    <option value="">Välj...</option>
    <option value="pojke">Pojke</option>
    <option value="flicka">Flicka</option>
    <option value="annat">Annat</option>
  </select>
{/if}

<label>Avatar</label>
<EmojiPicker bind:selected={member.avatarEmoji} />

<label>Färg</label>
<ColorPicker bind:selected={member.color} />

<label>Visningsnamn/Smeknamn</label>
{#if member.role === 'pappa' || member.role === 'mamma'}
  <NicknameDropdown role={member.role} bind:value={member.displayName} />
{:else}
  <input type="text" bind:value={member.displayName} placeholder={member.name} />
{/if}

<details>
  <summary class="text-sm text-stone-500">🔒 Lägg till lösenord (valfritt)</summary>
  <label>Lösenord</label>
  <input type="password" bind:value={member.password} />
  <label>Bekräfta Lösenord</label>
  <input type="password" bind:value={member.passwordConfirm} />
  {#if member.password !== member.passwordConfirm}
    <span class="error">Lösenorden matchar inte</span>
  {/if}
</details>
```

**Update Login Page (`apps/web/src/routes/login/[familyId]/+page.svelte`):**
- Display avatar emoji in member cards
- Show color as border or background accent
- Display nickname (displayName) prominently
- Calculate and show age from birthday

**Update Navigation Header (`apps/web/src/routes/+layout.svelte`):**
- Show logged-in user's emoji avatar
- Use user's color for accent/border
- Display nickname instead of username

### Files to Create
- `apps/web/src/lib/components/EmojiPicker.svelte`
- `apps/web/src/lib/components/ColorPicker.svelte`
- `apps/web/src/lib/components/NicknameDropdown.svelte`

### Files to Modify
- `apps/api/src/db/index.ts`
- `packages/shared/src/types/auth.ts`
- `packages/shared/src/schemas/auth.ts`
- `apps/api/src/modules/auth/repository.ts`
- `apps/api/src/modules/auth/service.ts`
- `apps/api/src/modules/families/repository.ts`
- `apps/web/src/routes/welcome/+page.svelte`
- `apps/web/src/routes/login/[familyId]/+page.svelte`
- `apps/web/src/routes/+layout.svelte`

---

## 2. Account/Family Deletion

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

## 3. Password Recovery via Email

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

## 4. Simplified Member Password UI (COMPLETED ✅)

### Requirements
- Default: No password for individual members
- Password option hidden by default
- Small "Add password" button to reveal password field
- Clean, uncluttered UI

**Status: ✅ Completed in earlier sessions**

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

### Phase 1 (Enhanced User Profiles) 🎨 **← START HERE**
- [ ] **Update database schema** - Add role, birthday, gender, avatar_emoji, color columns
- [ ] **Update backend types and schemas** - TypeScript types, Zod validation
- [ ] **Update repositories and services** - Handle new fields in queries/creation
- [ ] **Create EmojiPicker component** - Simple emoji selector
- [ ] **Create ColorPicker component** - Pastel earthy color swatches
- [ ] **Create NicknameDropdown component** - Role-based nickname options
- [ ] **Update welcome page** - Password confirmation, enhanced member form
- [ ] **Update login page** - Show avatars, colors, nicknames, ages
- [ ] **Update navigation header** - Display user avatar and color
- [ ] **Test and deploy** - Verify all features work correctly

**Estimated Time:** ~3-4 hours

### Phase 2 (Account Deletion) 🔧
- [ ] **Account deletion** - Backend + Frontend, ~2 hours
  - Delete family
  - Delete individual members

### Phase 3 (Password Recovery) 📧
- [ ] **Password recovery via email** - ~4 hours
  - Database changes
  - Email service setup
  - API endpoints
  - Frontend pages
  - Email templates

### Phase 4 (Loading Spinners) ⚡
- [x] ✅ Loading spinners (DONE!)

### Phase 5 (Simplified Passwords) ⚡
- [x] ✅ Simplified member password UI (DONE!)

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

1. ✅ Review and update this plan with enhanced user profile requirements
2. **START: Phase 1 - Enhanced User Profiles** (database → backend → components → pages)
3. Then implement Phase 2 - Account deletion
4. Finally Phase 3 - Email password recovery

**Current Focus: Phase 1 - Enhanced User Profiles**
- Adds personalization and better UX to family member management
- Foundation for future features (calendar color coding, avatar displays, etc.)
- Makes the app feel more personal and family-oriented

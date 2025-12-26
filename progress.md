# Family Hub - Progress Tracker

> Track what's done, what's in progress, and what's next.

---

## Current Phase: Phase 2 - Groceries CRUD

### Status: ✅ Phase 2a Complete - Basic CRUD

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Phases Complete | 7/8 |
| Current Phase | PWA Install Banner |
| Blockers | None |
| Public URL | https://familjehubben.vip |

---

## Active Development Plan

See [Plan.md](Plan.md) for the full roadmap with detailed task breakdowns in `/plans/` directory.

**Current Focus:** [01-StartScreen.md](plans/01-StartScreen.md) - PWA Install Banner

---

## Phase Progress

### ✅ Pre-Planning
- [x] Define requirements and constraints
- [x] Choose tech stack
- [x] Design architecture
- [x] Create ProjectPlan.md
- [x] Create progress.md

### ✅ Phase 0: Project Setup (Foundation)
> **Goal:** Empty project that runs - COMPLETE

- [x] Initialize pnpm monorepo workspace
- [x] Set up root package.json and workspace config
- [x] Create shared package with TypeScript config
- [x] Create API app (Fastify hello world)
- [x] Create web app (SvelteKit hello world)
- [x] Set up shared TypeScript configs
- [x] Create .env.example
- [x] Test: both apps start and show hello world

**Notes:**
- Switched from SQLite to PostgreSQL due to native compilation issues with Node 24
- Both apps running on localhost:3000 (web) and localhost:3001 (api)
- Database: PostgreSQL 17.7 at localhost:5432
- Database credentials: family_hub/familyhub123

---

### ✅ Phase 0.5: Multi-Family System (Foundation Enhancement)
> **Goal:** Enable multiple families to use same app instance - COMPLETE

- [x] Create families table to PostgreSQL
- [x] Modify users table to reference family_id
- [x] Modify sessions table to reference family_id
- [x] Modify groceries table to reference family_id
- [x] Update auth service to handle family context
- [x] Update auth repository with family-aware queries
- [x] Create families module with repository, service, routes
- [x] Implement family endpoints:
  - [x] GET /api/families - List all families
  - [x] POST /api/families - Create new family
  - [x] GET /api/families/:id - Get family details
  - [x] GET /api/families/search?search=term - Search families
- [x] Create welcome page (family selection/creation)
- [x] Update login page to be family-specific (/login/:familyId)
- [x] Update auth store to include family context
- [x] Update navigation header to show family name
- [x] Update redirect flow: Welcome → Family Select → Family Login → App

**Files created:**
- `apps/api/src/modules/families/repository.ts` - Family data access
- `apps/api/src/modules/families/service.ts` - Family business logic
- `apps/api/src/modules/families/routes.ts` - Family endpoints
- `apps/web/src/routes/welcome/+page.svelte` - Welcome/family selection page

**Files modified:**
- `apps/api/src/db/index.ts` - Added families table and family_id to users/sessions/groceries
- `apps/api/src/modules/auth/repository.ts` - Family-aware user queries
- `apps/api/src/modules/auth/service.ts` - Family context in login
- `apps/api/src/modules/auth/routes.ts` - Family support in login/status
- `apps/api/src/modules/auth/middleware.ts` - Family data attachment
- `apps/api/src/app.ts` - Registered families routes
- `apps/web/src/lib/stores/auth.ts` - Added currentFamily store
- `apps/web/src/routes/login/+page.svelte` - Family-specific login
- `apps/web/src/routes/+layout.svelte` - Updated redirect logic and navigation

**Database Schema Changes:**
- `families` table: id, name, created_at
- `users`: added family_id FK, unique(family_id, username)
- `sessions`: added family_id FK
- `groceries`: added family_id FK

**Test Data:**
- Default family: "Familjen Wiesel"
- Default users: robert/robert, julia/julia, tore/tore (all in Familjen Wiesel)

---

### ✅ Phase 1: Authentication
> **Goal:** Secure the app with login - COMPLETE

- [x] PostgreSQL database connection pool
- [x] Create database schema (users, sessions tables with auto-init)
- [x] Password hashing with bcrypt
- [x] Login API endpoint (POST /api/auth/login with familyId)
- [x] Logout API endpoint (POST /api/auth/logout)
- [x] Auth status endpoint (GET /api/auth/status with family info)
- [x] Auth middleware (requireAuth hook with family context)
- [x] Session management (30-day expiry, UUID cookies)
- [x] Login page UI (family-specific)
- [x] Logout functionality
- [x] Protected route handling (layout redirects to welcome)
- [x] Navigation header with logout button
- [x] Individual user accounts per family

**Notes:**
- Auth flow: Welcome → Family Select → Family Login → App
- Each family has isolated user accounts
- Sessions include family_id for proper scoping

---

### ✅ Phase 2: Groceries - Core CRUD
> **Goal:** Basic grocery list management - COMPLETE

- [x] Groceries table schema (already exists with family_id)
- [x] Categories table and seed data (10 categories with emojis)
- [x] Zod schemas (shared package: CreateGrocerySchema, UpdateGrocerySchema, etc.)
- [x] GET /api/groceries endpoint (with family scoping)
- [x] GET /api/groceries/categories endpoint
- [x] POST /api/groceries endpoint
- [x] PATCH /api/groceries/:id endpoint
- [x] DELETE /api/groceries/:id endpoint
- [x] POST /api/groceries/clear-bought endpoint
- [x] Grocery list page UI (Swedish: Inköpslista)
- [x] Add item form component (name, category, quantity)
- [x] Grocery item component with checkmark toggle
- [x] Mark as bought interaction (optimistic updates)
- [x] Delete item interaction
- [x] Category filter (pill buttons)
- [x] Grouping by category
- [x] Show who added/bought items
- [x] Bought items section (collapsible)
- [x] Clear bought items button

**Files created:**
- `apps/api/src/modules/groceries/repository.ts` - Data access layer with JOINs
- `apps/api/src/modules/groceries/service.ts` - Business logic layer  
- `apps/api/src/modules/groceries/routes.ts` - API endpoints with auth
- `apps/api/src/modules/groceries/index.ts` - Module exports

**Files modified:**
- `apps/api/src/app.ts` - Registered groceries routes
- `apps/web/src/routes/groceries/+page.svelte` - Complete grocery UI

**API Endpoints:**
- `GET /api/groceries` - List all groceries for family
- `GET /api/groceries/categories` - Get categories with icons
- `GET /api/groceries/:id` - Get single item
- `POST /api/groceries` - Create new item
- `PATCH /api/groceries/:id` - Update item (including bought status)
- `DELETE /api/groceries/:id` - Delete item
- `POST /api/groceries/clear-bought` - Clear all bought items

**Acceptance Criteria:**
- ✅ Add "Milk" → appears in list
- ✅ Tap circle → marks as bought (moves to bought section)
- ✅ Delete button removes item
- ✅ Filter by category works (pill buttons)
- ✅ Items grouped by category
- ✅ Shows who added/bought each item
- ✅ Swedish UI (Inköpslista, Lägg till, etc.)

---

### 🔲 Phase 3: Real-Time Sync
> **Goal:** Multiple devices stay in sync

- [ ] WebSocket server in Fastify
- [ ] WebSocket client in SvelteKit
- [ ] Broadcast events on changes
- [ ] Reconnection with exponential backoff
- [ ] Optimistic UI updates
- [ ] Connection status indicator

**Acceptance Criteria:**
- Open app on two devices
- Add item on device A → appears on device B within 1 second
- Mark bought on B → updates on A
- Disconnect WiFi → reconnects automatically

---

### 🔲 Phase 4: PWA & Offline
> **Goal:** Works like a native app

- [ ] Service worker registration
- [ ] PWA manifest.json
- [ ] App icons (various sizes)
- [ ] Offline grocery list cache
- [ ] Add to home screen support
- [ ] Offline indicator

**Acceptance Criteria:**
- "Add to Home Screen" prompt works
- Installed app has custom icon
- Turn on airplane mode → can still view list
- Shows offline indicator when disconnected

---

### 🔲 Phase 5: Google Calendar
> **Goal:** See family calendar events

- [ ] Google Cloud project setup
- [ ] OAuth credentials configured
- [ ] OAuth flow (authorize URL)
- [ ] OAuth callback handler
- [ ] Token storage (encrypted)
- [ ] Token refresh logic
- [ ] Google Calendar API client
- [ ] Fetch events endpoint
- [ ] Calendar cache table
- [ ] Calendar view UI (week view)
- [ ] Calendar view UI (month view)
- [ ] Event details modal
- [ ] Auto-sync (15 min interval)
- [ ] Manual sync button
- [ ] "Reconnect" UI if token fails

**Acceptance Criteria:**
- Click "Connect Calendar" → Google OAuth flow
- After auth → see calendar events
- Events auto-refresh
- Can switch week/month view
- Tap event → see details

---

### 🔲 Phase 6: Polish & UX
> **Goal:** Pleasant to use daily

- [ ] Dashboard home page
- [ ] Quick add grocery widget
- [ ] Loading skeletons
- [ ] Error toast notifications
- [ ] Pull-to-refresh (mobile)
- [ ] Dark mode toggle
- [ ] Responsive breakpoints check
- [ ] Animation polish
- [ ] Performance audit

**Acceptance Criteria:**
- Julia and Robert say it "feels nice"
- No janky animations
- Dark mode works throughout
- Loading states aren't jarring

---

### ✅ Phase 7: Deployment (Partial)
> **Goal:** Running on Raspberry Pi - MOSTLY COMPLETE

- [x] Pi OS installed and updated (Raspberry Pi OS 64-bit, Debian Trixie)
- [x] Node.js 24.12.0 installed
- [x] pnpm 10.26.1 installed
- [x] PostgreSQL 17.6 installed and configured
- [x] Clone repo to Pi (~/family-hub)
- [ ] SSD mounted for data
- [ ] Caddy installed (not needed - using Cloudflare Tunnel)
- [x] systemd user service for API (family-api.service)
- [x] systemd user service for web (family-web.service)
- [x] Domain DNS configured (familjehubben.vip)
- [x] Cloudflare Tunnel for HTTPS access
- [x] HTTPS working via Cloudflare
- [ ] Backup script created
- [ ] Backup cron job set
- [ ] rclone to Google Drive configured
- [x] deploy.ps1 script working
- [x] Test full restart (services auto-start on boot)

**Pi Details:**
- IP: 192.168.68.127
- Hostname: FamiljeHubbenPi
- SSH: robert@192.168.68.127 (password: SamMoa123)
- Web: http://192.168.68.127:3000 (local) / https://familjehubben.vip (public)
- API: http://192.168.68.127:3001 (local) / https://familjehubben.vip/api (public)

**Systemd User Services:**
- Location: ~/.config/systemd/user/
- family-api.service - Fastify API on port 3001
- family-web.service - SvelteKit on port 3000
- Lingering enabled: `sudo loginctl enable-linger robert`
- Auto-restart on crash, auto-start on boot

**Deployment Workflow:**
```powershell
# Build locally
pnpm build

# Deploy API
scp -r apps/api/dist apps/api/package.json robert@192.168.68.127:~/family-hub/apps/api/

# Deploy Web
scp -r apps/web/build apps/web/package.json robert@192.168.68.127:~/family-hub/apps/web/

# Restart services
ssh robert@192.168.68.127 "systemctl --user restart family-api family-web"

# Check status
ssh robert@192.168.68.127 "systemctl --user status family-api family-web"

# View logs
ssh robert@192.168.68.127 "journalctl --user -u family-api -f"
```

**Remaining for Phase 7:**
- Set up Cloudflare Tunnel or domain for external access
- Configure backups
- Optional: Caddy reverse proxy for single port access

---

### 🔲 Phase 8: Testing & Hardening
> **Goal:** Confidence in reliability

- [ ] Vitest configured
- [ ] Unit tests: grocery service
- [ ] Unit tests: auth service
- [ ] Unit tests: calendar service
- [ ] Integration tests: API endpoints
- [ ] E2E test: login flow
- [ ] E2E test: grocery flow
- [ ] Security headers audit
- [ ] Rate limiting added
- [ ] CSRF protection verified
- [ ] Dependency audit

**Acceptance Criteria:**
- All tests pass
- No critical security findings
- Rate limiting prevents abuse

## Session Log

### Session 6 - 2025-12-21 (Late Evening)
**What we did:**
- Implemented password visibility toggles (eye icons) on all password fields
- Fixed database schema issues (missing `password_hash` column in families table)
- Made member passwords optional throughout the system:
  - Database: Users seeded with NULL password_hash
  - API: Login endpoint accepts optional/empty passwords
  - Auth service: Skips password validation if user has no password
- Fixed Svelte binding issues (used `value` + `on:input` instead of `bind:value` for dynamic type)
- Reset database with clean data (family password: "SamMoa123")
- Created PATCH endpoint for updating family passwords
- Deployed all changes successfully to Pi

**Database Changes:**
- Added `password_hash` column to families table
- Modified user seeding to create users without passwords (NULL)
- Family "Familjen Wiesel" (ID 1) protected with family password
- Users (robert, julia, tore) can log in without individual passwords

**Files Modified:**
- `apps/api/src/db/index.ts` - Seed users without passwords
- `apps/api/src/modules/auth/routes.ts` - Password optional in LoginBody, removed from validation
- `apps/api/src/modules/families/repository.ts` - Added updateFamilyPassword function
- `apps/web/src/routes/welcome/+page.svelte` - Password visibility toggles
- `apps/web/src/routes/login/[familyId]/+page.svelte` - Password field marked as optional

**Next session:**
- Fix mobile UI (header doesn't look good on phone)
- Consider Phase 2b: Smart suggestions or Phase 3: Real-time sync

### Session 5 - 2025-12-21 (Evening)
**What we did:**
- Implemented Phase 2a: Basic Grocery CRUD
- Created groceries API module (repository, service, routes)
- Built complete grocery list UI with Swedish text
- Features: add items, mark bought, delete, filter by category
- Items grouped by category with emoji icons
- Optimistic updates for smooth UX
- Shows who added/bought each item
- Deployed to Pi successfully

**Grocery Categories (10):**
- 🥬 produce, 🥛 dairy, 🥩 meat, 🍞 bakery, 🧊 frozen
- 🥤 beverages, 🍿 snacks, 🧹 household, 🐕 pet, 📦 other

**Next session:**
- Test on phone for real-world usage
- Consider Phase 2b: Smart suggestions (autocomplete, frequency)
- Or Phase 3: Real-time sync with WebSockets

### Session 4 - 2025-12-21
**What we did:**
- Deployed app to Raspberry Pi 5
- Installed Node.js 24.12.0, pnpm, PostgreSQL 17.6 on Pi
- Set up SSH key authentication for passwordless deployments
- Fixed CORS issues for production (API on different port)
- Fixed API client to work in production (dynamic base URL detection)
- Created systemd services for auto-start on boot
- Created deploy.ps1 script for one-command deployments
- Cleaned up dead code (unused variables)
- Created .env.example for documentation
- Fixed home page API call to use API client

**Pi Access:**
- Local: http://192.168.68.127:3000
- SSH: `ssh robert@192.168.68.127` (key auth)

**Next session:**
- Consider Cloudflare Tunnel for external access
- Start Phase 2: Groceries CRUD

### Session 7 - 2025-12-22 (Design System Implementation)
**What we did:**
- Applied pastel earthy color scheme across entire application
- Updated all pages: Welcome, Login, Home (Dashboard), Groceries, Calendar
- Updated all components: LoadingSpinner, GroceryItemRow, Layout
- Redesigned home page as dashboard with left sidebar navigation
- Removed duplicate "Familjehubben" text (kept only in header)
- Styled header with pastel earthy gradient background
- Moved API status to bottom corner (tiny text)
- Removed placeholder activity feed data
- Comprehensive search and replace of all old color classes:
  - Replaced bg-blue, bg-indigo, bg-gray-50/100 with orange/amber/yellow gradients
  - Replaced text-primary, border-primary with stone/orange variants
  - Updated 20+ instances across layout, pages, and components
  - Fixed duplicate button matches in GroceryItemRow component

**Design System - Pastel Earthy Palette:**
- Backgrounds: `from-orange-100 via-amber-50 to-yellow-100` (light)
- Header: Matching gradient with `border-orange-200`
- Cards: `bg-white/90` with `backdrop-blur-lg`, `border-orange-200`
- Titles: `from-orange-400 to-amber-400` gradient text
- Text: stone-800 (headers), stone-700 (body), stone-600 (secondary)
- Buttons Primary: `from-orange-400 to-amber-400` gradient
- Buttons Secondary: `from-orange-300 to-amber-300` gradient
- Neutral buttons: `bg-stone-100` hover `bg-stone-200`
- Links: `text-stone-600` hover `text-orange-500`
- Borders: `border-orange-200`, focus `border-orange-400`
- Loading spinner: `border-orange-200 border-t-orange-500`

**Files modified:**
- `apps/web/src/routes/+layout.svelte` - Header gradient, navigation colors
- `apps/web/src/routes/+page.svelte` - Dashboard layout, removed duplicate title
- `apps/web/src/routes/welcome/+page.svelte` - All 485 lines updated
- `apps/web/src/routes/login/[familyId]/+page.svelte` - Already done in previous session
- `apps/web/src/routes/groceries/+page.svelte` - Back link, spinner, text colors
- `apps/web/src/routes/calendar/+page.svelte` - Back link, text colors
- `apps/web/src/lib/components/LoadingSpinner.svelte` - Orange/amber spinner
- `apps/web/src/lib/components/GroceryItemRow.svelte` - All buttons, badges, backgrounds

**Next session:**
- Consider Phase 2: Account deletion (backend + frontend)
- Consider Phase 3: Email password recovery
- Continue with Phase 5: Google Calendar integration

### Session 8 - 2025-12-22 (Grocery Assignments & Systemd Services)
**What we did:**

**1. Dashboard Redesign:**
- Removed sidebar navigation (keep nav in header only)
- Added family member avatars in sidebar instead
- Added notification badge capability on member avatars
- Connected notifications to real grocery assignment data

**2. Grocery List Assignment Feature (Full Implementation):**
- Created `grocery_assignments` database table on Pi
- Added repository functions: getAssignments, addAssignment, removeAssignment, clearAssignments
- Added service functions with WebSocket broadcasting (grocery:assigned, grocery:unassigned events)
- Added API routes: GET/POST /api/groceries/assignments, DELETE /api/groceries/assignments/:userId
- Added assignment UI on grocery page (🏷️ button next to title)
- Assignment panel shows family members with toggle buttons
- Assigned members shown as avatar summary bar
- Real-time sync via WebSocket when assignments change
- Dashboard notification badges now show real assignment counts

**3. Bug Fixes:**
- Fixed /api/users 404 error (changed to /api/families/{id}/users)
- Fixed reactive assignment state (UI wasn't updating on click)
- Used reactive $: assignedUserIds Set for proper Svelte reactivity

**4. UI Improvements:**
- Welcome page: Autocomplete only shows when typing (not on focus)
- Welcome page: Added autocomplete="off" to prevent browser autofill
- Login page: Hide age display for parents (pappa, mamma)
- Grocery page: Changed assignment icon from 👥 to 🏷️
- Grocery page: Moved assignment button next to title

**5. Systemd User Services (Major Stability Fix):**
- Created ~/.config/systemd/user/family-api.service
- Created ~/.config/systemd/user/family-web.service
- Enabled lingering: `sudo loginctl enable-linger robert`
- Services now auto-restart on crash (Restart=always, RestartSec=5)
- Services start automatically on boot
- Services persist after SSH disconnect

**Database Changes:**
```sql
CREATE TABLE grocery_assignments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);
```

**New Files:**
- `~/.config/systemd/user/family-api.service` - API systemd service
- `~/.config/systemd/user/family-web.service` - Web systemd service

**Files Modified:**
- `apps/api/src/modules/groceries/repository.ts` - Assignment DB functions
- `apps/api/src/modules/groceries/service.ts` - Assignment service + WebSocket events
- `apps/api/src/modules/groceries/routes.ts` - Assignment API endpoints
- `apps/web/src/routes/+page.svelte` - Dashboard with real notifications
- `apps/web/src/routes/groceries/+page.svelte` - Assignment UI
- `apps/web/src/routes/welcome/+page.svelte` - Autocomplete fixes
- `apps/web/src/routes/login/[familyId]/+page.svelte` - Hide parent ages

**Deployment Commands (Updated):**
```bash
# Restart services after deploy
ssh robert@192.168.68.127 "systemctl --user restart family-api family-web"

# Check service status
ssh robert@192.168.68.127 "systemctl --user status family-api family-web"

# View logs
ssh robert@192.168.68.127 "journalctl --user -u family-api -f"
ssh robert@192.168.68.127 "journalctl --user -u family-web -f"
```

**Pi Environment (.env):**
- DB_PASSWORD=familyhub123 (was causing auth issues earlier)
- Services read from ~/family-hub/.env

**Next session:**
- Test assignment feature with multiple users
- Consider adding task/chore assignment (beyond just groceries)
- Phase 3: Real-time sync improvements
- Phase 5: Google Calendar integration

### Session 3 - 2025-12-21
**What we did:**
- Completed Phase 1: Authentication
- Created PostgreSQL database connection with auto-schema init
- Implemented auth module (repository, service, routes, middleware)
- Created frontend API client and auth store
- Built login page with password form
- Updated layout with auth protection and navigation header
- Sessions stored in PostgreSQL with 30-day expiry

**Next session:**
- Start Phase 2: Groceries CRUD

### Session 2 - 2025-12-21
**What we did:**
- Installed pnpm globally
- Switched database from SQLite to PostgreSQL
- Created dedicated PostgreSQL user and database
- Fixed TypeScript composite project references
- Installed missing pino-pretty dependency
- Got both dev servers running successfully

### Session 1 - 2024-XX-XX
- Created ProjectPlan.md
- Created progress.md
- Discussed tech stack

### Session 9 - 2025-12-23 (Internationalization & Deployment)
**What we did:**

**1. Internationalization System (i18n) Implementation:**
- Created shared i18n package: `packages/i18n/` with full support for Swedish/English
- Built translation infrastructure:
  - Core: `types.ts` with Message enum, `translations.ts` with full language data
  - Utils: `getSystemLanguage()` to detect browser/OS language
  - Exports: Simple API via `$lib/i18n`
- Implemented system language detection (defaults to Swedish for Swedish OS)
- Created reactive translation store: `$lib/stores/language.ts`
- Built language picker component (English/Swedish flags) in header
- Full UI translation coverage:
  - Auth pages: Login, Welcome, Password reset
  - Grocery page: Add item, categories, bought section, clear button
  - Dashboard/Calendar: Stub pages with correct text
  - Modals: Assignment panel, error messages, empty states
- Fixed all hardcoded Swedish text throughout application

**2. Comprehensive Translator Module:**
- Built message-passing translator for dynamic text
- Supports parameterized messages (e.g., "Welcome, {name}")
- Supports plural forms (itemCount: 0 → "no items", 1 → "1 item", 2+ → "{n} items")
- Support for dynamic translations in components
- Used throughout: GroceryItemRow, AssignmentPanel, forms

**3. Deployment & Status:**
- ✅ Built and deployed to Pi successfully
- ✅ Both API and Web services restarted
- ✅ Services active (running) and accepting requests
- ✅ All i18n changes live in production

**New Files Created:**
- `packages/i18n/src/types.ts` - Message enum with 90+ translation keys
- `packages/i18n/src/translations.ts` - Swedish and English translation data
- `packages/i18n/src/index.ts` - Translator class and utilities
- `packages/i18n/package.json` - Module setup
- `apps/web/src/lib/stores/language.ts` - Language picker store
- `apps/web/src/lib/components/LanguagePicker.svelte` - Flags component

**Files Modified (i18n integration):**
- `packages/shared/package.json` - Added i18n as dependency
- `apps/web/src/routes/+layout.svelte` - Language picker in header
- `apps/web/src/routes/login/[familyId]/+page.svelte` - Full i18n
- `apps/web/src/routes/welcome/+page.svelte` - Full i18n
- `apps/web/src/routes/+page.svelte` - Dashboard i18n
- `apps/web/src/routes/groceries/+page.svelte` - Full i18n + dynamic texts
- `apps/web/src/routes/calendar/+page.svelte` - Calendar i18n
- `apps/web/src/lib/components/GroceryItemRow.svelte` - Dynamic item label with count
- `apps/web/src/lib/components/LoadingSpinner.svelte` - i18n loading text
- All password reset pages: i18n text

**Translation Statistics:**
- Total messages: 90+
- Supported languages: Swedish (sv-SE), English (en-US)
- Coverage: 100% of user-facing text
- System language detection: Automatic based on browser/OS

**Deployment Notes:**
- API rebuilt and deployed without issues
- Web built with i18n integrated (no breaking changes)
- Both services restarted successfully
- Services running and responsive

**Next session:**
- Test i18n on real devices (verify language switching works)
- Consider Phase 2b: Smart suggestions or Phase 3: Real-time improvements
- Monitor for any i18n-related issues

### Session - 2025-01-XX - Security & Code Quality Improvements
Based on comprehensive project review, implemented following improvements:

**Security Fixes:**
- ✅ Added `client_secret*.json` to .gitignore and removed from tracking
- ✅ Increased password requirements from 4 to 8 characters minimum
- ✅ Restricted CORS to familjehubben.vip in production (was "*")
- ✅ Added @fastify/rate-limit for API protection
  - Global limit: 100 requests/minute
  - Auth endpoints: 5 requests/minute (login, password reset)
- ✅ Added @fastify/helmet for security headers
  - Content Security Policy (CSP) in production
  - XSS protection headers
  - Various other security headers

**Code Quality:**
- ✅ Replaced all console.error with structured logger.error
- ✅ Removed debug console.log statements from auth module
- ✅ Added Fastify request type augmentation (types/fastify.d.ts)
- ✅ Removed 'as any' casts, improved type safety
- ✅ Added consistent index.ts exports to all API modules
- ✅ Added ESLint config with no-console and no-any rules

**Cleanup:**
- ✅ Removed orphaned SQL files (create_tables.sql, schema.sql)
- ✅ Updated README.md (PostgreSQL not SQLite)

**Packages Added:**
- @fastify/rate-limit
- @fastify/helmet
- @fastify/csrf-protection (installed, ready for future use)

### Session 10 - 2025-12-24 (Calendar & Bulletin Board)
**What we did:**

**1. Calendar Full Implementation:**
- Built complete calendar page with week and month views
- Swedish calendar (weeks start Monday, Swedish month names)
- Color-coded events by type with emoji icons
- Add/Edit/Delete events with modal forms
- Event categories: family, work, school, health, birthday, other
- Recurring events support (daily, weekly, monthly, yearly)
- All-day events vs. timed events
- User assignment to events (who it concerns)
- Database tables: calendar_events, event_participants

**2. Bulletin Board (Home Page):**
- Redesigned home page as bulletin board
- Pinnable notes with colors (yellow, blue, green, pink, purple, orange)
- Add/edit/delete notes
- Pin notes to keep at top
- Assign notes to family members
- Notes show author with avatar
- Database table: bulletin_notes, note_assignments

**3. Activities Feature:**
- New activities page for family activities
- Activity categories: sports, music, hobby, social, other
- Track when activities happen
- Who participates in activities
- Database tables: activities, activity_schedules

**4. Tasks/Chores System:**
- Full task management page
- Task categories: cleaning, cooking, laundry, outdoor, pets, shopping, homework, other
- Task assignment to family members
- Points system for completed tasks
- Difficulty levels: easy, medium, hard
- Due dates and validation workflow
- Task status: open, in_progress, done, verified
- Database table: tasks

**Files Created:**
- `apps/web/src/routes/calendar/+page.svelte` - Full calendar implementation
- `apps/web/src/routes/activities/+page.svelte` - Activities page
- `apps/web/src/routes/tasks/+page.svelte` - Tasks/chores page
- `apps/api/src/modules/calendar/` - Calendar API module
- `apps/api/src/modules/bulletin/` - Bulletin board API module
- `apps/api/src/modules/activities/` - Activities API module
- `apps/api/src/modules/tasks/` - Tasks API module

### Session 11 - 2025-12-25 (Profile & Push Notifications)
**What we did:**

**1. Push Notifications System:**
- Web Push notifications using VAPID keys
- Service worker for background notifications
- User subscription management
- Push notification for various events:
  - New grocery assignments
  - Task assignments
  - Calendar reminders
  - Bulletin messages
- API endpoint: POST /api/push/send
- Database table: push_subscriptions

**2. Profile Page Enhancements:**
- User profile pages at /profile/[userId]
- View own profile and other family members
- Edit profile (display name, avatar emoji, color, birthday, gender, role)
- View assigned tasks on profile
- View earned points from completed tasks
- Push notification settings per user

**3. Profile Message Feature:**
- "Meddelande" button on other users' profiles
- Send messages that appear as pinned bulletin notes
- Messages trigger push notification to recipient
- Messages display in "Meddelanden" section on profile

**4. Calendar Fixes:**
- Fixed "Månad" button being cut off on mobile
- Default view changed to month view
- Navigation made responsive with flex-wrap

**5. Home Page Refactoring:**
- Split +page.svelte from 913 lines into 6 components:
  - FamilySidebar.svelte (~117 lines)
  - MyTasksCard.svelte (~94 lines)
  - BulletinNoteCard.svelte (~107 lines)
  - UpcomingActivities.svelte (~70 lines)
  - TasksPreview.svelte (~50 lines)
  - GroceryPreview.svelte (~36 lines)
- Main page reduced to ~421 lines
- Created barrel export in index.ts

**Files Created:**
- `apps/web/src/lib/components/home/FamilySidebar.svelte`
- `apps/web/src/lib/components/home/MyTasksCard.svelte`
- `apps/web/src/lib/components/home/BulletinNoteCard.svelte`
- `apps/web/src/lib/components/home/UpcomingActivities.svelte`
- `apps/web/src/lib/components/home/TasksPreview.svelte`
- `apps/web/src/lib/components/home/GroceryPreview.svelte`
- `apps/web/src/lib/components/home/index.ts`
- `apps/api/src/modules/push/` - Push notification module
- `apps/web/static/sw.js` - Service worker

**Files Modified:**
- `apps/web/src/routes/+page.svelte` - Refactored with components
- `apps/web/src/routes/calendar/+page.svelte` - Month view default, responsive nav
- `apps/web/src/routes/profile/[userId]/+page.svelte` - Message feature
- `apps/api/src/modules/push/routes.ts` - Added /send endpoint

### Session 12 - 2025-12-26 (Planning Phase)
**What we did:**

**1. Development Plan Created:**
- Created comprehensive Plan.md as main roadmap
- Split into 6 separate detailed plan files in /plans/ directory:
  - 01-StartScreen.md - PWA install banner
  - 02-TempusIntegration.md - Work schedule sync
  - 03-ThemesPersonalization.md - Visual customization
  - 04-ProfilePictures.md - Avatar uploads
  - 05-PointsRewards.md - Allowance system
  - 06-GroceryAI.md - AI meal planning (4 phases)

**2. Planning Highlights:**
- 8 weeks estimated total work
- PWA install banner is first priority (2 days)
- Grocery AI split into 4 phases (preferences → menu → list → templates)
- Tempus integration has rollback plan
- Profile pictures need parental approval for children
- Points system fully optional per family

---

### Session 13 - 2025-12-26 (PWA Install Banner)
**What we did:**

**1. PWA Install Banner Enhanced:**
- Discovered existing `InstallPrompt.svelte` component
- Enhanced with 24h cooldown after dismiss
- Added iOS standalone detection
- Added friendly app explanation message
- Updated translations (Swedish, English, Portuguese)
- Fixed localStorage check - was saving but not loading dismiss state!

**2. Install App in Settings:**
- Created shared PWA store: `apps/web/src/lib/stores/pwa.ts`
- Store exposes: `deferredPrompt`, `isInstalled`, `canInstall`, `triggerInstall()`
- Added "Install App" section to SettingsModal
- Shows 3 states: already installed ✅, install button 📲, or browser instructions
- Users can always find install option in Settings even after dismissing banner

**3. Files Created:**
- `apps/web/src/lib/stores/pwa.ts` - Shared PWA install prompt store

**4. Files Modified:**
- `apps/web/src/lib/components/InstallPrompt.svelte` - Uses shared store, cooldown logic
- `apps/web/src/lib/components/SettingsModal.svelte` - Added Install App section
- `apps/web/src/lib/i18n/translations.ts` - Added install.appExplanation + settings.installApp translations
- `plans/01-StartScreen.md` - Marked as completed
- `Plan.md` - Updated status to completed

**5. New Translations Added:**
- `settings.installApp` - Section header
- `settings.appInstalled` - "App is already installed"
- `settings.installButton` - "Install Family Hub"
- `settings.installUnavailable` - Browser fallback message

**Deployed:** ✅ Successfully deployed to Pi

---

### Session 14 - 2025-12-26 (Grocery AI Phase 1: Food Preferences)
**What we did:**

**1. Database Schema:**
- Created `food_preferences` table with 9 preference columns (1-10 scale):
  - spicy, asian, swedish, vegetarian, vegan
  - health_conscious, kid_friendly, quick_meals, budget_conscious
- Created `dietary_restrictions` table for allergens:
  - 12 restrictions: lactose, gluten, nuts, peanuts, eggs, fish, shellfish, soy, sesame, celery, mustard, sulfites

**2. API Module (apps/api/src/modules/preferences/):**
- `repository.ts` - Database CRUD: getFamilyPreferences, upsertFamilyPreferences, getFamilyRestrictions, setFamilyRestrictions, resetFamilyPreferences
- `service.ts` - Business logic + DIETARY_RESTRICTIONS list
- `routes.ts` - API endpoints with auth middleware:
  - `GET /preferences` - Get preferences + restrictions
  - `PUT /preferences` - Update preferences + restrictions
  - `GET /preferences/restrictions` - Get available restriction options
  - `POST /preferences/reset` - Reset to defaults
- `index.ts` - Module exports

**3. Frontend Page (apps/web/src/routes/groceries/preferences/+page.svelte):**
- 9 range sliders for taste preferences with emojis:
  - 🌶️ Kryddig mat, 🍜 Asiatiskt, 🇸🇪 Husmanskost
  - 🥗 Vegetariskt, 🌱 Veganskt, 💪 Hälsosamt
  - 👶 Barnvänligt, ⏱️ Snabba måltider, 💰 Budgetvänligt
- Dietary restrictions toggle buttons (red when active)
- Save/Reset buttons with loading states
- Success/error message display
- Link from grocery page header (🍽️ icon)

**4. Translations Added:**
- Swedish, English, Portuguese translations for:
  - preferences.title, description, tastePreferences
  - preferences.dietaryRestrictions, restrictionsDescription
  - preferences.low, high, saved, reset, confirmReset, infoBox

**5. Files Created:**
- `apps/api/src/modules/preferences/repository.ts`
- `apps/api/src/modules/preferences/service.ts`
- `apps/api/src/modules/preferences/routes.ts`
- `apps/api/src/modules/preferences/index.ts`
- `apps/web/src/routes/groceries/preferences/+page.svelte`

**6. Files Modified:**
- `apps/api/src/db/index.ts` - Added food_preferences & dietary_restrictions tables
- `apps/api/src/app.ts` - Registered preferencesRoutes
- `apps/web/src/lib/i18n/translations.ts` - Added 13 preference translation keys
- `apps/web/src/routes/groceries/+page.svelte` - Added 🍽️ link to preferences

**Deployed:** ✅ API and Web successfully deployed to Pi

**Next Session:**
- Test preferences page on real device
- Update 06-GroceryAI.md plan file with Phase 1 completion
- Start Phase 2: AI Menu Suggestions (OpenAI integration)

---

### Session 15 - 2025-12-26 (Grocery AI Phase 2 & Unit Fixes)
**What we did:**

**1. AI Menu Generation (Phase 2):**
- Implemented OpenAI integration for weekly dinner menu generation
- Created menu API module with repository, service, routes
- AI generates 7 dinners based on family preferences + restrictions
- Features: regenerate full menu, regenerate specific days, edit individual meals
- Shows cooking time, difficulty, servings, ingredients per meal
- Ingredient reuse analysis shows what's used across multiple days

**2. Fixed AI-Generated Grocery Units:**
- **Problem:** When AI menu ingredients were added to grocery list, everything defaulted to "st" (pieces) instead of proper units (kg, g, dl, etc.)
- **Root Cause 1:** `parseIngredient()` in menu page defaulted to "st" when AI didn't specify unit
- **Root Cause 2:** `addItem()` in grocery page wasn't sending the `unit` field from suggestions

**3. Smart Unit Defaults for ~100+ Swedish Ingredients:**
- Created `defaultUnitMap` in menu page with proper units:
  - Produce: potatis → kg, spenat → g, champinjoner → g
  - Meat: köttfärs → 500g, kyckling → 500g, bacon → 200g
  - Fish: lax → 400g, räkor → 300g
  - Dairy: mjölk → l, grädde → 2dl, ost → 200g, ägg → 6st
  - Pantry: pasta → 400g, ris → 300g, krossade tomater → burk
  - Spices: salt → krm, curry → tsk, basilika → kruka
- Updated `parseIngredient()` to use `getDefaultUnit()` lookup

**4. Fixed Grocery Page Suggestion Units:**
- Added `newItemUnit` state variable
- Updated `selectSuggestion()` to set unit from suggestion data
- Updated `addItem()` to send unit to API
- Now "Potatis" suggestion correctly adds as "1 kg" not "1 st"

**5. Smart Quantity Stepping UI:**
- Replaced number input with +/- buttons showing quantity and unit
- Intelligent step sizes based on unit type:
  - **kg:** 0.2 steps up to 2kg, 0.5 steps to 3kg, then 1kg
  - **liters:** 0.5 steps up to 2L, then 1L
  - **grams:** 50g steps up to 500g, then 100g
  - **st/burk/förp:** 1 step increments
- Minimum values: 0.2 for kg/l, 1 for everything else
- Display shows "0.8 kg" format with smart decimal handling

**Files Modified:**
- `apps/web/src/routes/groceries/menu/+page.svelte`:
  - Added `defaultUnitMap` with ~100 Swedish ingredients
  - Added `getDefaultUnit()` function for smart lookups
  - Updated `parseIngredient()` to use smart unit defaults
- `apps/web/src/routes/groceries/+page.svelte`:
  - Added `newItemUnit` variable
  - Updated `selectSuggestion()` to set unit from suggestion
  - Updated `addItem()` to send unit to API
  - Added `getQuantityStep()`, `incrementQuantity()`, `decrementQuantity()` functions
  - Replaced quantity number input with +/- button UI

**UI Changes:**
- Grocery add form now shows: `[Category dropdown] [−] 0.8 kg [+]`
- Unit displayed between quantity buttons
- Decimal quantities shown with 1 decimal place when needed

**Deployed:** ✅ Successfully deployed to Pi

---

### Session 16 - 2025-12-26 (Decimal Quantities & Collapsible Categories)
**What we did:**

**1. Decimal Quantity Support:**
- **Problem:** Adding items with decimal quantities (0.6 kg) failed with "Validation failed"
- **Root Cause:** Zod schema had `.int()` constraint and database had `INTEGER` column
- **Fix 1:** Updated `packages/shared/src/schemas/grocery.ts`:
  - Removed `.int()` from `CreateGrocerySchema.quantity`
  - Removed `.int()` from `UpdateGrocerySchema.quantity`
  - Now allows decimal quantities like 0.6, 1.5, etc.
- **Fix 2:** Created database migration `003_quantity_decimal.ts`:
  - Changed `quantity` from `INTEGER` to `DECIMAL(10,2)`
  - Updated default to 1.00
  - Includes rollback (down migration rounds decimals to integers)

**2. Smart Quantity Formatting:**
- **Problem:** Quantities displayed as "1.00" instead of clean "1"
- **Solution:** Added `formatQuantity()` helper function:
  - Shows "1" for whole numbers (not "1.00")
  - Shows "1.5" or "0.3" when decimals are needed
- Applied formatting to all quantity displays:
  - `GroceryItemRow.svelte` - Item list display
  - `GroceryItemRow.svelte` - Edit quantity mode
  - `GroceryItemRow.svelte` - Bought items display
  - `profile/[userId]/+page.svelte` - Profile grocery list

**3. Collapsible Category Sections:**
- Category sections now collapse/expand on header click
- Collapsed sections show summary: "3 varor dolda"
- Collapse arrow (▼) rotates when collapsed
- **Drag handle (⋮⋮)** preserved for reordering sections
- State persisted to localStorage (survives page refresh)

**4. Helper Functions Added:**
- `apps/web/src/lib/utils/groceryHelpers.ts`:
  - `loadCollapsedCategories()` - Load from localStorage
  - `saveCollapsedCategories()` - Save to localStorage

**5. A11y Fix:**
- Added `<!-- svelte-ignore a11y-no-static-element-interactions -->` to drag handle span

**Files Created:**
- `apps/api/src/db/migrations/003_quantity_decimal.ts`

**Files Modified:**
- `packages/shared/src/schemas/grocery.ts` - Removed `.int()` constraints
- `apps/api/src/db/migrations/index.ts` - Added migration003
- `apps/web/src/lib/utils/groceryHelpers.ts` - Collapse state functions
- `apps/web/src/lib/components/GroceryItemRow.svelte` - formatQuantity()
- `apps/web/src/lib/components/CategorySection.svelte` - Collapsible UI
- `apps/web/src/routes/groceries/+page.svelte` - Collapse state management
- `apps/web/src/routes/profile/[userId]/+page.svelte` - Quantity formatting

**UX Improvements:**
- Categories can be collapsed to reduce visual clutter
- Category order remembered (drag to reorder, persists in localStorage)
- Collapse state remembered per category
- Clean quantity display (no unnecessary decimals)
- Decimal quantities now work (0.5 kg, 0.3 l, etc.)

**Deployed:** ✅ Successfully deployed to Pi

---

## Blockers & Questions

| Issue | Status | Resolution |
|-------|--------|------------|
| None yet | - | - |

---

## Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| SvelteKit over Next.js | Lighter, better for Pi, simpler for this use case | 2024-XX-XX |
| Fastify over Express | Faster, better TS support, modern | 2024-XX-XX |
| PostgreSQL over SQLite | Native module issues with SQLite on Node 24/Windows | 2025-12-21 |
| Session auth over JWT | Simpler for same-origin app, easier revocation | 2024-XX-XX |
| pnpm over npm/yarn | Faster, disk efficient, great monorepo support | 2024-XX-XX |

---

## Notes

- Keep phases small and shippable
- Each phase should result in something usable
- Don't skip to later phases - foundation matters
- Test on actual phone regularly, not just desktop
- **400 lines max per file** - refactor if larger

---

*Last updated: 2025-12-26*

# Family Hub - Progress Tracker

> Track what's done, what's in progress, and what's next.

---

## Current Phase: Phase 2 - Groceries CRUD

### Status: ✅ Phase 2a Complete - Basic CRUD

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Phases Complete | 4/8 |
| Current Phase | 2b - Task Assignments |
| Blockers | None |
| Public URL | https://familjehubben.vip |

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

---

*Last updated: 2025-01-XX*

# Family Hub - Progress Tracker

> Track what's done, what's in progress, and what's next.

---

## Current Phase: Phase 2 - Groceries CRUD

### Status: Ready to Start

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Phases Complete | 2/8 |
| Current Phase | 2 - Groceries CRUD |
| Blockers | None |

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

### 🔲 Phase 2: Groceries - Core CRUD
> **Goal:** Basic grocery list management

- [ ] Groceries table schema (already exists with family_id)
- [ ] Categories table and seed data (already created)
- [ ] Zod schemas (shared package)
- [ ] GET /api/groceries endpoint (with family scoping)
- [ ] POST /api/groceries endpoint
- [ ] PATCH /api/groceries/:id endpoint
- [ ] DELETE /api/groceries/:id endpoint
- [ ] POST /api/groceries/clear-bought endpoint
- [ ] Grocery list page UI
- [ ] Add item form component
- [ ] Grocery item component
- [ ] Mark as bought interaction
- [ ] Delete item interaction
- [ ] Category filter
- [ ] Mobile touch optimization

**Acceptance Criteria:**
- Add "Milk" → appears in list
- Tap item → marks as bought (strikethrough)
- Swipe or long-press → delete option
- Filter by category works
- Works smoothly on phone

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

### 🔲 Phase 7: Deployment
> **Goal:** Running on Raspberry Pi

- [ ] Pi OS installed and updated
- [ ] Node.js 20 installed
- [ ] pnpm installed
- [ ] Clone repo to Pi
- [ ] SSD mounted for data
- [ ] Caddy installed
- [ ] Caddyfile configured
- [ ] systemd service for API
- [ ] systemd service for web
- [ ] Domain DNS configured
- [ ] Port forwarding on router
- [ ] HTTPS working
- [ ] Backup script created
- [ ] Backup cron job set
- [ ] rclone to Google Drive configured
- [ ] deploy.sh script working
- [ ] Test full restart

**Acceptance Criteria:**
- https://family.yourdomain.com loads
- Works from phone on mobile data (outside home)
- Backups running daily
- Can deploy update with one command

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

*Last updated: 2025-12-21*

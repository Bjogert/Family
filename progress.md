# Family Hub - Progress Tracker

> Track what's done, what's in progress, and what's next.

---

## Current Phase: Phase 0 - Project Setup

### Status: � In Progress

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Phases Complete | 0/8 |
| Current Phase | 0 - Project Setup |
| Blockers | None |
| Completed Items (Phase 0) | 7/11 |

---

## Phase Progress

### ✅ Pre-Planning
- [x] Define requirements and constraints
- [x] Choose tech stack
- [x] Design architecture
- [x] Create ProjectPlan.md
- [x] Create progress.md
� Phase 0: Project Setup (Foundation)
> **Goal:** Empty project that runs

- [x] Initialize pnpm monorepo workspace
- [x] Set up root package.json and workspace config
- [x] Create shared package with TypeScript config
- [x] Create API app (Fastify hello world)
- [x] Create web app (SvelteKit hello world)
- [x] Set up shared TypeScript configs
- [ ] Add ESLint + Prettier (minimal config)
- [x] Create .env.example
- [ ] Create .gitignore
- [x] Test: both apps start and show hello world
- [ ] Create initial README.md

**Recent changes (2025-12-21):**
- Switched from SQLite (better-sqlite3) to PostgreSQL due to native compilation issues with Node 24
- Created PostgreSQL database user `family_hub` with password `familyhub123`
- Updated API package.json with `pg` driver instead of `better-sqlite3`
- Updated config.ts to support PostgreSQL connection settings
- Updated .env.example with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- Added `"composite": true` to packages/shared/tsconfig.json for TypeScript project references
- Installed pino-pretty for development logging
- Both apps running successfully:
  - API on http://localhost:3001 ✓
  - Web on http://localhost:3000 ✓d show hello world
- [ ] Create initial README.md

**Acceptance Criteria:**
- `pnpm install` works
- `pnpm dev` starts both apps
- Visit localhost:3000 → see SvelteKit page
- Visit localhost:3001 → see Fastify JSON response

---

### 🔲 Phase 1: Authentication
> **Goal:** Secure the app with login

- [ ] SQLite database setup
- [ ] Create database schema (sessions table)
- [ ] Password hashing utilities
- [ ] Login API endpoint
- [ ] Auth middleware
- [ ] Session management
- [ ] Login page UI
- [ ] Logout functionality
- [ ] Protected route handling

**Acceptance Criteria:**
- Can't access /groceries without login
- Login with correct password → redirected to app
- Login with wrong password → error message
- Session persists on page refresh
- Logout destroys session

---

### 🔲 Phase 2: Groceries - Core CRUD
> **Goal:** Basic grocery list management

- [ ] Groceries table schema
- [ ] Categories table and seed data
- [ ] Zod schemas (shared package)
- [ ] GET /api/groceries endpoint
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

### Session 2 - 2025-12-21
**What we did:**
- Installed pnpm globally
- Switched database from SQLite to PostgreSQL
- Created dedicated PostgreSQL user and database
- Fixed TypeScript composite project references
- Installed missing pino-pretty dependency
- Got both dev servers running successfully

**Next session:**
- Add ESLint + Prettier configuration
- Create .gitignore
- Implement authentication schema and basic login endpoint

## Session Log

### Session 1 - 2024-XX-XX
**PostgreSQL over SQLite | Better native support on Windows/Node 24, scalable | 2025-12-21
- Created ProjectPlan.md
- Created progress.md
- Discussed tech stack

**Next session:**
- Start Phase 0: Initialize monorepo

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
| SQLite over Postgres | Zero config, file-based, perfect for single-Pi deployment | 2024-XX-XX |
| Session auth over JWT | Simpler for same-origin app, easier revocation | 2024-XX-XX |
| pnpm over npm/yarn | Faster, disk efficient, great monorepo support | 2024-XX-XX |

---

## Notes

- Keep phases small and shippable
- Each phase should result in something usable
- Don't skip to later phases - foundation matters
- Test on actual phone regularly, not just desktop

---

*Last updated: 2024-XX-XX*

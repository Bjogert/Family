# Family Hub - Project Plan

> A Raspberry Pi 5 hosted web app for the family: Robert, Julia, Tore (3yo), dogs Sam & Noa, and cat Björn.

## Overview

**Goal:** A simple, reliable family hub with grocery list management and Google Calendar integration.

**Core Principles:**
- Mobile-first (phones primary, tablets, Home Assistant OLED)
- Real-time sync between family devices
- Simple, maintainable code over clever architecture
- Secure (internet-exposed)
- Modular for future features

---

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Node.js 20 LTS | Stable, long-term support |
| **Language** | TypeScript | Type safety, better IDE support, catches bugs early |
| **Backend** | Fastify | Faster than Express, excellent TS support, lightweight |
| **Database** | SQLite + better-sqlite3 | Zero-config, file-based, synchronous API, perfect for Pi |
| **Validation** | Zod | Runtime validation + TS types from single source |
| **Frontend** | SvelteKit | Tiny bundles, simple syntax, great mobile perf, SSR built-in |
| **Styling** | Tailwind CSS | Utility-first, mobile-first, small production builds |
| **Real-time** | WebSocket (ws) | Native, lightweight, no Socket.io overhead |
| **Auth** | Session cookies | Simple, secure, httpOnly + secure flags |
| **Reverse Proxy** | Caddy | Automatic HTTPS, simple config |
| **Process Manager** | systemd | Rock-solid, built into Linux, auto-restart |
| **Package Manager** | pnpm | Fast, disk-efficient, great monorepo support |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Caddy (Reverse Proxy)                      │
│                    - Auto HTTPS (Let's Encrypt)                 │
│                    - Routes to backend                          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│    Fastify API Server    │    │   SvelteKit Frontend     │
│    (Port 3001)           │    │   (Port 3000)            │
│                          │    │                          │
│  - REST API              │    │  - SSR Pages             │
│  - WebSocket Server      │◄──►│  - Client hydration      │
│  - Auth middleware       │    │  - Tailwind styles       │
│  - Zod validation        │    │  - WebSocket client      │
└──────────────────────────┘    └──────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│      SQLite Database     │
│      (family-hub.db)     │
│                          │
│  - Groceries             │
│  - Sessions              │
│  - Settings              │
│  - Calendar cache        │
└──────────────────────────┘
```

---

## Folder Structure

```
family-hub/
├── apps/
│   ├── api/                          # Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── app.ts                # Fastify app setup
│   │   │   ├── config.ts             # Environment config
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Database connection
│   │   │   │   ├── schema.ts         # Table definitions
│   │   │   │   └── migrations/       # Schema migrations
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── routes.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   └── middleware.ts
│   │   │   │   ├── groceries/
│   │   │   │   │   ├── routes.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   └── repository.ts
│   │   │   │   └── calendar/
│   │   │   │       ├── routes.ts
│   │   │   │       ├── service.ts
│   │   │   │       └── google-client.ts
│   │   │   ├── websocket/
│   │   │   │   ├── index.ts          # WS server setup
│   │   │   │   └── handlers.ts       # Message handlers
│   │   │   └── utils/
│   │   │       ├── errors.ts
│   │   │       └── logger.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # SvelteKit frontend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── +layout.svelte    # Root layout
│       │   │   ├── +page.svelte      # Home/Dashboard
│       │   │   ├── login/
│       │   │   │   └── +page.svelte
│       │   │   ├── groceries/
│       │   │   │   └── +page.svelte
│       │   │   └── calendar/
│       │   │       └── +page.svelte
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── GroceryList.svelte
│       │   │   │   ├── GroceryItem.svelte
│       │   │   │   ├── CalendarView.svelte
│       │   │   │   ├── AddItemForm.svelte
│       │   │   │   └── Navigation.svelte
│       │   │   ├── stores/
│       │   │   │   ├── groceries.ts
│       │   │   │   ├── calendar.ts
│       │   │   │   └── auth.ts
│       │   │   ├── api/
│       │   │   │   └── client.ts     # API client wrapper
│       │   │   └── websocket/
│       │   │       └── client.ts     # WS connection
│       │   └── app.css               # Tailwind imports
│       ├── static/
│       │   ├── manifest.json         # PWA manifest
│       │   └── icons/
│       ├── package.json
│       ├── svelte.config.js
│       ├── tailwind.config.js
│       └── vite.config.ts
│
├── packages/
│   └── shared/                       # Shared types & schemas
│       ├── src/
│       │   ├── index.ts
│       │   ├── schemas/
│       │   │   ├── grocery.ts        # Zod schemas
│       │   │   ├── calendar.ts
│       │   │   └── auth.ts
│       │   └── types/
│       │       ├── grocery.ts        # TypeScript types
│       │       ├── calendar.ts
│       │       └── api.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── ProjectPlan.md                # This file
│   └── progress.md                   # Progress tracking
│
├── scripts/
│   ├── setup-pi.sh                   # Pi setup script
│   ├── backup.sh                     # Database backup
│   └── deploy.sh                     # Deployment script
│
├── .env.example
├── .gitignore
├── package.json                      # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

---

## Data Model (SQLite)

### Tables

```sql
-- Grocery items
CREATE TABLE groceries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    quantity INTEGER DEFAULT 1,
    unit TEXT,                          -- 'pcs', 'kg', 'liter', etc.
    is_bought INTEGER DEFAULT 0,        -- SQLite boolean
    added_by TEXT,                      -- 'robert', 'julia', or null
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    bought_at TEXT                      -- When marked as bought
);

-- Categories for groceries
CREATE TABLE grocery_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,                          -- Emoji or icon name
    sort_order INTEGER DEFAULT 0
);

-- Sessions for auth
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                -- UUID
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    user_agent TEXT
);

-- App settings (key-value store)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Google Calendar token storage
CREATE TABLE google_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Only one row
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    scope TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Calendar events cache
CREATE TABLE calendar_cache (
    id TEXT PRIMARY KEY,                -- Google event ID
    calendar_id TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    all_day INTEGER DEFAULT 0,
    location TEXT,
    color TEXT,
    raw_json TEXT,                      -- Full event JSON for future use
    cached_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_calendar_cache_start ON calendar_cache(start_time);
CREATE INDEX idx_groceries_category ON groceries(category);
CREATE INDEX idx_groceries_bought ON groceries(is_bought);
```

### Default Categories

```sql
INSERT INTO grocery_categories (name, icon, sort_order) VALUES
    ('produce', '🥬', 1),
    ('dairy', '🥛', 2),
    ('meat', '🥩', 3),
    ('bakery', '🍞', 4),
    ('frozen', '🧊', 5),
    ('beverages', '🥤', 6),
    ('snacks', '🍿', 7),
    ('household', '🧹', 8),
    ('pet', '🐕', 9),
    ('other', '📦', 10);
```

---

## API Design

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://family.yourdomain.com/api`

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with password |
| `/api/auth/logout` | POST | Destroy session |
| `/api/auth/status` | GET | Check if authenticated |

#### POST /api/auth/login
```typescript
// Request
{ password: string }

// Response 200
{ success: true }

// Response 401
{ error: "Invalid password" }
```

### Groceries

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groceries` | GET | Get all grocery items |
| `/api/groceries` | POST | Add new item |
| `/api/groceries/:id` | PATCH | Update item (mark bought, edit) |
| `/api/groceries/:id` | DELETE | Remove item |
| `/api/groceries/clear-bought` | POST | Remove all bought items |
| `/api/groceries/categories` | GET | Get all categories |

#### GET /api/groceries
```typescript
// Response 200
{
  items: Array<{
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    isBought: boolean;
    addedBy: string | null;
    createdAt: string;
    boughtAt: string | null;
  }>;
}
```

#### POST /api/groceries
```typescript
// Request
{
  name: string;           // Required, 1-100 chars
  category?: string;      // Default: 'other'
  quantity?: number;      // Default: 1
  unit?: string;
  addedBy?: string;
}

// Response 201
{ id: number; ...item }
```

#### PATCH /api/groceries/:id
```typescript
// Request (all optional)
{
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  isBought?: boolean;
}

// Response 200
{ ...updatedItem }
```

### Calendar

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calendar/events` | GET | Get events for date range |
| `/api/calendar/auth/url` | GET | Get Google OAuth URL |
| `/api/calendar/auth/callback` | GET | OAuth callback |
| `/api/calendar/auth/status` | GET | Check if Google connected |
| `/api/calendar/sync` | POST | Force refresh from Google |

#### GET /api/calendar/events
```typescript
// Query params
?start=2024-01-01&end=2024-01-31

// Response 200
{
  events: Array<{
    id: string;
    summary: string;
    description: string | null;
    startTime: string;          // ISO 8601
    endTime: string;
    allDay: boolean;
    location: string | null;
    color: string | null;
  }>;
  lastSynced: string;
}
```

### Validation Strategy

All request validation uses Zod schemas shared between frontend and backend:

```typescript
// packages/shared/src/schemas/grocery.ts
import { z } from 'zod';

export const CreateGrocerySchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().default('other'),
  quantity: z.number().int().positive().default(1),
  unit: z.string().max(20).optional(),
  addedBy: z.string().max(50).optional(),
});

export const UpdateGrocerySchema = CreateGrocerySchema.partial().extend({
  isBought: z.boolean().optional(),
});
```

### WebSocket Events

```typescript
// Client → Server
{ type: 'ping' }
{ type: 'subscribe', channel: 'groceries' }

// Server → Client
{ type: 'pong' }
{ type: 'grocery:added', item: GroceryItem }
{ type: 'grocery:updated', item: GroceryItem }
{ type: 'grocery:deleted', id: number }
{ type: 'grocery:cleared', ids: number[] }
```

---

## Google Calendar Integration

### OAuth Flow

1. User clicks "Connect Google Calendar"
2. Frontend redirects to `/api/calendar/auth/url`
3. API redirects to Google OAuth consent screen
4. User grants permissions
5. Google redirects to `/api/calendar/auth/callback?code=...`
6. API exchanges code for tokens, stores in DB
7. API redirects to frontend with success message

### Required Scopes

```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events.readonly
```

(Read-only for v1, can add write scopes later)

### Token Storage & Refresh

- Tokens stored encrypted in SQLite `google_tokens` table
- Access tokens expire in ~1 hour
- Before each API call, check if expired → refresh if needed
- Refresh tokens last indefinitely (unless revoked)

### Caching Strategy

1. **Initial sync:** Fetch events for next 30 days, store in `calendar_cache`
2. **Background refresh:** Every 15 minutes via cron/setInterval
3. **Manual refresh:** User can trigger via UI
4. **Cache TTL:** Events older than 7 days in the past are purged daily

### Google Cloud Setup

1. Create project at console.cloud.google.com
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://family.yourdomain.com/api/calendar/auth/callback`
5. Add family emails as test users (avoid verification requirement)

---

## Implementation Phases

### Phase 0: Project Setup (Foundation)
**Goal:** Empty project that runs

- [ ] Initialize monorepo with pnpm
- [ ] Set up TypeScript configs
- [ ] Create shared package structure
- [ ] Create API app skeleton (Fastify hello world)
- [ ] Create web app skeleton (SvelteKit hello world)
- [ ] Docker Compose for local dev (optional)
- [ ] Basic README

**Acceptance:** Both apps start, can see hello world pages

---

### Phase 1: Authentication
**Goal:** Secure the app with login

- [ ] SQLite database setup with better-sqlite3
- [ ] Sessions table and management
- [ ] Password hashing (bcrypt)
- [ ] Login API endpoint
- [ ] Auth middleware for protected routes
- [ ] Login page UI
- [ ] Session cookie handling
- [ ] Logout functionality
- [ ] Protected route redirects

**Acceptance:** Can't access app without password, session persists on refresh

---

### Phase 2: Groceries - Core CRUD
**Goal:** Basic grocery list management

- [ ] Groceries table and categories
- [ ] Zod schemas for groceries (shared package)
- [ ] CRUD API endpoints
- [ ] Grocery list page UI
- [ ] Add item form
- [ ] Mark item as bought (swipe or tap)
- [ ] Delete item
- [ ] Edit item
- [ ] Category filtering
- [ ] Mobile-optimized touch interactions

**Acceptance:** Can add, edit, mark bought, delete groceries on phone

---

### Phase 3: Real-Time Sync
**Goal:** Multiple devices stay in sync

- [ ] WebSocket server setup in Fastify
- [ ] Client WebSocket connection
- [ ] Broadcast on grocery changes
- [ ] Reconnection logic with backoff
- [ ] Optimistic UI updates
- [ ] Conflict handling (last-write-wins is fine)

**Acceptance:** Open on two phones, changes appear on both within 1 second

---

### Phase 4: PWA & Offline
**Goal:** Works like a native app

- [ ] Service worker setup
- [ ] PWA manifest (icons, theme, etc.)
- [ ] Offline grocery list viewing
- [ ] Add to home screen prompt
- [ ] Offline indicator in UI

**Acceptance:** Can view grocery list with airplane mode on, installable on phone

---

### Phase 5: Google Calendar
**Goal:** See family calendar events

- [ ] Google Cloud project setup
- [ ] OAuth flow implementation
- [ ] Token storage (encrypted)
- [ ] Token refresh logic
- [ ] Calendar API client
- [ ] Events fetching and caching
- [ ] Calendar view UI (week/month)
- [ ] Event details modal
- [ ] Auto-sync every 15 min
- [ ] Manual refresh button

**Acceptance:** Can see Julia's and Robert's Google Calendar events in app

---

### Phase 6: Polish & UX
**Goal:** Pleasant to use daily

- [ ] Dashboard home page
- [ ] Quick actions (add grocery shortcut)
- [ ] Better loading states
- [ ] Error handling UI
- [ ] Pull-to-refresh on mobile
- [ ] Dark mode support
- [ ] Family member avatars/colors
- [ ] Animations and transitions

**Acceptance:** Julia and Robert both say it feels nice to use

---

### Phase 7: Deployment
**Goal:** Running on Raspberry Pi

- [ ] Pi initial setup (OS, Node.js, etc.)
- [ ] Caddy configuration
- [ ] systemd service files
- [ ] Environment variables setup
- [ ] Domain and DNS setup
- [ ] HTTPS working
- [ ] Automated backups to cloud
- [ ] Health monitoring
- [ ] Update/deploy script

**Acceptance:** App accessible at https://family.yourdomain.com from anywhere

---

### Phase 8: Testing & Hardening
**Goal:** Confidence in reliability

- [ ] Unit tests for grocery service
- [ ] Unit tests for auth service
- [ ] Integration tests for API endpoints
- [ ] E2E test for critical flow (login → add grocery)
- [ ] Security audit (headers, CSRF, etc.)
- [ ] Rate limiting
- [ ] Error monitoring (optional: Sentry)

**Acceptance:** Tests pass, no obvious security holes

---

## Deployment Plan (Raspberry Pi 5)

### Prerequisites
- Raspberry Pi 5 (4GB+ RAM recommended)
- SSD via USB (not SD card for data - more reliable)
- Domain name pointing to home IP
- Router port forwarding (80, 443 → Pi)

### Software Stack
```bash
# OS
Raspberry Pi OS Lite (64-bit)

# Runtime
Node.js 20 LTS (via NodeSource)
pnpm (corepack enable)

# Reverse Proxy
Caddy (automatic HTTPS)

# Process Manager
systemd (built-in)
```

### Caddy Configuration
```caddyfile
family.yourdomain.com {
    # Frontend (SvelteKit)
    reverse_proxy /api/* localhost:3001
    reverse_proxy /* localhost:3000

    # WebSocket upgrade
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3001

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

### systemd Services

**API Service:** `/etc/systemd/system/family-hub-api.service`
```ini
[Unit]
Description=Family Hub API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/family-hub/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Web Service:** Similar for SvelteKit

### Backup Strategy
```bash
#!/bin/bash
# scripts/backup.sh - Run daily via cron

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/home/pi/backups"
DB_PATH="/home/pi/family-hub/data/family-hub.db"

# Backup SQLite (safe copy while running)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/family-hub-$DATE.db'"

# Compress
gzip "$BACKUP_DIR/family-hub-$DATE.db"

# Upload to Google Drive (using rclone)
rclone copy "$BACKUP_DIR/family-hub-$DATE.db.gz" gdrive:FamilyHub/backups/

# Keep only last 30 local backups
find "$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete
```

### Update Process
```bash
#!/bin/bash
# scripts/deploy.sh

cd /home/pi/family-hub
git pull origin main
pnpm install
pnpm build

sudo systemctl restart family-hub-api
sudo systemctl restart family-hub-web

echo "Deployed successfully!"
```

---

## Testing Plan

### Unit Tests (Vitest)
- Grocery service: CRUD operations, validation
- Auth service: Password hashing, session management
- Calendar service: Token refresh logic, cache management
- Shared schemas: Zod validation edge cases

### Integration Tests (Vitest + supertest)
- API endpoints with real SQLite (in-memory)
- Auth flow (login, protected routes, logout)
- WebSocket connection and events

### E2E Tests (Playwright - optional)
- Login flow
- Add grocery → appears in list
- Mark as bought → syncs to second browser
- Calendar loads events

### What NOT to Test
- SvelteKit routing (framework handles it)
- Tailwind classes (visual, not logic)
- SQLite itself (trust the library)

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Google OAuth complexity** | High | Medium | Use "testing" mode with whitelisted emails; detailed setup docs |
| **Token expiry/revocation** | Medium | High | Robust refresh logic; clear "reconnect" UI when broken |
| **Pi SD card failure** | Medium | High | Use USB SSD for data; daily cloud backups |
| **Power outage corrupts DB** | Low | High | SQLite WAL mode; backup before deploys |
| **Internet exposure attacks** | Medium | High | Rate limiting; strong password; Caddy security headers; fail2ban |
| **Home IP changes** | Medium | Low | Dynamic DNS (DuckDNS or similar) |
| **Dependency vulnerabilities** | Medium | Medium | Dependabot; minimal dependencies |
| **Pi runs out of memory** | Low | Medium | Monitor with systemd; Node.js memory limits |
| **Family forgets password** | Low | Medium | Password reset via env var; or physical access to Pi |

---

## Future Modules (Post-v1)

Designed for modular addition:

1. **Photo Sharing** - Upload and view family photos
2. **Chore Chart** - Track who did what chores
3. **Notes/Memo Board** - Shared family notes
4. **Pet Care** - Feeding schedules for Sam, Noa, Björn
5. **Meal Planning** - Weekly menu linked to groceries
6. **Calendar Write** - Create events from Family Hub

Each module follows the same pattern:
```
apps/api/src/modules/{module-name}/
  ├── routes.ts
  ├── service.ts
  └── repository.ts

apps/web/src/routes/{module-name}/
  └── +page.svelte

packages/shared/src/schemas/{module-name}.ts
```

---

## Environment Variables

```bash
# .env.example

# App
NODE_ENV=development
API_PORT=3001
WEB_PORT=3000

# Security
SESSION_SECRET=generate-a-random-32-char-string
FAMILY_PASSWORD_HASH=bcrypt-hash-of-your-password

# Database
DATABASE_PATH=./data/family-hub.db

# Google Calendar
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/auth/callback

# Encryption (for storing Google tokens)
ENCRYPTION_KEY=generate-a-random-32-char-string
```

---

## Getting Started

```bash
# Clone and install
git clone <repo>
cd family-hub
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Development
pnpm dev          # Runs both API and web

# Build
pnpm build        # Builds both apps

# Test
pnpm test         # Runs all tests
```

---

*Last updated: 2024-01-XX*
*Next step: Phase 0 - Project Setup*

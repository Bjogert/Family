# Tempus Integration - Quick Start Guide

> A quick reference for implementing the Tempus Hemma API integration in Family Hub

## What is Tempus?

Tempus Hemma is a Swedish childcare management system used by municipalities and preschools for:
- Child enrollment and information
- Attendance tracking
- Absence registration
- Schedule management

## Implementation Overview

### Total Effort: 30 hours
Divided into 6 phases:
1. **Phase 0**: Prerequisites (2h)
2. **Phase 1**: Setup & Authentication (5h)
3. **Phase 2**: Children & Departments (5h)
4. **Phase 3**: Absences (7h)
5. **Phase 4**: Attendance Tracking (5h)
6. **Phase 5**: Schedules & Polish (6h)

---

## Phase 0: Prerequisites (2 hours)

### Tasks
1. Add environment variables
2. Install dependencies
3. Create encryption utility
4. Set up module structure

### Commands
```bash
# Install dependencies
cd apps/api
pnpm add axios@^1.6.0 node-cron@^3.0.0

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Files to Create
```
apps/api/src/utils/encryption.ts
apps/api/src/modules/tempus/
├── routes.ts
├── service.ts
├── repository.ts
├── tempusClient.ts
└── types.ts

apps/web/src/routes/tempus/
├── +page.svelte
└── children/[id]/+page.svelte

packages/shared/src/schemas/tempus.ts
```

### Environment Variables (.env)
```bash
TEMPUS_ENCRYPTION_KEY=<64-char-hex-string>
TEMPUS_RATE_LIMIT_PER_MINUTE=60
TEMPUS_CACHE_REFRESH_HOURS=6
TEMPUS_BACKGROUND_SYNC=true
TEMPUS_SYNC_INTERVAL_MINUTES=360
```

---

## Phase 1: Setup & Authentication (5 hours)

### Database Tables to Create
```sql
-- Run: scripts/create_tempus_tables.sql

CREATE TABLE tempus_credentials (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    username_encrypted TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    county VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tempus_children (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    ssn_encrypted VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    department_id VARCHAR(50),
    department_name VARCHAR(200),
    enrollment_date DATE,
    special_diet BOOLEAN DEFAULT false,
    special_diet_notes TEXT,
    avatar_url TEXT,
    raw_data JSONB,
    cached_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_family_ssn UNIQUE (family_id, ssn_encrypted)
);
```

### API Endpoints to Implement
- `POST /api/tempus/setup` - Configure Tempus credentials
- `GET /api/tempus/setup` - Check if configured
- `DELETE /api/tempus/setup` - Remove integration
- `POST /api/tempus/test` - Test credentials
- `GET /api/tempus/counties` - List municipalities

### Core Files
1. **tempusClient.ts**: API wrapper
2. **encryption.ts**: Encrypt/decrypt utilities
3. **routes.ts**: Setup endpoints
4. **service.ts**: Business logic

### Testing Checklist
- [ ] Can encrypt and decrypt credentials
- [ ] Can store credentials in database
- [ ] Can authenticate with Tempus API
- [ ] Can list available counties
- [ ] Error handling for invalid credentials

---

## Phase 2: Children & Departments (5 hours)

### Database Tables to Create
```sql
CREATE TABLE tempus_departments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    tempus_department_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    age_group VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    raw_data JSONB,
    cached_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_family_dept UNIQUE (family_id, tempus_department_id)
);
```

### API Endpoints to Implement
- `GET /api/tempus/children` - List all children
- `GET /api/tempus/children/:id` - Get child details

### UI Components
- Children dashboard (`/tempus`)
- Individual child view (`/tempus/children/[id]`)
- Refresh button
- Cache timestamp display

### Testing Checklist
- [ ] Can fetch children from Tempus
- [ ] Children are cached in database
- [ ] Can view children list
- [ ] Can view individual child
- [ ] Manual refresh works
- [ ] Shows cache age

---

## Phase 3: Absences (7 hours)

### Database Tables to Create
```sql
CREATE TABLE tempus_absences (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES tempus_children(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    from_time TIME,
    to_time TIME,
    reason VARCHAR(50),
    comment TEXT,
    is_full_day BOOLEAN DEFAULT true,
    registered_by INTEGER REFERENCES users(id),
    registered_at TIMESTAMP DEFAULT NOW(),
    tempus_id VARCHAR(100),
    synced_to_tempus BOOLEAN DEFAULT false,
    sync_error TEXT,
    cached_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints to Implement
- `GET /api/tempus/children/:id/absences` - List absences
- `POST /api/tempus/children/:id/absences` - Register absence
- `DELETE /api/tempus/children/:id/absences/:absenceId` - Cancel absence

### UI Components
- Absence list view
- Absence registration form
- Date picker
- Reason selector
- Sync status indicator

### Testing Checklist
- [ ] Can view absences
- [ ] Can register full-day absence
- [ ] Can register partial-day absence
- [ ] Can cancel absence
- [ ] Syncs to Tempus API
- [ ] Shows sync errors
- [ ] Can retry failed syncs

---

## Phase 4: Attendance Tracking (5 hours)

### Database Tables to Create
```sql
CREATE TABLE tempus_attendance (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES tempus_children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    checked_in TIME,
    checked_out TIME,
    is_present BOOLEAN DEFAULT false,
    planned_arrival TIME,
    planned_departure TIME,
    notes TEXT,
    cached_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_child_date UNIQUE (child_id, date)
);

CREATE TABLE tempus_sync_log (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### API Endpoints to Implement
- `GET /api/tempus/children/:id/attendance` - Get attendance history
- `POST /api/tempus/sync` - Manual sync trigger

### UI Components
- Attendance calendar view
- Attendance statistics
- Sync button
- Last sync timestamp

### Background Jobs
```typescript
// apps/api/src/modules/tempus/scheduler.ts
import cron from 'node-cron';

// Sync every 6 hours at minute 0 (runs at 00:00, 06:00, 12:00, 18:00)
cron.schedule('0 */6 * * *', async () => {
  // Sync attendance for all families with Tempus enabled
});
```

### Testing Checklist
- [ ] Can view attendance history
- [ ] Shows check-in/check-out times
- [ ] Displays attendance statistics
- [ ] Background sync works
- [ ] Manual sync works
- [ ] Cache refresh logic correct

---

## Phase 5: Schedules & Polish (6 hours)

### Database Tables to Create
```sql
CREATE TABLE tempus_schedules (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES tempus_children(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    effective_from DATE,
    effective_to DATE,
    notes TEXT,
    cached_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints to Implement
- `GET /api/tempus/children/:id/schedule` - Get weekly schedule

### UI Components
- Weekly schedule view
- Loading states & skeletons
- Pull-to-refresh (mobile)
- Error messages
- Empty states

### Polish Tasks
- [ ] Add loading spinners
- [ ] Add skeleton screens
- [ ] Implement pull-to-refresh
- [ ] Improve error messages
- [ ] Add empty states
- [ ] Test on mobile devices
- [ ] Write user documentation

---

## Key Security Considerations

### 1. Encryption
- Use AES-256-GCM for all sensitive data
- Encrypt: API keys, credentials, SSNs
- Never log sensitive data
- Rotate keys if compromised

### 2. Access Control
- All queries scoped by `family_id`
- Session validation on every request
- Users can only see their own family's data

### 3. GDPR Compliance
- Encrypt personal data (SSN, names)
- Implement data export/deletion
- Document data retention policy
- User consent for Tempus integration

### 4. API Rate Limiting
- Respect Tempus API limits (60/min default)
- Implement client-side rate limiting
- Use aggressive caching
- Background jobs for batch operations

---

## Testing Strategy

### Unit Tests
```bash
# In apps/api/
pnpm test modules/tempus/tempusClient.test.ts
pnpm test modules/tempus/service.test.ts
pnpm test modules/tempus/repository.test.ts
```

### Integration Tests
```bash
pnpm test:integration tempus
```

### Manual Testing
Use the checklist in `docs/TempusIntegrationPlan.md` section "Manual Testing Checklist"

---

## Troubleshooting

### "Connection failed to Tempus API"
- Check API key, username, password
- Verify county code is correct
- Check network connectivity
- Verify Tempus API is online

### "Encryption key invalid"
- Ensure TEMPUS_ENCRYPTION_KEY is 64-char hex string
- Regenerate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Update .env and restart API server

### "No children found"
- Verify credentials have access to children data
- Check municipality/county code
- Verify API user permissions in Tempus

### "Sync failed"
- Check sync_log table for error messages
- Verify Tempus API is accessible
- Check rate limiting
- Retry manual sync

---

## Resources

- **Full Plan**: `docs/TempusIntegrationPlan.md`
- **Tempus API Docs**: https://rest.tempusinfo.se/tempusRest/docs/
- **Family Hub Architecture**: `CLAUDE.md`
- **Project Plan**: `ProjectPlan.md`

---

## Next Steps

1. **Phase 0**: Start with prerequisites
   - Generate encryption key
   - Install dependencies
   - Create module structure

2. **Phase 1**: Implement setup & auth
   - Create database tables
   - Build Tempus client
   - Test with real credentials

3. **Iterate**: Work through phases 2-5
   - Test each phase thoroughly
   - Document as you go
   - Get user feedback

---

*Created: 2024-12-25*  
*For: Family Hub - Tempus Hemma Integration*

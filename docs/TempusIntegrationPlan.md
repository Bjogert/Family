# Tempus Hemma API Integration Plan

> Integration plan for Tempus Hemma (Swedish childcare management system) API into Family Hub

## Table of Contents
1. [Overview](#overview)
2. [Tempus API Summary](#tempus-api-summary)
3. [Integration Goals](#integration-goals)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Implementation Phases](#implementation-phases)
8. [Environment Variables](#environment-variables)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)

---

## Overview

**Tempus Hemma** is a Swedish childcare management system used by municipalities and preschools to manage:
- Child information and enrollment
- Attendance tracking
- Absence registration
- Schedule management
- Department/class information
- Special dietary needs

**Integration Purpose:**  
Enable Family Hub users to view their children's preschool/daycare information, register absences, and track attendance directly from the family dashboard.

---

## Tempus API Summary

### Base URL
```
https://rest.tempusinfo.se/tempusRest/admin/v1
```

### Authentication
All API requests require:
- **API Key**: Sent in `x-api-key` header
- **HTTP Basic Auth**: Username and password (base64 encoded)
- **Municipality/County**: Sent in `x-county` header
- **Content Type**: `application/json;charset=UTF-8`

### Key Endpoints We'll Use

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/counties` | GET | List municipalities (no auth required) |
| `/children` | GET | Get all children for authenticated user |
| `/children/ssn/{ssn}` | GET | Get specific child by SSN |
| `/children/ssn/{ssn}/absence` | GET | Get child absences |
| `/children/ssn/{ssn}/absence` | POST | Register new absence |
| `/departments` | GET | Get departments (classes/groups) |
| `/departments/{id}/children` | GET | Get children in a department |
| `/departments/{id}/absences` | GET | Get department absences |
| `/departments/{id}/attendance` | GET | Get department attendance |
| `/departments/{id}/schedules` | GET | Get department schedules |
| `/api_user/privileges` | GET | Get API user permissions |

### Data Models

**Child Information:**
```json
{
  "ssn": "YYYYMMDD-XXXX",
  "firstName": "Tore",
  "lastName": "Bjogert",
  "gender": "M",
  "departmentId": 12345,
  "specialDiet": false,
  "enrollmentDate": "2022-09-01",
  "parentContacts": [
    {
      "name": "Robert Bjogert",
      "phone": "+46701234567",
      "email": "robert@example.com",
      "relation": "father"
    }
  ]
}
```

**Absence Information:**
```json
{
  "childSsn": "YYYYMMDD-XXXX",
  "fromDate": "2024-01-15",
  "toDate": "2024-01-16",
  "fromTime": "08:00",
  "toTime": "17:00",
  "reason": "sick",
  "comment": "Fever"
}
```

**Attendance Information:**
```json
{
  "childSsn": "YYYYMMDD-XXXX",
  "date": "2024-01-15",
  "checkedIn": "08:15",
  "checkedOut": "16:30",
  "isPresent": true
}
```

---

## Integration Goals

### Phase 1 Goals (MVP)
1. **View Children**: Display family's enrolled children
2. **Check Attendance**: See today's attendance status
3. **View Absences**: List upcoming and past absences
4. **Register Absence**: Report child sick/absent

### Phase 2 Goals (Enhanced)
1. **Schedule View**: See weekly schedules
2. **Department Info**: View teachers, other children (if permitted)
3. **Notifications**: Alerts for pickup times, special events
4. **Historical Data**: Attendance statistics

### Phase 3 Goals (Advanced)
1. **Multiple Children**: Support families with multiple kids
2. **Sync to Calendar**: Add schedules to Google Calendar
3. **Meal Planning Integration**: Link special diets to grocery suggestions
4. **Multi-Municipality**: Support if family has children in different municipalities

---

## Architecture

### Module Structure
Following Family Hub's existing pattern:

```
apps/api/src/modules/tempus/
├── routes.ts          # Fastify route handlers
├── service.ts         # Business logic
├── repository.ts      # Database access
├── tempusClient.ts    # Tempus API wrapper
└── types.ts           # TypeScript interfaces

apps/web/src/routes/tempus/
├── +page.svelte       # Main children dashboard
├── children/
│   └── [id]/
│       └── +page.svelte  # Individual child view
└── absences/
    └── +page.svelte   # Absence management

packages/shared/src/schemas/
└── tempus.ts          # Zod validation schemas
```

### Data Flow

```
┌─────────────────────────────────────────────────┐
│           SvelteKit Frontend                    │
│  - Children dashboard                           │
│  - Absence registration form                    │
│  - Attendance calendar view                     │
└─────────────────────────────────────────────────┘
                    ▲ │
                    │ ▼
┌─────────────────────────────────────────────────┐
│         Fastify API (Family Hub)                │
│  /api/tempus/*                                  │
│  - Authentication middleware                    │
│  - Family context                               │
│  - Rate limiting                                │
└─────────────────────────────────────────────────┘
                    ▲ │
                    │ ▼
┌─────────────────────────────────────────────────┐
│         Tempus API Client                       │
│  - Token management                             │
│  - Request/response mapping                     │
│  - Error handling                               │
└─────────────────────────────────────────────────┘
                    ▲ │
                    │ ▼
┌─────────────────────────────────────────────────┐
│     Tempus REST API (External)                  │
│  rest.tempusinfo.se                             │
└─────────────────────────────────────────────────┘
                    ▲ │
                    │ ▼
┌─────────────────────────────────────────────────┐
│         PostgreSQL Database                     │
│  - Cached child data                            │
│  - Tempus credentials (encrypted)               │
│  - Absence history                              │
│  - Attendance cache                             │
└─────────────────────────────────────────────────┘
```

### Caching Strategy

**Why Cache?**
- Reduce API calls to Tempus (may have rate limits)
- Faster response times for families
- Offline viewing of recent data
- Reduce dependency on external service

**What to Cache:**
- Child information (refresh daily or on-demand)
- Attendance records (last 30 days)
- Absence records (upcoming + last 90 days)
- Department information (refresh weekly)

**Cache Invalidation:**
- Manual refresh button in UI
- Auto-refresh on page load if > 4 hours old
- Background job every 6 hours (configurable)
- Immediate cache clear after posting new absence

---

## Database Schema

### New Tables

```sql
-- Tempus API credentials (encrypted, per family)
CREATE TABLE tempus_credentials (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    username_encrypted TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    county VARCHAR(100) NOT NULL,              -- Municipality/customer code
    is_active BOOLEAN DEFAULT true,
    last_verified TIMESTAMP,                   -- Last successful API call
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_tempus_family 
        FOREIGN KEY (family_id) 
        REFERENCES families(id) 
        ON DELETE CASCADE
);

-- Children information cache
CREATE TABLE tempus_children (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    ssn_encrypted VARCHAR(255) NOT NULL,       -- Swedish personal number (encrypted)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),                        -- 'M', 'F', or other
    birth_date DATE,
    department_id VARCHAR(50),                 -- Tempus department ID
    department_name VARCHAR(200),
    enrollment_date DATE,
    special_diet BOOLEAN DEFAULT false,
    special_diet_notes TEXT,
    avatar_url TEXT,                           -- From Tempus if available
    raw_data JSONB,                            -- Full Tempus response for future use
    cached_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_family_ssn 
        UNIQUE (family_id, ssn_encrypted)
);

-- Absences cache and history
CREATE TABLE tempus_absences (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES tempus_children(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    from_time TIME,
    to_time TIME,
    reason VARCHAR(50),                        -- 'sick', 'vacation', 'other'
    comment TEXT,
    is_full_day BOOLEAN DEFAULT true,
    registered_by INTEGER REFERENCES users(id), -- Which family member registered
    registered_at TIMESTAMP DEFAULT NOW(),
    tempus_id VARCHAR(100),                    -- Tempus absence ID (if available)
    synced_to_tempus BOOLEAN DEFAULT false,
    sync_error TEXT,                           -- Error message if sync failed
    cached_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_absence_family 
        FOREIGN KEY (family_id) 
        REFERENCES families(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_absence_child 
        FOREIGN KEY (child_id) 
        REFERENCES tempus_children(id) 
        ON DELETE CASCADE
);

-- Attendance cache
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
    
    CONSTRAINT unique_child_date 
        UNIQUE (child_id, date),
    CONSTRAINT fk_attendance_family 
        FOREIGN KEY (family_id) 
        REFERENCES families(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_attendance_child 
        FOREIGN KEY (child_id) 
        REFERENCES tempus_children(id) 
        ON DELETE CASCADE
);

-- Departments/classes cache
CREATE TABLE tempus_departments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    tempus_department_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),                          -- 'preschool', 'daycare', etc.
    age_group VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    raw_data JSONB,
    cached_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_family_dept 
        UNIQUE (family_id, tempus_department_id)
);

-- Schedules cache
CREATE TABLE tempus_schedules (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES tempus_children(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,              -- 0=Monday, 6=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    effective_from DATE,
    effective_to DATE,
    notes TEXT,
    cached_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_schedule_family 
        FOREIGN KEY (family_id) 
        REFERENCES families(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_schedule_child 
        FOREIGN KEY (child_id) 
        REFERENCES tempus_children(id) 
        ON DELETE CASCADE
);

-- API sync log (for debugging and monitoring)
CREATE TABLE tempus_sync_log (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,            -- 'children', 'absences', 'attendance'
    status VARCHAR(20) NOT NULL,               -- 'success', 'error', 'partial'
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    CONSTRAINT fk_sync_log_family 
        FOREIGN KEY (family_id) 
        REFERENCES families(id) 
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_tempus_children_family ON tempus_children(family_id);
CREATE INDEX idx_tempus_absences_family ON tempus_absences(family_id);
CREATE INDEX idx_tempus_absences_child ON tempus_absences(child_id);
CREATE INDEX idx_tempus_absences_dates ON tempus_absences(from_date, to_date);
CREATE INDEX idx_tempus_attendance_family ON tempus_attendance(family_id);
CREATE INDEX idx_tempus_attendance_child ON tempus_attendance(child_id);
CREATE INDEX idx_tempus_attendance_date ON tempus_attendance(date);
CREATE INDEX idx_tempus_sync_log_family ON tempus_sync_log(family_id);
```

---

## API Endpoints

### Family Hub API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/tempus/setup` | POST | Setup Tempus credentials for family | Yes |
| `/api/tempus/setup` | GET | Check if Tempus is configured | Yes |
| `/api/tempus/setup` | DELETE | Remove Tempus integration | Yes |
| `/api/tempus/test` | POST | Test Tempus credentials | Yes |
| `/api/tempus/children` | GET | Get family's children | Yes |
| `/api/tempus/children/:id` | GET | Get specific child details | Yes |
| `/api/tempus/children/:id/absences` | GET | Get child absences | Yes |
| `/api/tempus/children/:id/absences` | POST | Register new absence | Yes |
| `/api/tempus/children/:id/absences/:absenceId` | DELETE | Cancel absence | Yes |
| `/api/tempus/children/:id/attendance` | GET | Get attendance history | Yes |
| `/api/tempus/children/:id/schedule` | GET | Get child's schedule | Yes |
| `/api/tempus/sync` | POST | Manually trigger sync | Yes |
| `/api/tempus/counties` | GET | List available municipalities | No |

### Endpoint Details

#### POST /api/tempus/setup
Setup Tempus integration for the family.

**Request:**
```typescript
{
  apiKey: string;         // Tempus API key
  username: string;       // Tempus username
  password: string;       // Tempus password
  county: string;         // Municipality code
}
```

**Response:**
```typescript
{
  success: true;
  message: "Tempus integration configured";
  childrenFound: number;
}
```

#### GET /api/tempus/children
Get all children for the authenticated family.

**Query Parameters:**
- `refresh=true` - Force refresh from Tempus API (optional)

**Response:**
```typescript
{
  children: [
    {
      id: number;
      firstName: string;
      lastName: string;
      birthDate: string;
      gender: string;
      department: {
        id: string;
        name: string;
      };
      specialDiet: boolean;
      cachedAt: string;
    }
  ];
  lastSync: string;
}
```

#### POST /api/tempus/children/:id/absences
Register a new absence for a child.

**Request:**
```typescript
{
  fromDate: string;      // ISO date
  toDate: string;        // ISO date
  fromTime?: string;     // HH:MM (optional for full day)
  toTime?: string;       // HH:MM (optional for full day)
  reason: 'sick' | 'vacation' | 'other';
  comment?: string;
}
```

**Response:**
```typescript
{
  success: true;
  absence: {
    id: number;
    fromDate: string;
    toDate: string;
    reason: string;
    syncedToTempus: boolean;
  };
}
```

#### GET /api/tempus/children/:id/attendance
Get attendance history for a child.

**Query Parameters:**
- `from=YYYY-MM-DD` - Start date (default: 30 days ago)
- `to=YYYY-MM-DD` - End date (default: today)
- `refresh=true` - Force refresh from Tempus API (optional)

**Response:**
```typescript
{
  attendance: [
    {
      date: string;
      checkedIn: string;
      checkedOut: string;
      isPresent: boolean;
      plannedArrival: string;
      plannedDeparture: string;
    }
  ];
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    averageHours: number;
  };
}
```

---

## Implementation Phases

### Phase 0: Prerequisites
**Duration:** 2 hours  
**Goal:** Prepare infrastructure

**Tasks:**
1. Add environment variables to `.env.example`
2. Install dependencies: `axios` for HTTP requests, `crypto` for encryption
3. Create encryption utility for storing Tempus credentials
4. Add Tempus module folder structure

**Deliverables:**
- Updated `.env.example`
- Encryption utility in `apps/api/src/utils/encryption.ts`
- Empty module structure

---

### Phase 1: Setup & Authentication
**Duration:** 5 hours  
**Goal:** Enable families to connect their Tempus account

**Tasks:**
1. Create database tables (credentials, children, departments)
2. Build Tempus API client wrapper (`tempusClient.ts`)
3. Implement credential encryption/decryption
4. Create setup endpoints (POST, GET, DELETE `/api/tempus/setup`)
5. Create test connection endpoint
6. Build setup UI page in frontend
7. Test with actual Tempus credentials (if available)

**Deliverables:**
- Database migrations for Tempus tables
- Working Tempus API client
- Setup UI with credential form
- Connection test functionality

**Success Criteria:**
- Can store encrypted Tempus credentials
- Can successfully authenticate with Tempus API
- Can retrieve list of counties/municipalities
- Error handling for invalid credentials

---

### Phase 2: Children & Departments
**Duration:** 5 hours  
**Goal:** Display family's enrolled children

**Tasks:**
1. Implement children sync from Tempus API
2. Create repository methods for children CRUD
3. Build GET `/api/tempus/children` endpoint
4. Build GET `/api/tempus/children/:id` endpoint
5. Create children dashboard UI
6. Add child profile view
7. Implement cache refresh logic

**Deliverables:**
- Children data sync
- Children list view
- Individual child profile page
- Refresh functionality

**Success Criteria:**
- Can see all enrolled children
- Children data is cached for performance
- Can manually refresh data
- Shows department/class information

---

### Phase 3: Absences
**Duration:** 7 hours  
**Goal:** View and register child absences

**Tasks:**
1. Implement absence sync from Tempus API
2. Create absence repository methods
3. Build GET `/api/tempus/children/:id/absences` endpoint
4. Build POST `/api/tempus/children/:id/absences` endpoint
5. Build DELETE `/api/tempus/children/:id/absences/:absenceId` endpoint
6. Create absence list UI
7. Create absence registration form
8. Add validation for absence dates
9. Implement sync status indicators

**Deliverables:**
- Absence listing by child
- Absence registration form
- Absence cancellation
- Sync status feedback

**Success Criteria:**
- Can view upcoming absences
- Can register new absence
- Absence syncs to Tempus API
- Shows clear error messages if sync fails
- Can retry failed syncs

---

### Phase 4: Attendance Tracking
**Duration:** 5 hours  
**Goal:** View attendance history and statistics

**Tasks:**
1. Implement attendance sync from Tempus API
2. Create attendance repository methods
3. Build GET `/api/tempus/children/:id/attendance` endpoint
4. Create attendance calendar view UI
5. Add attendance statistics
6. Implement background sync job

**Deliverables:**
- Attendance history view
- Attendance statistics (days present, average hours)
- Calendar visualization
- Background sync for attendance data

**Success Criteria:**
- Can view attendance for last 30 days
- Shows check-in and check-out times
- Displays attendance statistics
- Auto-refreshes daily

---

### Phase 5: Schedules & Polish
**Duration:** 6 hours  
**Goal:** Complete the integration with schedules and UX polish

**Tasks:**
1. Implement schedule sync from Tempus API
2. Create schedule repository methods
3. Build GET `/api/tempus/children/:id/schedule` endpoint
4. Create weekly schedule view UI
5. Add schedule to Google Calendar integration (optional)
6. Implement comprehensive error handling
7. Add loading states and skeletons
8. Add pull-to-refresh on mobile
9. Create user documentation

**Deliverables:**
- Weekly schedule view
- Google Calendar export (optional)
- Polished UI with loading states
- User guide

**Success Criteria:**
- Can view weekly schedule
- Can export to Google Calendar (optional)
- Smooth user experience
- Clear documentation

---

### Phase 6: Advanced Features (Future)
**Duration:** TBD  
**Goal:** Enhanced functionality

**Possible Features:**
1. **Multiple Children Support**: Handle families with 2+ children elegantly
2. **Push Notifications**: Remind about pickup times, notify of schedule changes
3. **Meal Planning Integration**: Link special diets to grocery suggestions
4. **Attendance Predictions**: "Tore usually gets picked up at 4pm on Tuesdays"
5. **Report Generation**: Monthly attendance reports, absence summaries
6. **Multi-Municipality**: Support children in different municipalities
7. **Offline Mode**: Register absences offline, sync when online
8. **Contact Information**: View teachers, other parents (if permitted by Tempus)

---

## Environment Variables

Add to `.env.example` and `.env`:

```bash
# ===========================================
# Tempus API Configuration
# ===========================================

# Tempus Hemma Integration
# Set these if your family uses Tempus for childcare management
# Leave empty to disable Tempus features

# Encryption key for storing Tempus credentials (64-character hex string)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example format: a1b2c3d4e5f6... (64 hex characters total)
TEMPUS_ENCRYPTION_KEY=

# Tempus API rate limiting (requests per minute)
TEMPUS_RATE_LIMIT=60

# Cache refresh interval (hours)
TEMPUS_CACHE_REFRESH_HOURS=6

# Background sync enabled (true/false)
TEMPUS_BACKGROUND_SYNC=true

# Background sync interval (minutes)
TEMPUS_SYNC_INTERVAL_MINUTES=360
```

### Required Secrets (Per Family)
These are stored encrypted in the database, not in .env:
- `TEMPUS_API_KEY` - From Tempus
- `TEMPUS_USERNAME` - From Tempus
- `TEMPUS_PASSWORD` - From Tempus
- `TEMPUS_COUNTY` - Municipality code

---

## Security Considerations

### 1. Credential Storage
**Risk:** Storing Tempus API credentials  
**Mitigation:**
- Encrypt all credentials using AES-256-GCM
- Use unique encryption key per deployment
- Never log credentials
- Credentials scoped to family, not shared

### 2. Swedish Personal Numbers (SSN)
**Risk:** Sensitive personal data  
**Mitigation:**
- Encrypt SSNs in database
- Never expose SSNs in API responses to frontend
- Use integer IDs for all child references in UI
- Comply with GDPR requirements
- Implement data retention policy

### 3. API Key Exposure
**Risk:** Tempus API key leaked  
**Mitigation:**
- Never send to frontend
- Store encrypted in database
- Rotate keys if compromised
- Rate limit API calls
- Monitor for unusual activity

### 4. Data Privacy
**Risk:** Child data visible to wrong family  
**Mitigation:**
- All queries scoped by `family_id`
- Session validation on every request
- Row-level security checks
- Audit log for sensitive operations

### 5. External API Failures
**Risk:** Tempus API unavailable  
**Mitigation:**
- Graceful degradation (show cached data)
- Clear error messages
- Retry logic with exponential backoff
- Manual sync option
- Monitor Tempus API status

### 6. Rate Limiting
**Risk:** Overwhelming Tempus API  
**Mitigation:**
- Client-side rate limiting (60 req/min)
- Cache aggressively
- Background jobs for batch operations
- Respect Tempus API limits

---

## Testing Strategy

### Unit Tests
1. **Tempus Client:**
   - Request formatting
   - Response parsing
   - Error handling
   - Token refresh logic

2. **Repository:**
   - CRUD operations
   - Encryption/decryption
   - Query scoping by family_id

3. **Service:**
   - Business logic
   - Cache invalidation
   - Data transformation

### Integration Tests
1. **API Endpoints:**
   - Authentication required
   - Family isolation
   - Input validation (Zod schemas)
   - Error responses

2. **Tempus API Integration:**
   - Mock Tempus responses
   - Test credential validation
   - Test data sync
   - Test error scenarios

### E2E Tests (Optional)
1. **Setup Flow:**
   - Navigate to Tempus setup
   - Enter credentials
   - Verify children loaded

2. **Absence Registration:**
   - Navigate to child profile
   - Register absence
   - Verify in list

### Manual Testing Checklist
- [ ] Setup Tempus with valid credentials
- [ ] Setup Tempus with invalid credentials (should fail gracefully)
- [ ] View children list
- [ ] View individual child
- [ ] Register full-day absence
- [ ] Register partial-day absence
- [ ] Cancel absence
- [ ] View attendance history
- [ ] View weekly schedule
- [ ] Test with multiple children
- [ ] Test cache refresh
- [ ] Test offline behavior (show cached data)
- [ ] Test session expiry during Tempus operation
- [ ] Test with family that has no Tempus setup

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Tempus API changes** | Medium | High | Abstract Tempus client, version API responses, monitor Tempus docs |
| **SSN encryption key lost** | Low | Critical | Backup encryption key securely, document recovery process |
| **Tempus credentials expire** | Medium | Medium | Auto-detect expired credentials, prompt user to re-authenticate |
| **Municipality changes** | Low | Medium | Support county/municipality updates in settings |
| **Multiple children with different SSNs** | Medium | Low | Test with multi-child families, use batch operations |
| **Tempus API rate limits** | Medium | Medium | Aggressive caching, respect limits, background jobs |
| **GDPR compliance** | High | Critical | Encrypt PII, implement data retention, allow data export/deletion |
| **Child graduates/leaves preschool** | High | Low | Archive old children, don't auto-delete (user choice) |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Setup Success Rate** | >90% | Families who successfully connect Tempus / Total attempts |
| **Absence Registration** | <30 seconds | Time from "Report Absent" click to confirmation |
| **Sync Reliability** | 99% | Successful syncs / Total sync attempts |
| **Cache Hit Rate** | >80% | Requests served from cache / Total requests |
| **User Adoption** | 50% of families with children | Families using Tempus / Families with children |
| **API Response Time** | <500ms | 95th percentile response time for cached data |

---

## User Flow Examples

### Setup Tempus Integration
1. User logs into Family Hub
2. Navigates to Settings → Integrations
3. Clicks "Connect Tempus"
4. Enters municipality, API key, username, password
5. Clicks "Test Connection"
6. System validates credentials, fetches children
7. Shows success: "Found 1 child: Tore"
8. User clicks "Save"
9. Returns to dashboard, now shows "Tempus" card

### Register Child Absent
1. User opens Family Hub on phone
2. Sees "Children" card with Tore's photo
3. Taps "Tore"
4. Taps "Register Absence"
5. Selects date range: "Tomorrow"
6. Selects reason: "Sick"
7. Adds comment: "Fever, staying home"
8. Taps "Submit"
9. Shows loading spinner
10. Shows success: "Absence registered with Tempus"
11. Returns to Tore's profile, absence now listed

### View Attendance
1. User opens Tore's profile
2. Scrolls to "Attendance" section
3. Sees calendar for current month
4. Green days = present, red = absent, gray = weekend/holiday
5. Taps a specific day
6. Shows detail: "Checked in 8:15, checked out 16:30"
7. Sees statistics: "Present 18 of 20 days this month"

---

## Technical Notes

### Tempus API Quirks (Based on Documentation)
1. **SSN Format**: Swedish personal number format `YYYYMMDD-XXXX`
2. **Date Format**: ISO 8601 (`YYYY-MM-DD`)
3. **Time Format**: `HH:MM` (24-hour)
4. **Character Encoding**: UTF-8 required
5. **County Header**: Required for all authenticated calls
6. **Basic Auth**: Username:password base64 encoded
7. **Error Responses**: May vary, need robust parsing

### Encryption Implementation
```typescript
// Use Node.js crypto module
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    Buffer.from(key, 'hex'), 
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = text.split(':');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Tempus API Client Example
```typescript
// apps/api/src/modules/tempus/tempusClient.ts
import axios from 'axios';

const TEMPUS_BASE_URL = 'https://rest.tempusinfo.se/tempusRest/admin/v1';

/**
 * Tempus API credentials for authentication
 */
export interface TempusCredentials {
  /** API key provided by Tempus */
  apiKey: string;
  /** Username for Basic Auth */
  username: string;
  /** Password for Basic Auth */
  password: string;
  /** Municipality/customer code (e.g., 'landvetter', 'gothenburg') */
  county: string;
}

export class TempusClient {
  private credentials: TempusCredentials;
  
  constructor(credentials: TempusCredentials) {
    this.credentials = credentials;
  }
  
  private getHeaders() {
    const basicAuth = Buffer.from(
      `${this.credentials.username}:${this.credentials.password}`
    ).toString('base64');
    
    return {
      'x-api-key': this.credentials.apiKey,
      'x-county': this.credentials.county,
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json;charset=UTF-8',
    };
  }
  
  async getChildren() {
    const response = await axios.get(`${TEMPUS_BASE_URL}/children`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }
  
  async registerAbsence(childSsn: string, absence: {
    fromDate: string;
    toDate: string;
    fromTime?: string;
    toTime?: string;
    reason: string;
    comment?: string;
  }) {
    const response = await axios.post(
      `${TEMPUS_BASE_URL}/children/ssn/${childSsn}/absence`,
      absence,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
  
  // ... more methods
}
```

---

## Dependencies to Add

```bash
# In apps/api/
pnpm add axios@^1.6.0           # HTTP client for Tempus API
pnpm add node-cron@^3.0.0       # Background sync jobs

# Already have:
# - crypto (Node.js built-in) for encryption
# - bcrypt for password hashing
# - zod for validation
```

---

## Documentation for Users

### How to Get Tempus Credentials

1. **Contact your municipality's Tempus administrator**
   - Usually the preschool or municipality IT department
   - Explain you want API access for personal use

2. **Request:**
   - API key
   - API username
   - API password
   - Municipality code (county)

3. **Note:** Not all municipalities allow parent API access. This integration assumes you have credentials.

### Alternative: Tempus Parent App
If API access is not available:
- Families can continue using the official Tempus Parent mobile app
- This integration is an optional enhancement for tech-savvy families
- Family Hub will gracefully disable Tempus features if not configured

---

## Next Steps

1. **Get Tempus Test Credentials** (if available)
   - Contact your municipality's Tempus administrator
   - Request demo/sandbox account credentials from Tempus
   - Or use production credentials if available

2. **Start with Phase 0**: Infrastructure setup
   - Add environment variables
   - Create encryption utility
   - Set up module structure

3. **Implement Phase 1**: Setup & Authentication
   - Get API connection working
   - Store credentials securely
   - Build setup UI

4. **Iterate through remaining phases**

---

*Last updated: 2024-12-25*  
*Next step: Phase 0 - Prerequisites*  
*Estimated total implementation: 30 hours (2+5+5+7+5+6 hours across 6 phases)*

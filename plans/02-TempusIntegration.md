# 2. Tempus Integration

**Status:** 🔴 Not Started  
**Priority:** High  
**Estimated Effort:** Large (1-2 weeks)

---

## 🎯 Goals

- Integrate with the Tempus API to fetch and sync relevant data
- Enable automatic syncing of work schedules into the family calendar

---

## 📚 References

- `TempusIntegrationPlan.md`
- `TempusQuickStart.md`

---

## ✅ Requirements

- [ ] Establish secure API connection
- [ ] Handle authentication and token refresh
- [ ] Gracefully handle API downtime or errors
- [ ] Log integration errors for debugging
- [ ] Create Tempus service module
- [ ] Add database tables for Tempus sync state
- [ ] Implement data mapping between Tempus and Family Hub
- [ ] Add user settings to enable/disable Tempus sync
- [ ] Handle multiple Tempus accounts per family

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **API rate limits** | High | Implement caching, batch requests, respect rate limits |
| **Breaking changes in Tempus API** | High | Version API calls, add migration layer, monitor changelog |
| **Data consistency issues** | Medium | Add sync conflict resolution, keep audit log |
| **Authentication token expiry** | Medium | Implement auto-refresh, handle expired tokens gracefully |
| **Downtime/network issues** | Low | Retry logic, offline queue, graceful degradation |

---

## 🛠️ Implementation Steps

### Phase 0: Research & Proof of Concept (2-3 days)
- [ ] Study Tempus API documentation thoroughly
- [ ] Create test Tempus account
- [ ] Build simple proof-of-concept to fetch schedule
- [ ] Identify which endpoints we need
- [ ] Document API limitations and quirks

### Phase 1: Database Schema (1 day)
- [ ] Create `tempus_accounts` table
  - `id`, `user_id`, `tempus_user_id`, `access_token`, `refresh_token`, `token_expires_at`
- [ ] Create `tempus_sync_log` table
  - `id`, `tempus_account_id`, `sync_type`, `status`, `error_message`, `synced_at`
- [ ] Create `tempus_schedule_cache` table (optional)
  - Cache schedule data to reduce API calls

### Phase 2: Backend Module (3-4 days)
- [ ] Create `apps/api/src/modules/tempus/` directory
- [ ] Implement `tempus/service.ts`
  - OAuth authentication
  - Token refresh
  - Error handling
- [ ] Implement `tempus/repository.ts`
  - Database operations for accounts and sync log
- [ ] Implement `tempus/routes.ts`
  - `POST /api/tempus/connect` - Link Tempus account
  - `DELETE /api/tempus/disconnect` - Unlink account
  - `POST /api/tempus/sync` - Manual sync trigger
  - `GET /api/tempus/status` - Get sync status

### Phase 3: Data Sync Logic (2-3 days)
- [ ] Create sync service to fetch schedules from Tempus
- [ ] Map Tempus schedule to calendar events
- [ ] Handle duplicate detection (don't create duplicates)
- [ ] Add conflict resolution (what if user edits synced event?)
- [ ] Implement incremental sync (only fetch changes)

### Phase 4: Background Sync (1-2 days)
- [ ] Add scheduled job to sync periodically
- [ ] Use cron or similar scheduler
- [ ] Run sync every 6-12 hours
- [ ] Add retry logic for failed syncs

### Phase 5: Frontend Integration (2-3 days)
- [ ] Add Tempus settings page
  - Connect/disconnect Tempus account
  - View sync status
  - Manual sync button
- [ ] Add visual indicator on calendar for Tempus events
- [ ] Show sync errors to user
- [ ] Add notification when sync completes

---

## 📝 Technical Notes

### Environment Variables
```bash
TEMPUS_CLIENT_ID=xxx
TEMPUS_CLIENT_SECRET=xxx
TEMPUS_OAUTH_REDIRECT_URI=https://familjehubben.vip/api/tempus/callback
```

### Tempus API Endpoints (Example)
- `POST /oauth/token` - Get access token
- `POST /oauth/refresh` - Refresh token
- `GET /api/v1/schedules` - Fetch schedules
- `GET /api/v1/user/profile` - Get user info

### Data Mapping
```typescript
// Tempus Schedule → Calendar Event
{
  tempusId: schedule.id,
  title: `Arbete: ${schedule.shift_type}`,
  startDate: schedule.start_time,
  endDate: schedule.end_time,
  allDay: false,
  source: 'tempus',
  editable: false // Prevent editing synced events
}
```

### Sync Strategy
- **Initial sync:** Fetch last 30 days + next 60 days
- **Incremental sync:** Fetch changes since last sync
- **Conflict resolution:** Tempus is source of truth, don't allow edits

---

## 🧪 Testing Checklist

- [ ] Test OAuth flow (connect account)
- [ ] Test token refresh
- [ ] Test sync with various schedule types
- [ ] Test duplicate prevention
- [ ] Test error handling (API down, invalid token, rate limit)
- [ ] Test disconnect flow
- [ ] Test background sync job
- [ ] Load test (multiple families syncing)

---

## 📦 Files to Create/Edit

### Backend
- `apps/api/src/modules/tempus/service.ts` (new)
- `apps/api/src/modules/tempus/repository.ts` (new)
- `apps/api/src/modules/tempus/routes.ts` (new)
- `apps/api/src/modules/tempus/types.ts` (new)
- `apps/api/src/modules/tempus/scheduler.ts` (new)
- Migration file for database tables (new)

### Frontend
- `apps/web/src/routes/settings/tempus/+page.svelte` (new)
- `apps/web/src/lib/utils/tempus.ts` (new)

---

## 🚀 Rollback Plan

If integration fails or is too complex:
1. Keep the module isolated (feature flag)
2. Allow users to opt-in only
3. Revert database changes if needed
4. Fall back to manual calendar entry

---

## ✅ Definition of Done

- [x] Database tables created
- [x] Tempus service module implemented
- [x] OAuth flow working
- [x] Sync logic tested
- [x] Background job running
- [x] Frontend settings page complete
- [x] Error handling robust
- [x] Documentation updated
- [x] Code reviewed
- [x] Deployed to production
- [x] Monitoring in place for sync errors

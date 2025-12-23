# Push Notification Implementation Plan

## Overview

Add Web Push Notifications to Familjehubben so family members get notified about:
- Grocery items assigned to them
- Grocery list updates
- New calendar events
- Calendar event reminders

The app already has notification preferences stored in `user_preferences` table - this plan connects them to actual push notifications.

---

## Current State

### What We Have
| Component | Status | Notes |
|-----------|--------|-------|
| Service Worker | ✅ Basic | `sw.js` - caching only, no push handlers |
| PWA Manifest | ✅ Ready | Icons, standalone mode configured |
| HTTPS | ✅ Ready | Via Cloudflare Tunnel |
| Notification Preferences UI | ✅ Done | Profile page with toggles |
| Preferences Storage | ✅ Done | `user_preferences` table |

### What We Need
| Component | Status | Notes |
|-----------|--------|-------|
| VAPID Keys | ❌ Missing | For Web Push authentication |
| Push Subscriptions Table | ❌ Missing | Store user's push endpoints |
| Service Worker Push Handler | ❌ Missing | Handle incoming push events |
| Subscription API | ❌ Missing | Subscribe/unsubscribe endpoints |
| Notification Sender | ❌ Missing | Send notifications from API |
| Frontend Permission Flow | ❌ Missing | Request browser permission |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │     │   API Server    │     │  Push Service   │
│   (SvelteKit)   │     │   (Fastify)     │     │  (Google/Apple) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
    1. Request                   │                       │
       Permission                │                       │
         │                       │                       │
    2. Get Push ─────────────────┼───────────────────────►
       Subscription              │              Returns endpoint
         │                       │                       │
    3. Send ─────────────────────►                       │
       Subscription              │                       │
       to API                    │                       │
         │              4. Store │                       │
         │                 in DB │                       │
         │                       │                       │
         │              5. When event happens            │
         │                 (grocery assigned)            │
         │                       │                       │
         │              6. Send ─────────────────────────►
         │                 Push                 Delivers to browser
         │                       │                       │
    ◄────────────────────────────┼───────────────────────┤
    7. Service Worker                                    │
       shows notification                                │
```

---

## Implementation Phases

### Phase 1: Setup & Infrastructure (Backend)

**Files to create:**
- `apps/api/src/modules/push/` folder with:
  - `vapid.ts` (~50 lines) - VAPID key management
  - `repository.ts` (~100 lines) - Database operations
  - `service.ts` (~150 lines) - Push notification logic
  - `routes.ts` (~100 lines) - API endpoints
  - `index.ts` (~20 lines) - Module export

**Database changes:**
```sql
-- Add to db/index.ts
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

**Environment variables (add to .env):**
```
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_SUBJECT=mailto:admin@familjehubben.vip
```

**New dependency:**
```bash
pnpm add web-push --filter @family-hub/api
pnpm add -D @types/web-push --filter @family-hub/api
```

---

### Phase 2: API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/subscribe` | Store push subscription |
| DELETE | `/api/push/unsubscribe` | Remove subscription |
| GET | `/api/push/vapid-key` | Get public VAPID key |
| POST | `/api/push/test` | Send test notification |

**Subscribe Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "base64...",
    "auth": "base64..."
  }
}
```

---

### Phase 3: Service Worker Updates

**Update `apps/web/static/sw.js`:**

Add push event handler (~40 lines):
```javascript
// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Focus existing window or open new one
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      return clients.openWindow(url);
    })
  );
});
```

---

### Phase 4: Frontend Integration

**Files to create:**
- `apps/web/src/lib/utils/pushNotifications.ts` (~100 lines)

**Functions needed:**
```typescript
// Check if push is supported
export function isPushSupported(): boolean

// Check current permission status
export function getPermissionStatus(): NotificationPermission

// Request permission and subscribe
export async function subscribeToPush(): Promise<boolean>

// Unsubscribe from push
export async function unsubscribeFromPush(): Promise<boolean>

// Check if currently subscribed
export async function isSubscribed(): Promise<boolean>
```

**Profile page changes:**
- Add "Enable Push Notifications" button/toggle
- Show permission status
- Handle subscribe/unsubscribe

---

### Phase 5: Trigger Notifications

**Where to add notification triggers:**

1. **Grocery Assignment** (`apps/api/src/modules/groceries/service.ts`)
   - When item is assigned to user → send notification if preference enabled

2. **Grocery List Updates** (`apps/api/src/modules/groceries/service.ts`)
   - When item added/removed → notify family if preference enabled

3. **Calendar Event Created** (`apps/api/src/modules/calendar/service.ts`)
   - When new event → notify family if preference enabled

4. **Calendar Reminders** (New background job)
   - Check upcoming events → send reminders if preference enabled

---

## File Structure After Implementation

```
apps/api/src/
├── modules/
│   ├── push/
│   │   ├── index.ts        (~20 lines)
│   │   ├── vapid.ts        (~50 lines)
│   │   ├── repository.ts   (~100 lines)
│   │   ├── service.ts      (~150 lines)
│   │   └── routes.ts       (~100 lines)
│   ├── groceries/
│   │   └── service.ts      (add ~30 lines)
│   └── calendar/
│       └── service.ts      (add ~30 lines)

apps/web/src/
├── lib/
│   └── utils/
│       └── pushNotifications.ts  (~100 lines)
├── routes/
│   └── profile/
│       └── [userId]/
│           └── +page.svelte      (add ~50 lines)

apps/web/static/
└── sw.js                         (add ~60 lines)
```

**Total new code: ~700 lines across 6 files** (all under 400 lines each ✅)

---

## Development Order

1. **Generate VAPID keys** - One-time setup
2. **Add database table** - `push_subscriptions`
3. **Create push module** - Backend API
4. **Update service worker** - Push handlers
5. **Create frontend utility** - Subscribe functions
6. **Update profile page** - Permission UI
7. **Add notification triggers** - Grocery/calendar events
8. **Test end-to-end** - Full flow verification

---

## Testing Checklist

- [ ] VAPID keys generated and stored in .env
- [ ] Push subscription stored in database
- [ ] Notification appears on test send
- [ ] Click notification opens correct page
- [ ] Unsubscribe removes from database
- [ ] Respects user preferences (e.g., groceryAssigned = false → no notification)
- [ ] Works on mobile Chrome
- [ ] Works on mobile Safari (iOS 16.4+)
- [ ] Multiple devices per user work correctly

---

## Notes

### Browser Support
- **Chrome/Edge/Firefox**: Full support
- **Safari**: iOS 16.4+ with Home Screen installation required
- **Samsung Internet**: Full support

### VAPID Key Generation
```bash
npx web-push generate-vapid-keys
```

**Generated Keys (save these!):**
```
Public Key:  BGOZ3Y2O3_bX5keIHLQNAow6C0Pz43t-wUhtDwqTEhG01mALUUBH9N5iy1cS8wznHY7n60ATrxVagoA5r5KnWMs
Private Key: 2VFV5H9l2NbirbNYMSKoddMuvlhrfqFTCWLodjcr7eI
```

### Payload Size Limit
Web Push payloads limited to ~4KB. Keep notification data minimal:
```json
{
  "title": "Grocery Assigned",
  "body": "Milk was assigned to you",
  "url": "/groceries",
  "tag": "grocery-123"
}
```

### Security Considerations
- VAPID private key is secret - never expose to frontend
- Subscriptions tied to user_id - validate ownership
- Rate limit notification sending to prevent abuse

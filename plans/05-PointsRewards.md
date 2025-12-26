# 5. Points & Reward System Expansion

**Status:** 🔴 Not Started  
**Priority:** Low  
**Estimated Effort:** Medium (3-5 days)

---

## 🎯 Goals

- Make rewards more flexible while respecting family preferences
- Enable optional conversion from points to real allowance
- Allow families to completely customize or hide the system

---

## ✅ Requirements

- [ ] Expand the existing points system
- [ ] Parent-controlled conversion from points → real money allowance
- [ ] Configurable conversion rate per family
- [ ] Ability to completely hide the point system per family
- [ ] Transaction history for points/allowance
- [ ] Approval workflow for conversions
- [ ] Monthly/weekly allowance summary

---

## 🚫 Constraints

- No real payments handled by the app
- Clear separation between "game points" and real money values
- Parents have full control over conversion rates and limits
- Optional feature - must work fine when disabled

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Motivation issues if rewards feel unfair** | Medium | Allow full customization per family |
| **Over-complicating optional feature** | Medium | Keep it simple, make it fully optional |
| **Children gaming the system** | Low | Parent approval required for conversions |
| **Confusion between points and money** | Medium | Clear visual distinction, separate labels |

---

## 🛠️ Implementation Steps

### Step 1: Database Schema (0.5 day)
- [ ] Add to `family_settings` table:
  - `points_enabled` (boolean, default true)
  - `allowance_enabled` (boolean, default false)
  - `points_to_currency_rate` (decimal, e.g., 10 points = 1 SEK)
  - `currency_code` (string, default 'SEK')
  - `allowance_auto_convert` (boolean, default false)
- [ ] Create `allowance_transactions` table:
  - `id`, `user_id`, `family_id`, `points_spent`, `money_value`, `status`, `requested_at`, `approved_at`, `approved_by`, `notes`
- [ ] Migration script

### Step 2: Family Settings UI (1 day)
- [ ] Add "Points & Rewards" section to family settings
- [ ] Toggle to enable/disable points system entirely
- [ ] Toggle to enable/disable allowance conversion
- [ ] Input for conversion rate (points → currency)
- [ ] Currency selector (SEK, EUR, USD, etc.)
- [ ] Preview calculation (e.g., "100 points = 10 SEK")
- [ ] Save settings

### Step 3: Conversion Request Flow (1.5 days)
- [ ] Add "Convert to Allowance" button on user profile
- [ ] Show current points balance
- [ ] Input: How many points to convert
- [ ] Calculate and preview money value
- [ ] Submit conversion request
- [ ] Notification to parents
- [ ] Parent approval page:
  - View pending requests
  - Approve or reject with reason
  - Batch approve multiple requests

### Step 4: Transaction History (1 day)
- [ ] Create transaction history page
- [ ] Show all conversions (pending, approved, rejected)
- [ ] Filters: date range, user, status
- [ ] Export to CSV (optional)
- [ ] Total points earned vs. converted

### Step 5: Update Points Display (1 day)
- [ ] When allowance enabled, show both:
  - **Points:** 150 🏆
  - **Allowance value:** 15 SEK 💰
- [ ] Visual distinction (icons, colors)
- [ ] Tooltip explaining conversion rate
- [ ] Hide completely if points disabled

### Step 6: Auto-Conversion (Optional) (0.5 day)
- [ ] If `allowance_auto_convert` enabled:
  - Automatically convert points weekly/monthly
  - No parent approval needed
  - Send summary notification
- [ ] Add scheduled job for auto-conversion

---

## 📝 Technical Notes

### Conversion Logic
```typescript
function convertPointsToMoney(points: number, rate: number): number {
  // rate = how many points = 1 currency unit
  // Example: rate = 10, points = 150 → 15 SEK
  return points / rate;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency
  }).format(amount);
}
```

### Transaction States
```typescript
enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}
```

### Permission Check
```typescript
// Only parents can approve conversions
if (user.role !== 'parent' && user.role !== 'admin') {
  throw new Error('Only parents can approve conversions');
}
```

---

## 🎨 Design Mockups

### Family Settings
```
┌─────────────────────────────────────┐
│  Poäng & Belöningar                 │
├─────────────────────────────────────┤
│  ☑ Aktivera poängsystem             │
│                                     │
│  ☑ Aktivera veckopeng-konvertering  │
│                                     │
│  Konverteringsgrad:                 │
│  [  10  ] poäng = 1 [SEK ▼]         │
│                                     │
│  Exempel: 100 poäng = 10 SEK        │
│                                     │
│  [ Spara ]                          │
└─────────────────────────────────────┘
```

### Conversion Request
```
┌─────────────────────────────────────┐
│  Konvertera poäng till veckopeng    │
├─────────────────────────────────────┤
│  Dina poäng: 150 🏆                 │
│                                     │
│  Konvertera: [ 100  ] poäng         │
│  = 10 SEK 💰                        │
│                                     │
│  Meddelande till förälder:          │
│  [ Vill spara till leksak ]         │
│                                     │
│  [ Skicka förfrågan ]               │
└─────────────────────────────────────┘
```

### Parent Approval
```
┌─────────────────────────────────────┐
│  Veckopeng-förfrågningar            │
├─────────────────────────────────────┤
│  👧 Farsan                          │
│  100 poäng → 10 SEK                 │
│  "Vill spara till leksak"           │
│  [ ✅ Godkänn ] [ ❌ Neka ]          │
│                                     │
│  🐭 Mamma                           │
│  50 poäng → 5 SEK                   │
│  "För glass"                        │
│  [ ✅ Godkänn ] [ ❌ Neka ]          │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] Enable/disable points system
- [ ] Enable/disable allowance conversion
- [ ] Set conversion rate
- [ ] Request conversion as child
- [ ] Approve conversion as parent
- [ ] Reject conversion as parent
- [ ] View transaction history
- [ ] Test with different currencies
- [ ] Test auto-conversion (if implemented)
- [ ] Verify points deduction after approval
- [ ] Test edge cases (0 points, negative, etc.)

---

## 📦 Files to Create/Edit

### Backend
- `apps/api/src/modules/allowance/service.ts` (new)
- `apps/api/src/modules/allowance/repository.ts` (new)
- `apps/api/src/modules/allowance/routes.ts` (new)
- Migration: Add allowance tables and family settings (new)

### Frontend
- `apps/web/src/routes/settings/family/+page.svelte` (edit)
- `apps/web/src/routes/allowance/request/+page.svelte` (new)
- `apps/web/src/routes/allowance/approve/+page.svelte` (new)
- `apps/web/src/routes/allowance/history/+page.svelte` (new)
- `apps/web/src/lib/components/PointsDisplay.svelte` (edit)

---

## 🎯 Future Enhancements (Not in Scope)

- [ ] Integration with payment apps (Swish, etc.)
- [ ] Automatic bank transfers
- [ ] Savings goals (save points for specific items)
- [ ] Interest on saved points
- [ ] Point expiration
- [ ] Bonus multipliers for streaks

---

## ✅ Definition of Done

- [x] Family settings implemented
- [x] Conversion request flow working
- [x] Parent approval system complete
- [x] Transaction history visible
- [x] Points display updated everywhere
- [x] Optional feature works when disabled
- [x] Clear distinction between points and money
- [x] Documentation updated
- [x] Code reviewed
- [x] Deployed to production
- [x] User feedback collected

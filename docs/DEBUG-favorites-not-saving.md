# Debug: Favorites (Basvaror) Not Saving to Database

## ✅ RESOLVED - 2025-12-26

### Root Cause
**The shared package (`@family-hub/shared`) was not being rebuilt/deployed.**

The Zod schema `UpdateGrocerySchema` on the Pi was an OLD version that didn't include the `isFavorite` field. When Zod validated the request, it stripped out `isFavorite` because it wasn't in the schema!

```
request.body: { isFavorite: true }     ← Data came in correctly
validation.data: {}                     ← Zod stripped it out!
```

### Solution
1. Rebuilt the shared package: `pnpm build` in `packages/shared`
2. Deployed the shared package to Pi
3. Updated `deploy.ps1` to always build and deploy the shared package

### Lessons Learned
1. **Monorepo shared packages must be rebuilt when schemas change**
2. **Deploy scripts must include shared package deployment**
3. **Debug logging at multiple points helps trace where data is lost**
4. **Zod validation can silently strip fields not in the schema**

---

## Original Problem Summary
When toggling the favorite/star icon on a grocery item, the UI updates correctly and the API returns `{success: true, item: {...}}`, but the change is **not persisted to the database**. When navigating away and back, or refreshing the page, the favorite status reverts to its original value.

## Symptoms
1. User clicks star icon on "Smör" (id: 4) to toggle from favorite → not favorite
2. Frontend shows star as unfilled (correct UI update)
3. Console shows: `toggleFavorite: PATCH result {success: true, item: {...}}`
4. API returns HTTP 200
5. **BUT**: Database still shows `is_favorite = true`
6. After page refresh or navigation, the star is filled again

## Technical Stack
- **Frontend**: SvelteKit + Vite
- **Backend**: Fastify (Node.js)
- **Database**: PostgreSQL 17
- **Deployment**: Raspberry Pi via SSH

## Code Flow

### 1. Frontend (`apps/web/src/routes/groceries/+page.svelte`)
```typescript
async function toggleFavorite(itemId: number) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const newFavoriteStatus = !item.isFavorite;
    
    // Optimistic UI update
    items = items.map(i => 
        i.id === itemId ? { ...i, isFavorite: newFavoriteStatus } : i
    );
    
    // API call
    const result = await groceryApi.update(itemId, { isFavorite: newFavoriteStatus });
    // result shows {success: true, item: {...}}
}
```

### 2. API Route (`apps/api/src/modules/groceries/routes.ts`)
```typescript
// PATCH /api/groceries/:id
app.patch('/:id', async (request, reply) => {
    const { isFavorite } = validation.data;
    const updateData = {};
    
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    
    const item = await groceryService.updateGrocery(id, familyId, updateData);
    
    return reply.send({ success: true, item });
});
```

### 3. Service (`apps/api/src/modules/groceries/service.ts`)
```typescript
export async function updateGrocery(id, familyId, data) {
    const row = await repository.update(id, familyId, data);
    if (!row) return null;
    
    const item = toGroceryItem(row);
    
    // Broadcast via WebSocket
    connectionManager.broadcastToFamily(familyId, {
        type: 'grocery:updated',
        payload: { item },
    });
    
    return item;
}
```

### 4. Repository (`apps/api/src/modules/groceries/repository.ts`) - SUSPECTED BUG LOCATION
```typescript
export async function update(id, familyId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // ... other fields ...
    
    if (data.isFavorite !== undefined) {
        fields.push(`is_favorite = $${paramIndex++}`);
        values.push(data.isFavorite);
    }

    if (fields.length === 0) {
        return findById(id, familyId);  // Returns existing row without updating
    }

    fields.push('updated_at = NOW()');
    values.push(id, familyId);

    // POTENTIAL BUG: Parameter indexing in WHERE clause
    const query = `UPDATE groceries SET ${fields.join(', ')}
    WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
    RETURNING id`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return null;
    }

    return findById(id, familyId);  // Returns updated row
}
```

## Suspected Bug

The WHERE clause parameter indexing looks suspicious:
```typescript
WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
```

If `paramIndex` is 2 before this line:
- `$${paramIndex++}` evaluates to `$2`, then increments to 3
- `$${paramIndex}` evaluates to `$3`

But `values` array at this point is: `[isFavorite, id, familyId]` = `[$1, $2, $3]`

This **should** be correct, but there might be:
1. A JavaScript evaluation order issue with `++` in template literals
2. The `findById` returning cached/stale data
3. The UPDATE succeeding but not actually matching any rows

## Debug Logging Added

We added console.log statements but they're **not appearing in journalctl logs**, which is strange. The logs were added to:
- `service.ts`: `console.log('SERVICE updateGrocery called:', { id, familyId, data })`
- `repository.ts`: `console.log('UPDATE query:', query)` and `console.log('UPDATE values:', values)`

## Database Check
```sql
SELECT id, name, is_favorite FROM groceries WHERE id = 4;
-- Result: id=4, name=Smör, is_favorite=t (true)
-- Even after toggling to false, it still shows true
```

## Questions to Investigate

1. **Why aren't console.log statements appearing?** Is the code path even being executed?
2. **Is `fields.length === 0` being triggered?** This would skip the UPDATE entirely
3. **Is the UPDATE query matching 0 rows?** Check `result.rowCount`
4. **Is there a transaction rollback happening?**
5. **Is `findById` returning stale data?**

## Files to Review
- `apps/api/src/modules/groceries/repository.ts` (lines 114-175)
- `apps/api/src/modules/groceries/service.ts` (lines 65-82)
- `apps/api/src/modules/groceries/routes.ts` (lines 148-218)

## How to Test
1. SSH to Pi: `ssh robert@192.168.68.118`
2. Check logs: `sudo journalctl -u family-hub-api -n 100 --no-pager`
3. Check database: `sudo -u postgres psql -d familyhub -c "SELECT id, name, is_favorite FROM groceries;"`
4. Deploy: `.\deploy.ps1 -ApiOnly` (from Windows)

---

## Claude's Analysis (2025-12-26)

### Finding 1: The paramIndex Logic is CORRECT ✓

I traced through the code carefully. JavaScript evaluates template literals **left-to-right**, so:

```typescript
WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
```

When `paramIndex = 2`:
1. `$${paramIndex++}` → evaluates to `"$2"`, THEN increments paramIndex to 3
2. `$${paramIndex}` → evaluates to `"$3"`

Result: `WHERE id = $2 AND family_id = $3`

With `values = [false, 4, 1]`, this maps to: `$1=false, $2=id(4), $3=familyId(1)`

**This is correct!** The suspected bug is NOT a bug.

### Finding 2: Console.logs Not Appearing = Deployed Code is OLD

The git diff shows:
```diff
- const result = await pool.query(
-     `UPDATE groceries SET ${fields.join(', ')}
-     WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
-     RETURNING id`,
-     values
- );
+ const query = `UPDATE groceries SET ...`;
+ console.log('UPDATE query:', query);
+ const result = await pool.query(query, values);
```

**The console.logs were added to the repo but NEVER DEPLOYED.** The code running on the Pi is the OLD version (before debug statements were added).

### Finding 3: Potential Masking Issue

The current code does:
```typescript
const result = await pool.query(query, values);  // UPDATE
if (result.rows.length === 0) return null;
return findById(id, familyId);  // Separate SELECT
```

The `RETURNING id` only returns the id, not the full row. Then `findById` makes a SEPARATE query. If the UPDATE silently failed (0 rows affected but no error), `findById` would return the OLD data.

**Problem:** We're not checking `result.rowCount` to verify rows were actually updated!

### Finding 4: What the Item Contains

The debug doc says:
> Console shows: `toggleFavorite: PATCH result {success: true, item: {...}}`

**Critical Question:** What is `item.isFavorite` in that response?
- If `false` (new value) → UPDATE worked, something else is reverting it
- If `true` (old value) → UPDATE never happened, `findById` returned stale data

The frontend's optimistic update masks this because it shows the new value regardless.

### Root Cause Theory

The most likely explanation:

1. **The deployed code is outdated** - console.logs don't appear because the new code was never deployed
2. **The UPDATE might be silently failing** - either matching 0 rows or having some other issue we can't see without logs

### Recommended Fix

1. **Deploy the current code** with console.logs to see what's actually happening

2. **Add rowCount check** to verify the UPDATE actually modified a row:
```typescript
console.log('Rows affected:', result.rowCount);
if (result.rowCount === 0) {
    console.log('WARNING: UPDATE matched 0 rows!');
}
```

3. **Use RETURNING * instead of RETURNING id** to get the updated row directly:
```typescript
const query = `UPDATE groceries SET ${fields.join(', ')}
    WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
    RETURNING *`;  // Get full row, not just id

const result = await pool.query(query, values);
return result.rows[0];  // Return directly, skip findById
```

4. **Test manually on the database:**
```sql
-- Run this directly on the Pi to verify the UPDATE works
UPDATE groceries SET is_favorite = false, updated_at = NOW()
WHERE id = 4 AND family_id = 1
RETURNING *;
```

If this manual SQL works, the database is fine and the bug is in the code path. If it doesn't work, there may be a database constraint or trigger we don't know about.

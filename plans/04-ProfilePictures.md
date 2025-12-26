# 4. Profile Pictures

**Status:** 🔴 Not Started  
**Priority:** Medium  
**Estimated Effort:** Medium (4-6 days)

---

## 🎯 Goals

- Allow users to upload a profile picture instead of using emojis
- Provide a more personal touch to user profiles
- Maintain safety and appropriate content

---

## ✅ Requirements

- [ ] Image upload with size and format validation
- [ ] Image cropping or auto-centering to square
- [ ] Parental control to enable/disable uploads for children
- [ ] Safe storage and access control
- [ ] Fallback to emoji if no picture uploaded
- [ ] Option to remove/reset picture
- [ ] Image optimization (compression, WebP format)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Storage costs** | Medium | Limit file size to 500KB, auto-compress, use WebP |
| **Inappropriate images** | High | Require parent approval for children under 13 |
| **Performance on low-end devices** | Low | Lazy loading, responsive images, CDN |
| **Privacy concerns** | Medium | Images only visible to family members |

---

## 🛠️ Implementation Steps

### Step 1: Storage Setup (0.5 day)
- [ ] Decide: Local filesystem or S3-compatible storage
- [ ] Create directory structure: `static/uploads/avatars/{familyId}/`
- [ ] Set up file permissions (not publicly accessible)
- [ ] Add cleanup job for orphaned files

**Decision:** Start with local filesystem, migrate to S3 later if needed.

### Step 2: Backend - Upload Endpoint (1 day)
- [ ] Create `POST /api/users/:id/avatar` endpoint
- [ ] Validate file type (jpg, png, webp only)
- [ ] Validate file size (max 5MB before processing)
- [ ] Process image with `sharp`:
  - Resize to 400x400px
  - Convert to WebP
  - Compress to <500KB
  - Generate thumbnail (100x100px)
- [ ] Save to filesystem
- [ ] Update user record with avatar path
- [ ] Return avatar URL

### Step 3: Backend - Delete Endpoint (0.5 day)
- [ ] Create `DELETE /api/users/:id/avatar` endpoint
- [ ] Remove file from filesystem
- [ ] Clear avatar path in database
- [ ] Revert to emoji display

### Step 4: Database Schema (0.5 day)
- [ ] Add `avatar_url` column to `users` table
- [ ] Add `avatar_approved` boolean (default true for adults)
- [ ] Add `avatar_uploaded_at` timestamp
- [ ] Migration script

### Step 5: Frontend - Upload Component (1.5 days)
- [ ] Create `AvatarUpload.svelte` component
- [ ] File input with drag-and-drop
- [ ] Image preview before upload
- [ ] Crop tool (optional, or use auto-center)
- [ ] Upload progress indicator
- [ ] Error handling (file too large, wrong format)
- [ ] Success feedback

### Step 6: Parental Controls (1 day)
- [ ] Add setting to family preferences: `allow_child_avatar_upload`
- [ ] For children under 13:
  - Show upload option only if parent allows
  - Mark as `avatar_approved: false`
  - Notify parent to approve
- [ ] Parent approval page:
  - View pending avatars
  - Approve or reject
  - Send notification to child

### Step 7: Display Avatar Everywhere (1 day)
- [ ] Update all components that show user avatar:
  - `FamilySidebar.svelte`
  - `ProfileHeader.svelte`
  - `BulletinNoteCard.svelte`
  - Task assignments
  - Calendar events
- [ ] Fallback to emoji if no avatar
- [ ] Add loading state

### Step 8: Testing & Optimization (0.5 day)
- [ ] Test upload with various image sizes/formats
- [ ] Test crop functionality
- [ ] Test parental approval flow
- [ ] Test deletion
- [ ] Load testing (concurrent uploads)
- [ ] Check image quality

---

## 📝 Technical Notes

### Image Processing with Sharp
```typescript
import sharp from 'sharp';

async function processAvatar(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 85 })
    .toFile(outputPath);

  // Generate thumbnail
  await sharp(inputPath)
    .resize(100, 100, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 80 })
    .toFile(outputPath.replace('.webp', '-thumb.webp'));
}
```

### File Naming Convention
```
{familyId}/{userId}_{timestamp}.webp
Example: 123/456_1735234567890.webp
```

### Avatar URL Structure
```
/uploads/avatars/{familyId}/{userId}_{timestamp}.webp
```

### Security Checks
```typescript
// Validate MIME type
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// Validate file size
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  throw new Error('File too large');
}

// Check if user has permission
if (user.age < 13 && !family.allow_child_avatar_upload) {
  throw new Error('Parent approval required');
}
```

---

## 🎨 Design Mockups

### Upload Interface
```
┌─────────────────────────────────────┐
│  Profilbild                         │
├─────────────────────────────────────┤
│       ┌────────┐                    │
│       │  🐭   │  Current emoji      │
│       │        │                    │
│       └────────┘                    │
│                                     │
│  [ Ladda upp bild ]                 │
│  eller dra och släpp här            │
│                                     │
│  Max 5MB • JPG, PNG, WebP           │
└─────────────────────────────────────┘
```

### Parental Approval
```
┌─────────────────────────────────────┐
│  Väntar på godkännande              │
├─────────────────────────────────────┤
│  👧 Farsan vill ladda upp bild      │
│                                     │
│       ┌────────┐                    │
│       │ [IMG] │                     │
│       └────────┘                    │
│                                     │
│  [ ✅ Godkänn ] [ ❌ Neka ]          │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] Upload JPG, PNG, WebP
- [ ] Upload oversized file (should reject)
- [ ] Upload wrong format (should reject)
- [ ] Upload and verify image quality
- [ ] Delete avatar
- [ ] Child upload triggers parent approval
- [ ] Parent approves avatar
- [ ] Parent rejects avatar
- [ ] Avatar displays everywhere
- [ ] Fallback to emoji works
- [ ] Mobile upload works
- [ ] Multiple concurrent uploads

---

## 📦 Files to Create/Edit

### Backend
- `apps/api/src/modules/users/routes.ts` (edit - add avatar endpoints)
- `apps/api/src/modules/users/service.ts` (edit - avatar logic)
- `apps/api/src/utils/imageProcessing.ts` (new)
- Migration: Add avatar columns to users table (new)
- `apps/api/static/uploads/avatars/` (new directory)

### Frontend
- `apps/web/src/lib/components/AvatarUpload.svelte` (new)
- `apps/web/src/lib/components/Avatar.svelte` (edit or new)
- `apps/web/src/routes/profile/[userId]/+page.svelte` (edit)
- `apps/web/src/routes/settings/family/+page.svelte` (edit - parental controls)

---

## 🚀 Future Enhancements (Not in Scope)

- [ ] AI-generated avatars
- [ ] Avatar frames/borders
- [ ] Animated avatars (GIF support)
- [ ] Avatar history (view previous avatars)
- [ ] Bulk approval for parents

---

## ✅ Definition of Done

- [x] Upload endpoint working
- [x] Image processing optimized
- [x] Parental approval flow complete
- [x] Avatar displays everywhere
- [x] Security validated
- [x] Storage limits enforced
- [x] Error handling robust
- [x] Documentation updated
- [x] Code reviewed
- [x] Deployed to production

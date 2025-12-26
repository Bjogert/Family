# 1. Start Screen Improvements

**Status:** 🔴 Not Started  
**Priority:** High  
**Estimated Effort:** Small (1-2 days)

---

## 🎯 Goals

- Clearly explain what the app does on first launch
- Ensure users can install the app even if they miss the browser install popup

---

## ✅ Requirements

- [ ] Add a short, friendly explanation of the app's purpose
- [ ] Add a visible "Install App" button
- [ ] Button should trigger the PWA install flow when available
- [ ] If installation is not supported, show a helpful fallback message
- [ ] Hide install button after successful installation

---

## ❓ Open Questions

- [x] Is this a PWA only, or also distributed via app stores?
  - **Decision:** PWA only for now. App store distribution adds complexity.
- [x] Should the install button be hidden after installation?
  - **Decision:** Yes, hide it to avoid clutter.

---

## 🛠️ Implementation Steps

### Step 1: Create Install Banner Component
- [ ] Create `InstallBanner.svelte` in `apps/web/src/lib/components/`
- [ ] Add friendly welcome message explaining the app
- [ ] Add "Install App" button with icon

### Step 2: Implement PWA Install Logic
- [ ] Listen for `beforeinstallprompt` event
- [ ] Store prompt in component state
- [ ] Show install button only when prompt is available
- [ ] Trigger prompt on button click
- [ ] Handle user's accept/reject choice

### Step 3: Persist Installation State
- [ ] Check if app is already installed (standalone mode)
- [ ] Store install state in localStorage
- [ ] Hide banner after installation
- [ ] Add option to dismiss banner (with 24h cooldown)

### Step 4: Add to Layout
- [ ] Add InstallBanner to `+layout.svelte` or landing page
- [ ] Position at top or bottom of screen
- [ ] Make it dismissible but not annoying

---

## 📝 Technical Notes

### PWA Detection
```typescript
// Check if already installed
const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// Listen for install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton = true;
});

// Trigger install
async function install() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    localStorage.setItem('pwa-installed', 'true');
  }
  deferredPrompt = null;
}
```

### Message Examples
- **Welcome:** "Välkommen till Familjehubben! Din familjs digitala samlingspunkt."
- **Explanation:** "Hantera uppgifter, inköpslistor, kalendern och håll kontakten med familjen."
- **Install prompt:** "Installera appen för bästa upplevelse!"

---

## 🧪 Testing Checklist

- [ ] Test on Chrome/Edge (desktop & mobile)
- [ ] Test on Safari iOS
- [ ] Test on Firefox
- [ ] Verify banner hides after install
- [ ] Verify banner doesn't show on installed app
- [ ] Test dismiss functionality
- [ ] Check accessibility (keyboard navigation, screen reader)

---

## 📦 Files to Create/Edit

- `apps/web/src/lib/components/InstallBanner.svelte` (new)
- `apps/web/src/routes/+layout.svelte` (edit)
- `apps/web/src/lib/stores/install.ts` (new, optional)

---

## 🎨 Design Notes

- Keep banner subtle but visible
- Use brand colors (orange theme)
- Add close/dismiss button (X icon)
- Mobile-friendly sizing
- Consider bottom position to avoid covering content

---

## ✅ Definition of Done

- [x] Component created and styled
- [x] PWA install prompt working
- [x] Installation state persisted
- [x] Banner hides after install
- [x] Tested on all major browsers
- [x] Accessible (WCAG AA)
- [x] Code reviewed
- [x] Deployed to production

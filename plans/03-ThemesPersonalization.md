# 3. Themes & Personalization

**Status:** 🔴 Not Started  
**Priority:** Medium  
**Estimated Effort:** Medium (3-5 days)

---

## 🎯 Goals

- Make the app visually customizable and fun, especially for children
- Allow each user to personalize their experience
- Maintain accessibility and usability across all themes

---

## ✅ Requirements

- [ ] Create multiple predefined color themes (5-8 themes)
- [ ] Add theme selection per user profile
- [ ] Children can customize themes on their personal page (MySpace-style, playful)
- [ ] Theme changes must not affect core usability or accessibility
- [ ] Persist theme selection in user preferences
- [ ] Theme preview before applying
- [ ] Smooth theme transition (no flash)

---

## 🚫 Constraints

- No custom CSS uploads (security & complexity)
- Themes should be limited to a safe, curated set
- Must meet WCAG AA contrast ratios
- No animated backgrounds (performance)

---

## 🎨 Theme Ideas

### Standard Themes (All Users)
1. **Classic Orange** (current) - Warm, family-friendly
2. **Ocean Blue** - Calm, professional
3. **Forest Green** - Natural, peaceful
4. **Sunset Purple** - Creative, evening-friendly
5. **Monochrome** - Clean, minimal

### Fun Themes (Kids)
6. **Rainbow Blast** - Colorful, playful
7. **Space Explorer** - Dark with stars
8. **Candy Land** - Sweet pastels

### Seasonal (Optional)
- **Christmas** - Red & green (Dec only)
- **Summer** - Bright yellow/blue (Jun-Aug)

---

## 🛠️ Implementation Steps

### Step 1: Define Theme Schema (0.5 day)
- [ ] Create theme type definition
- [ ] Define CSS variable structure
- [ ] Document color palette for each theme
- [ ] Test contrast ratios

```typescript
interface Theme {
  id: string;
  name: string;
  category: 'standard' | 'fun' | 'seasonal';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
  };
  darkMode: boolean;
}
```

### Step 2: Create Theme Definitions (1 day)
- [ ] Define all themes in `apps/web/src/lib/themes.ts`
- [ ] Validate accessibility for each theme
- [ ] Create theme CSS files or use CSS variables

### Step 3: Database Schema (0.5 day)
- [ ] Add `theme` field to `user_preferences` table
- [ ] Default to 'classic-orange'
- [ ] Migration script

### Step 4: Theme Switcher Component (1 day)
- [ ] Create `ThemeSelector.svelte` component
- [ ] Grid of theme previews with colors
- [ ] Hover effect to preview
- [ ] Click to apply
- [ ] Save to database

### Step 5: Apply Theme System (1 day)
- [ ] Load user's theme on app init
- [ ] Apply CSS variables to `:root`
- [ ] Create theme store in Svelte
- [ ] Handle theme changes reactively

### Step 6: Add to Profile Settings (0.5 day)
- [ ] Add theme section to profile page
- [ ] Show current theme
- [ ] Link to theme selector
- [ ] Add reset to default button

### Step 7: Testing & Polish (0.5 day)
- [ ] Test all themes in light/dark mode
- [ ] Verify no layout breaks
- [ ] Check contrast ratios
- [ ] Test theme switching performance
- [ ] Add smooth transitions

---

## 📝 Technical Notes

### CSS Variables Approach
```css
:root {
  --theme-primary: #f97316;
  --theme-secondary: #fb923c;
  --theme-accent: #fdba74;
  --theme-background: #fafaf9;
  --theme-surface: #ffffff;
  --theme-text: #292524;
  --theme-text-muted: #78716c;
  --theme-border: #e7e5e4;
  --theme-error: #ef4444;
  --theme-success: #22c55e;
}

/* Apply in components */
.button {
  background: var(--theme-primary);
  color: var(--theme-surface);
}
```

### Theme Store
```typescript
// apps/web/src/lib/stores/theme.ts
import { writable } from 'svelte/store';

export const currentTheme = writable<Theme | null>(null);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });
  currentTheme.set(theme);
}
```

### Persistence
```typescript
// Save theme preference
await put('/auth/users/:id/preferences', {
  ...preferences,
  theme: 'ocean-blue'
});

// Load on app init
const prefs = await get('/auth/users/:id/preferences');
const theme = themes.find(t => t.id === prefs.theme);
applyTheme(theme);
```

---

## 🎨 Design Mockups

### Theme Selector UI
```
┌─────────────────────────────────────┐
│  Välj tema                          │
├─────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │🍊  │ │🌊  │ │🌲  │ │🌅  │       │
│  │Kla-│ │Oce-│ │Skog│ │Sun-│       │
│  │ssic│ │an  │ │   │ │set │       │
│  └────┘ └────┘ └────┘ └────┘       │
│                                     │
│  🎨 Roliga teman (för barn)         │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │🌈  │ │🚀  │ │🍭  │              │
│  │Regnb│ │Space│ │Candy│             │
│  │åge │ │    │ │    │              │
│  └────┘ └────┘ └────┘              │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] All themes display correctly
- [ ] No layout shifts when changing theme
- [ ] Dark mode variants work
- [ ] Contrast ratios meet WCAG AA
- [ ] Theme persists after reload
- [ ] Theme works across all pages
- [ ] Mobile responsive
- [ ] No performance issues

---

## 📦 Files to Create/Edit

- `apps/web/src/lib/themes.ts` (new)
- `apps/web/src/lib/stores/theme.ts` (new)
- `apps/web/src/lib/components/ThemeSelector.svelte` (new)
- `apps/web/src/routes/+layout.svelte` (edit - load theme)
- `apps/web/src/routes/profile/[userId]/+page.svelte` (edit - add theme section)
- Migration: Add `theme` to `user_preferences` (new)

---

## 🎯 Future Enhancements (Not in Scope)

- [ ] User-uploadable themes (requires moderation)
- [ ] Theme marketplace
- [ ] Animated themes
- [ ] Custom font selection
- [ ] Theme scheduling (different themes at different times)

---

## ✅ Definition of Done

- [x] 5-8 themes defined and tested
- [x] Theme selector component created
- [x] Theme persistence implemented
- [x] All themes meet accessibility standards
- [x] Smooth theme transitions
- [x] Documentation updated
- [x] Code reviewed
- [x] Deployed to production
- [x] User feedback collected

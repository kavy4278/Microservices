# UI Documentation — Crumbly

Complete description of the Crumbly user interface: visual language, design tokens, component library, every screen, states, motion, responsiveness, accessibility, and how the UI maps to the API.

The UI is a single-page React app (`frontend/`) served by nginx. It has three top-level screens — **Landing** (public), **Auth** (sign in / register), and **App** (role dashboard) — switched by `frontend/src/App.jsx`.

---

## 1. Design Intent

- **Theme:** "Fresh Harvest + Human Impact" — natural greens for food/agriculture, warm ivory paper for calm, a single harvest-orange accent reserved for urgency (expiry) and the strongest call to action.
- **Feel:** clean, trustworthy, human, uncluttered. Generous whitespace, soft rounded cards, subtle elevation, nothing decorative that doesn't carry information.
- **Tone:** plain, active, helpful. CTAs say exactly what happens ("Publish listing", "Confirm pickup"). Empty and error states always point to the next action.
- **Approach:** zero UI dependencies — the design system is hand-written CSS (`frontend/src/styles.css`) plus an inline SVG icon set (`frontend/src/icons.jsx`).

---

## 2. Color System

Defined as CSS custom properties in `:root` (`styles.css`).

### Brand

| Token | Hex | Use |
|-------|-----|-----|
| `--forest` | `#176B45` | Primary — buttons, links, active nav, icons |
| `--forest-700` | `#12603d` | Primary hover |
| `--forest-600` | `#1c7a50` | Available as a lighter primary |
| `--forest-900` | `#0e4230` | Dark surfaces — sidebar, footer, announcement, device frame |
| `--sage` | `#E8F4E9` | Soft green fills — icon chips, tags, hover |
| `--sage-200` | `#d3ead6` | Borders/tracks on sage |
| `--ivory` | `#F7F5EC` | App/landing page background |
| `--orange` | `#F97316` | Harvest accent — urgency, strongest CTA |
| `--amber` | `#F59E0B` | Expiring-soon tone |
| `--red` | `#DC2626` | Errors, destructive |

### Neutrals

| Token | Hex | Use |
|-------|-----|-----|
| `--char` | `#1F2937` | Primary text |
| `--muted` | `#6B7280` | Secondary text |
| `--muted-2` | `#9CA3AF` | Placeholders, faint text |
| `--border` | `#E5E7EB` | Hairlines, card borders |
| `--white` | `#FFFFFF` | Cards, inputs, topbar |

### Status colors

Each status has a foreground and background token, mirrored by `.badge-{STATUS}` classes.

| Status | Label shown | Foreground | Background |
|--------|-------------|-----------|------------|
| `POSTED` | Available | `#176B45` | `#E3F3E8` |
| `CLAIMED` | Claimed | `#2563EB` | `#E4EDFD` |
| `PENDING` | Expiring soon | `#B45309` | `#FEF3C7` |
| `PICKED_UP` | Picked up | `#EA580C` | `#FFEDD5` |
| `DELIVERED` | Delivered | `#15803D` | `#DCFCE7` |
| `EXPIRED` | Expired | `#B91C1C` | `#FEE2E2` |
| `CANCELLED` | Cancelled | `#4B5563` | `#F3F4F6` |

Color is never the only signal — every status also carries its text label and a dot (`.pill-dot`).

---

## 3. Typography

Loaded from Google Fonts in `frontend/index.html`.

| Role | Family | Weights | Token |
|------|--------|---------|-------|
| Headings, buttons, labels, numerals | **Plus Jakarta Sans** | 500–800 | `--font-head` |
| Body copy | **Inter** | 400–600 | `--font-body` |

Scale:

| Element | Size | Weight |
|---------|------|--------|
| `h1` | `clamp(2.2rem, 5vw, 3.5rem)` | 800 |
| `h2` | `clamp(1.6rem, 3vw, 2.35rem)` | 700 |
| `h3` | `1.25rem` | 700 |
| Body | `16px` / line-height `1.6` | 400 |
| Small | `.875rem` | — |
| Badges/labels | `.76–.86rem` | 600–700 |
| Stat value | `1.9rem` | 800 |

Headings use `letter-spacing: -0.02em`. Brand wordmark is Plus Jakarta Sans 800 at `1.25rem`.

---

## 4. Spacing, Radii & Elevation

- **Radii:** cards `--r-card: 16px`, medium/stepper `12px`, buttons/inputs `10px`, pills `999px`, hero device `20–24px`.
- **Elevation:**
  - `--shadow-xs: 0 1px 2px rgba(31,41,55,.06)` (default cards, buttons)
  - `--shadow-sm: 0 2px 8px rgba(31,41,55,.06)` (panels)
  - `--shadow-md: 0 8px 24px rgba(31,41,55,.08)` (hover, toasts)
  - `--shadow-lg: 0 20px 48px rgba(14,66,48,.16)` (modals, hero/device, sidebar drawer)
- **Container:** `--maxw: 1200px`, horizontal padding `24px`.
- **Section rhythm:** `76px` vertical on sections (reduced to `56px` on mobile); hero `72px/84px`.
- **Utility spacing classes:** `.mt-1..4`, `.mb-2..4`, `.gap-2`, `.grow`.

---

## 5. Iconography

`frontend/src/icons.jsx` exports `<Icon name size stroke className style />` — a single component over ~54 hand-inlined Lucide-style 24×24 stroke SVGs (stroke width 2, round caps/joins), colored via `currentColor`, `aria-hidden="true"`.

Icon keys: `leaf, utensils, package, mapPin, clock, users, shield, shieldCheck, check, checkCircle, xCircle, alert, arrowRight, menu, heart, bike, truck, plus, search, bell, logout, dashboard, list, chart, settings, sparkles, recycle, handHeart, building, route, phone, mail, lock, user, eye, chevronDown, star, quote, globe, server, database, code, zap, calendar, filter, refresh, send, copy, hourglass, store, refreshCw, externalLink, trash`.

Unknown names fall back to a check icon.

---

## 6. Layout Structure

Two distinct layouts:

- **Landing / Auth:** full-width marketing/split-screen layout, centered content within `.container`.
- **App:** a fixed two-column shell — `grid-template-columns: 264px 1fr` — with a sticky forest sidebar and a scrollable main column.

### App shell — ASCII

```
┌───────────────┬──────────────────────────────────────────────┐
│  🌿 Crumbly │  Overview                    [Admin] [Refresh]│  ← topbar (sticky, white)
│               ├──────────────────────────────────────────────┤
│ ▸ Overview    │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐      │
│   Post surplus│  │ stat  │ │ stat  │ │ stat  │ │ stat  │      │
│   My listings │  └───────┘ └───────┘ └───────┘ └───────┘      │
│   Claims      │  ┌───────────────────────┐ ┌────────────────┐│
│   Notifications  │ Recent activity       │ │ Quick actions  ││
│               │  └───────────────────────┘ └────────────────┘│
│ ┌───────────┐ │                                               │
│ │ user card │ │                                               │
│ │ Sign out  │ │                                               │
└───────────────┴──────────────────────────────────────────────┘
```

### Landing hero — ASCII

```
┌──────────────────────────────────────────────────────────────┐
│  eyebrow pill          │   ┌───────────────────────────────┐   │
│  Saving every crumb    │   │ ● ● ●  app.crumbly          │   │
│  Every crumb counts.   │   │  🥗  Fresh veg biryani        │   │
│  lead copy…            │   │      40 servings · Andheri    │   │
│  [Rescue food] [Explore]│  │      4h left · [stepper]      │   │
│  ✓OTP ✓Expiry ✓Roles    │   └───────────────────────────────┘   │
│                        │   [Claimed by NGO]   [Rider en route] │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Component Library

Source: `frontend/src/components/ui.jsx` plus classes in `styles.css`.

### 7.1 Button (`.btn`)
Variants: `primary` (forest), `secondary` (white + sage border), `ghost` (transparent), `orange` (harvest), `danger` (white + red border). Modifiers: `btn-block` (full width), `btn-sm`. Options: leading `icon`, trailing `iconRight`. Press gives a 1px downward nudge; disabled drops opacity to `.55`.

### 7.2 Field / inputs
`Field` wraps a label + control + optional `hint`. Controls: `.input`, `.select`, `.textarea` — white, 10px radius, focus turns the border forest and adds a `rgba(23,107,69,.12)` ring. `.form-error` is a red pill for inline validation.

### 7.3 Badges & status
`.badge` is a pill; `.badge-{STATUS}` colors it. `<StatusBadge status>` renders the dot + human label (e.g. `POSTED → Available`). Extra styles: `.badge-sage`, `.badge-outline`.

### 7.4 Cards
`.card` (white, border, 16px radius, soft shadow), `.panel` (as card, slightly stronger shadow, used as view surfaces), `.card-hover` (lifts 3px on hover).

### 7.5 StatCard
`.stat` — label + icon chip on top, large value below. Grid `.stat-grid` is 4-up.

### 7.6 Stepper
`.stepper` — completed steps show a check in a forest circle with a filled connector line; the current step is outlined. Used to show claim progress (`CLAIMED → PICKED_UP → DELIVERED`).

### 7.7 ExpiryBadge
Countdown pill driven by `hoursLeft(expiry)`:
- `≤ 0` → red `Expired` (`urgent`)
- `≤ 3h` → `urgent` (orange)
- `≤ 8h` → `soon` (amber)
- `> 8h` → `ok` (sage)
Label: `"<n> min left"` under an hour, otherwise `"<n>h left"`.

### 7.8 FoodImage
16:10 media area with a sage gradient. Shows the listing `photoUrl`; on load error (or no URL) falls back to a large emoji — 🥗 for veg, 🍗 for non-veg.

### 7.9 FoodCard
Composition used in listing grids: image with a `StatusBadge` corner overlay, title + expiry, meta rows (servings, veg/non-veg, address + city, pickup-by time, donor), and a footer slot for actions (Claim / OTP / Delete).

### 7.10 Modal
`.modal-back` (forest-tinted blurred backdrop) + `.modal` (white, fade+pop). `Esc` and backdrop click close it. `wide` variant for larger content. Used for the OTP dialog.

### 7.11 Toast
`ToastProvider` + `useToast()`. Toasts stack bottom-right, auto-dismiss after 3.8s, left border forest for success / red for error, each with an icon and message.

### 7.12 Spinner, EmptyState, Progress
- `.spinner` — sage track with forest top, used in `.center-box`.
- `EmptyState` — sage icon tile, title, guidance text, optional action button.
- `.bar` — sage track with forest fill (available for progress meters).

### 7.13 Auth helpers
`.seg` (segmented Sign in / Create account switch), `.chip` / `.demo-chips` (one-click demo-account selectors).

### 7.14 Data table
`.table-wrap` + `table.data` — sticky-feel header on a cream tint, hairline rows, hover highlight. Used for the admin Users view.

### 7.15 OTP inputs
`.otp-box` — four large single-digit boxes that auto-advance, support paste, and back-space navigation; `.otp-display` shows a code in monospace on a dark pill.

---

## 8. Screen: Landing Page

`frontend/src/landing/Landing.jsx` — public marketing page, 16-section structure. Props wire the two entry CTAs to `onGetStarted(role)` and `onSignIn()`.

1. **Announcement bar** (`.announce`, `--forest-900`) — sparkles icon + message about onboarding + OTP; dismissible via an ✕ (local `banner` state).
2. **Navbar** (`.nav`, sticky, blurred cream) — brand (leaf mark + "Crumbly"); links *How it works* `#how`, *Features* `#features`, *Who it's for* `#usecases`, *FAQ* `#faq`; actions **Sign in** (ghost) and **Rescue food** (primary → register as donor). On ≤720px links collapse into a hamburger that toggles `.mobile-menu`.
3. **Hero** (`.hero`, radial sage/orange wash) — eyebrow pill "Saving every crumb"; `h1` **"Every crumb counts."**; lead paragraph; CTAs **Rescue food** (utensils → arrow) and **Explore listings** (search); a trust row (OTP-verified handovers · Expiry-aware listings · Four roles, one flow). Right column is a browser-style **product mock** showing a live listing card (fresh veg biryani, 40 portions, Andheri West, 4h left, a 4-step stepper) plus two floating cards ("Claimed by Akshaya NGO · 2 min ago", "Rider en route · OTP ready at pickup").
4. **Trust indicators** — four cards: Verified pickup · Zero-guess expiry · Role-based access · One active claim.
5. **Problem / Solution** (`.section-white`) — kicker "The gap we close"; two panels: *Without Crumbly* (white, red ✕ bullets) vs *With Crumbly* (forest, sage ✓ bullets).
6. **Features** (`#features`) — six cards: Post surplus in seconds · Find food near you · Riders with a clear run · OTP-verified handover · Impact you can see · Expiry you can't miss.
7. **How it works** (`#how`, sage) — the 4-step sequence with connectors: **Post → Claim → Collect → Deliver**.
8. **Product showcase** — left copy ("A dashboard for every role" + bullets + "See it for your NGO"); right a dark device frame containing a mock dashboard (stat tiles + a bar chart with one orange bar).
9. **Use cases** (`#usecases`) — Restaurants · Hotels & catering · Grocery & bakeries · NGOs & shelters, each with a tag + icon.
10. **Why Crumbly** (`.section-forest`, dark) — six translucent cards: Verified, not hopeful · Time is the ingredient · Simple for riders · Transparent impact · Right access every time · Fast to start.
11. **Built on** (white) — the tech stack: React + Vite · Node + Express · MongoDB · API gateway · JWT + roles · Docker.
12. **Always free** — a centered panel with three cards: For donors · For NGOs · For riders.
13. **FAQ** (`#faq`) — six accordion items (single-open via `openFaq` state, `aria-expanded`, rotating chevron).
14. **Final CTA** — forest gradient card, "Somewhere nearby, a good meal needs a home." with **Post surplus food** (orange) and **Join as an NGO** (secondary).
15. **Footer** (`.footer`, dark) — brand + tagline and three columns: Product, Get started (role links), Contact; a bottom bar with copyright and the tagline.

Anchors used by nav are `#how`, `#features`, `#usecases`, `#faq`, `#top`.

---

## 9. Screen: Auth

`frontend/src/auth.jsx` — split layout (`.auth-page`).

- **Left aside** (forest→forest-900 gradient, decorative circle): brand, headline "Every crumb counts.", three benefit lines (OTP-verified handovers, Expiry-aware listings, Impact you can see), tagline. Hidden on ≤1024px.
- **Right main** (ivory): a "Back to home" ghost button, a segmented **Sign in / Create account** switch (`.seg`), a title + subtext, then the form:
  - *Register:* Full name, "I am a …" role select (Donor/NGO/Rider/Admin) + Organisation, Email, Password (≥6 chars).
  - *Login:* Email, Password.
  - Inline `.form-error` on failure; submit button with arrow icon and busy state.
- **Demo chips** below the form: Donor / NGO / Rider / Admin — clicking one switches to login mode and prefills credentials.

---

## 10. Screen: App Shell

`frontend/src/app/Shell.jsx`.

- **Sidebar** (`--forest-900`, sticky, full height): brand button (returns to Overview), role-based nav links (`.side-link`, active = solid forest with white text), and a user card (name, "Role · Org", **Sign out**). On ≤1024px the sidebar becomes an off-canvas drawer (`.side.open`, slides in) toggled from the topbar.
- **Topbar** (white, sticky): mobile menu toggle, page title `h2`, and on the right a role badge + **Refresh** button (shows "Refreshing" while loading).
- **Content:** max-width 1180px, 28px padding.

Navigation per role (`NAV` in `frontend/src/app/App.jsx`):

| Role | Nav items |
|------|-----------|
| Donor | Overview · Post surplus · My listings · Claims received · Notifications |
| NGO | Overview · Find food · My claims · Notifications |
| Rider | Overview · My pickups · Notifications |
| Admin | Overview · All listings · All claims · Users · Search · Notifications |

---

## 11. Role Dashboards

All views live in `frontend/src/app/App.jsx`. Data loads on mount and on Refresh.

### 11.1 Overview (all roles)
- **Four stat cards** tailored to the role:
  - Donor: My listings · Awaiting pickup · Delivered · Meals rescued
  - NGO: Food available now · Active claims · Delivered · Meals received
  - Rider: Open pickups · In transit · Delivered · Meals moved
  - Admin: Total listings · Available now · Delivered · Members
- **Recent activity panel** (with Refresh) listing the latest 4 listings/claims (title, servings, city, status badge).
- **Quick actions panel**: role-relevant buttons (Post surplus / Find food / View claims) and a sage "servings delivered" highlight card.

### 11.2 Post surplus (Donor, Admin)
Two-column: a **form panel** (title; servings + veg/non-veg; cooked-at + safe-until datetime; city + pickup address; optional photo URL) with inline validation (title, required city/address, **pickup ≥ now + 2h**), and a **"How your listing works"** side panel showing the 4-step rescue flow plus a success badge after posting.

### 11.3 Find food (NGO, Admin)
A **filter bar** (city, food type, Search) over a `food-grid` of `FoodCard`s, each with a **Claim** button. Enter in the city field triggers search. Empty results show an EmptyState with a "Clear filters" action.

### 11.4 My listings / All listings (Donor, Admin)
Header with count and (donor) a Post button, then a `food-grid` of the donor's listings with the pickup **OTP** shown as a sage monospace badge and a **Delete** action.

### 11.5 Claims / All claims (all roles)
A `food-grid` of `ClaimCard`s, each showing title + status badge, meta, and a **status stepper** (CLAIMED → PICKED_UP → DELIVERED). Role-dependent:
- **Donor/Admin:** see the pickup **OTP** to share with the rider.
- **Rider/NGO/Admin:** **Verify pickup with OTP** (opens the OTP modal) while claimed, and **Mark delivered** while picked up.
- **Admin:** **Remove** a claim.
Contextual notes explain each state ("Waiting for a rider…", "On the way — delivery pending", "Delivered. N servings reached people.").

### 11.6 My pickups (Rider)
Same `Claims` view, filtered by the rider's API scope (open pool + own runs incl. delivered).

### 11.7 Users (Admin)
A `table.data` of members: Name, Email, Role (colored badge), Organisation, Joined.

### 11.8 Notifications (all roles)
An activity feed that **merges claim timelines** (claimed / picked up / delivered, each with an icon) with the notify-service log, newest first.

### 11.9 OTP verification modal (Rider flow)
Opened by **Verify pickup with OTP**. Shows a shield icon, an instruction naming the listing, four `.otp-box` inputs (auto-advance, paste, backspace), a **Confirm pickup** button (disabled until 4 digits), and Cancel. On success a toast confirms and the stepper advances.

---

## 12. States & Feedback

- **Loading:** centered `.spinner` while data is fetching.
- **Empty:** `EmptyState` with an icon tile, a plain explanation, and (where useful) a call to action — e.g. "Post your first listing", "Clear filters".
- **Errors:** `useToast(msg, { error: true })` (red-bordered toast) for API failures, plus inline `.form-error` for form validation.
- **Success:** toasts with a title + message and forest left border; buttons and steppers reflect the new state immediately after refresh.
- **Interactive clarity:** hover lift on cards/features/food cards; buttons nudge down on press; disabled controls dim to `.55` and stop responding; focus rings everywhere.

---

## 13. Motion

Deliberate and minimal:
- Buttons: `translateY(1px)` on `:active`, color/shadow transitions on hover.
- Cards: `translateY(-2..-3px)` + deeper shadow on hover.
- Toasts: `toastIn` (fade + 10px rise).
- Modal backdrop: `fade`; modal: `pop` (scale .97 → 1).
- Spinner: continuous rotation.
- Smooth in-page scrolling (`scroll-behavior: smooth`).
- **All** motion is disabled under `prefers-reduced-motion: reduce` (durations forced to ~0, smooth scroll off).

---

## 14. Responsive Behavior

| Breakpoint | Changes |
|-----------|---------|
| `≤ 1024px` | Hero stacks to one column; feature/steps/use-case/trust/stat grids → 2 columns; showcase stacks; footer → 2 columns; **app sidebar becomes an off-canvas drawer** (toggled from topbar); auth switches to single column (aside hidden). |
| `≤ 720px` | Navbar links/actions hidden behind a hamburger + `.mobile-menu`; feature/steps/use-case/trust/stat/problem grids → 1 column; footer → 1 column; tighter section/hero padding; smaller OTP boxes; toasts stretch full width with 16px insets. |

The layout is verified from desktop down to small phones. The rider flow is especially mobile-friendly (single-column cards, large OTP targets).

---

## 15. Accessibility

- **Visible focus:** global `:focus-visible` outline (3px forest, 35% alpha, 2px offset).
- **Icons:** decorative SVGs are `aria-hidden`; icon-only buttons carry `aria-label` (menu, close).
- **Modal:** `role="dialog"`, `aria-modal`, labelled by title; closes on `Esc` and backdrop click.
- **Accordion:** FAQ buttons expose `aria-expanded` and rotate a chevron.
- **Toasts:** container is `role="status"` with `aria-live="polite"`.
- **Color:** status is always text + dot, not color alone; body text on ivory/white meets normal-text contrast.
- **Keyboard:** all interactive elements are real buttons/inputs/links; OTP boxes are keyboard-navigable.
- **Reduced motion:** honored globally.
- **Language:** `index.html` sets `lang="en"`; page has descriptive `<title>`, meta description, and Open Graph tags.

---

## 16. Content, Data & API Mapping

| UI area | Data source (via gateway `VITE_API_URL`) |
|---------|------------------------------------------|
| Sign in / register | `POST /api/auth/login`, `POST /api/auth/register` → `{ token, user }` |
| Session | `localStorage` via `frontend/src/api.js` `store` |
| Donor overview / My listings | `GET /api/listings?mine=1` |
| NGO/Rider Browse | `GET /api/listings?available=1` (+ `city`, `veg` filters) |
| Admin All listings | `GET /api/listings` |
| Claims (all roles) | `GET /api/claims` (role-scoped, includes `otp` + `listingStatus`) |
| Claim action | `POST /api/claims { listingId }` |
| OTP pickup | `PATCH /api/claims/:id/pickup { otp }` |
| Deliver | `PATCH /api/claims/:id/deliver` |
| Admin users | `GET /api/users` |
| Notifications | `GET /api/notify` (+ derived claim timelines) |
| Post listing | `POST /api/listings` |
| Delete listing | `DELETE /api/listings/:id` |

The UI never calls services directly — everything goes through the gateway, and role permissions are enforced server-side (the UI only hides disallowed actions).

---

## 17. Microcopy & Voice

- **Verbs, sentence case, no filler.** CTAs are outcome-named and consistent across a flow (e.g. the button "Publish listing" yields "Listing published").
- **Errors explain and guide**, e.g. "Pickup window must end at least 2 hours from now."
- **Empty states invite action**, e.g. "Your posted surplus food will appear here."
- **Status labels are human:** Available, Claimed, Expiring soon, Picked up, Delivered, Expired, Cancelled.
- **Brand line reused:** "Every crumb counts."

---

## 18. Files

| File | Contains |
|------|----------|
| `frontend/index.html` | Fonts, meta/OG tags, `#root` |
| `frontend/src/styles.css` | Entire design system (tokens, components, layout, responsive) |
| `frontend/src/icons.jsx` | `Icon` component + icon set |
| `frontend/src/components/ui.jsx` | Toast, Button, Field, Modal, Spinner, EmptyState, StatCard, Stepper, StatusBadge, FoodImage, ExpiryBadge, helpers |
| `frontend/src/landing/Landing.jsx` | 16-section landing page |
| `frontend/src/auth.jsx` | Sign in / register screen |
| `frontend/src/app/Shell.jsx` | Sidebar + topbar app layout |
| `frontend/src/app/App.jsx` | All role dashboards, FoodCard, PostForm, ClaimCard, OtpModal |
| `frontend/src/App.jsx` | Root router (landing / auth / app) |
| `frontend/src/main.jsx` | React entry + `ToastProvider` |
| `frontend/src/api.js` | Gateway client + token store |

---

## 19. Not Included (Future UI Work)

- Separate profile/settings screen; onboarding wizard.
- Charts/graphs from a real charting library (the showcase chart is a static CSS mock; impact is shown via stat cards).
- Dark mode; multi-language; image upload UI (photo is a URL field).
- Payment, rewards/stars, subscriptions, and "Food Drive Orders" surfaces (business model is documented, not yet built).

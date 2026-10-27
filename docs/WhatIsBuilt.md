# What Is Built — Crumbly

**Crumbly — Surplus Food Rescue Network.** A microservices web application that rescues surplus cooked food from donors and delivers it to NGOs via riders before it expires, with an OTP-verified handover.

This document is a complete inventory of everything created in the project to date: services, frontend, infrastructure, tests, scripts, and documentation.

---

## 1. Status at a Glance

| Area | State |
|------|-------|
| Backend microservices | 4 services + 1 API gateway — **built & running** |
| Database | MongoDB (single instance, 2 logical DBs) — **built** |
| Frontend | React SPA — **fully redesigned** (landing page + 4 role dashboards) |
| Containerization | Docker Compose (8 containers) — **verified up** |
| Kubernetes manifests | Complete set (all 7 workloads) — **deployed & verified on kind** |
| Automated tests | `tests/smoke.js` — **8/8 PASS** |
| Seed script | `scripts/seed.js` — **working** |
| Documentation | 13 markdown files in `docs/` + 2 business-analysis files at root |
| Git | Repo initialized; `main` + tag `v1-mvp` pushed to GitHub |

Core rescue loop verified end-to-end: **donor posts → NGO claims → rider OTP pickup → delivered**.

---

## 2. Repository Layout

```
Kavy_Project/
├── docker-compose.yml            # 8 services + mongo volume
├── README.md                     # quick start + demo flow
├── TASKS.md                      # 2-day sprint task board
├── .env.example                  # env template (no secrets)
├── .gitignore                    # ignores .env, node_modules, dist, .agents, skills-lock.json
├── EarningGaps.md                # critical analysis of the earning model
├── EarningGapsSolved.md          # mentor-style phased plan to fix the gaps
├── skills-lock.json              # locked skill deps (frontend-design)
│
├── services/
│   ├── api-gateway/              # auth, RBAC, fetch proxy
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── auth-service/             # register / login / me / users
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── listing-service/          # surplus food CRUD + search + expiry guard
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── claim-service/            # claim / OTP pickup / deliver
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── notify-service/           # event log
│       ├── src/index.js
│       ├── package.json
│       └── Dockerfile
│
├── frontend/
│   ├── index.html                # fonts (Plus Jakarta Sans + Inter), SEO meta
│   ├── package.json              # React 18 + Vite 5
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── nginx.conf                # SPA fallback
│   ├── Dockerfile                # build → nginx:alpine
│   ├── .dockerignore             # excludes node_modules, dist
│   └── src/
│       ├── main.jsx              # React entry + ToastProvider
│       ├── App.jsx               # root router: landing / auth / app
│       ├── api.js                # gateway client + token store
│       ├── auth.jsx              # sign-in / register screen
│       ├── icons.jsx             # ~60 inline Lucide-style SVG icons
│       ├── styles.css            # full design system
│       ├── components/
│       │   └── ui.jsx            # toast, button, modal, cards, stepper, etc.
│       ├── landing/
│       │   └── Landing.jsx       # 16-section landing page
│       └── app/
│           ├── Shell.jsx         # sidebar + topbar layout
│           └── App.jsx           # 4 role dashboards + OTP modal + post form
│
├── k8s/
│   └── all.yaml                  # Secret, ConfigMap, PVC, 7 Deployments+Services, Ingress
│
├── scripts/
│   └── seed.js                   # seeds 4 demo users
│
├── tests/
│   └── smoke.js                  # E2E smoke test (register→deliver + RBAC)
│
├── .cursor/rules/                # editor rules: general, backend, frontend, testing
│   ├── general.mdc
│   ├── backend.mdc
│   ├── frontend.mdc
│   └── testing.mdc
│
└── docs/
    ├── PRD.md                    # product requirements (incl. §10 Business Model)
    ├── ARCHITECTURE.md           # stack, topology, services, data models, flows
    ├── DESIGN.md                 # design system (original baseline)
    ├── RULES.md                  # development rules
    ├── DECISIONS.md              # 5 architecture decision records
    ├── MEMORY.md                 # project memory / current status
    ├── TEST_PLAN.md              # manual + automated test checklist
    ├── SECURITY.md               # auth, RBAC, secrets, validation rules
    ├── workflow.md               # 2-day vibe-coding loop
    ├── implementation.md         # vertical slices + API contracts
    ├── alldiagrams.md            # C4, ER, JWT sequence, state machine, topology
    ├── businessmodel.md          # revenue model & unit economics
    ├── UserEarnings.md           # stakeholder financial benefits (8 groups)
    └── WhatIsBuilt.md            # ← this file
```

---

## 3. Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Frontend | React + Vite | React `^18.3.1`, Vite `^5.4.0` |
| Styling | Hand-written CSS design system | no CSS framework (zero extra deps) |
| Icons | Inline SVG (Lucide-style) | custom `icons.jsx`, no dependency |
| Fonts | Plus Jakarta Sans (headings) + Inter (body) | via Google Fonts |
| Backend | Node.js + Express | Express `^4.19.2` |
| Database | MongoDB | `mongo:7`, Mongoose `^8.4.0` |
| Auth | Custom JWT | `jsonwebtoken ^9.0.2` + `bcryptjs ^2.4.3` |
| Container | Docker + Docker Compose | Compose v2 |
| Orchestration | Kubernetes | `k8s/all.yaml` — kind cluster verified |
| DB admin UI | mongo-express | `mongo-express:1` |

---

## 4. Backend Microservices

### 4.1 API Gateway — `services/api-gateway` (port 5000 internal `8080`, host `8085`)

Single entry point for the frontend. Responsibilities:

- **Health**: `GET /health` returns gateway + upstream service URLs.
- **JWT verification** (`authMiddleware`): skips `/api/auth/login` and `/api/auth/register`; verifies `Bearer` token with `JWT_SECRET`; attaches `userId`, `userRole`, `userName` from the token.
- **Role guard** (`requireRole`): used to restrict write routes.
- **Fetch-based proxy** (`proxy`): forwards method + query + body to the target service and injects identity headers `x-user-id`, `x-user-role`, `x-user-name`. (Replaced `http-proxy-middleware`, which hung behind `express.json()`.)

Routes:

| Route | Target | Access |
|-------|--------|--------|
| `/api/auth/*` | auth-service | login/register open; rest authenticated |
| `/api/listings` | listing-service | GET any auth; POST/PUT/PATCH/DELETE require `donor` or `admin` |
| `/api/claims` | claim-service | any authenticated (role rules enforced in service) |
| `/api/notify` | notify-service | any authenticated |
| `/api/users` | auth-service | `admin` only |

Dependencies: `express`, `cors`, `jsonwebtoken` (note: `http-proxy-middleware` still listed in package.json but unused).

### 4.2 Auth Service — `services/auth-service` (port 5001, DB `authdb`)

Owns users and issues JWTs.

- **Model `User`**: `name`, `email` (unique, lowercase), `passwordHash`, `role` (`admin|donor|ngo|rider`), `org`, `phone`, timestamps.
- **JWT payload**: `{ id, role, name }`, expiry `7d`.
- **Endpoints**:
  - `GET /health`
  - `POST /register` — validates fields, role whitelist, password ≥ 6 chars, unique email; bcrypt-hashes (cost 10); returns `{ token, user }`.
  - `POST /login` — bcrypt compare; returns `{ token, user }`.
  - `GET /me` — verify bearer token, return public user.
  - `GET /users` — admin only (checks `x-user-role`); returns users without password hashes.

Dependencies: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cors`.

### 4.3 Listing Service — `services/listing-service` (port 5002, DB `maindb`)

Owns surplus food listings.

- **Model `Listing`**: `donorId`, `donorName`, `title` (≤120), `qty` (1–1000), `veg`, `cookedAt`, `expiryAt`, `city`, `address`, `photoUrl`, `status` (`POSTED|CLAIMED|PICKED_UP|DELIVERED|EXPIRED|CANCELLED`), `otp` (auto 4-digit), timestamps.
- **Validation** (`validate`): required fields; `qty` 1–1000; `cookedAt` not in the future; **`expiryAt` ≥ now + 2 hours**; expiry after cooked.
- **Endpoints**:
  - `GET /health`
  - `POST /` — `donor`/`admin` only; creates listing.
  - `GET /` — filters: `city`, `veg`, `available=1` (POSTED + not expired), `mine=1` (own listings); sorted by expiry. **OTP hidden unless owner or admin.**
  - `GET /:id` — single listing (OTP hidden unless owner/admin).
  - `PUT /:id` — owner/admin, only when `POSTED`.
  - `DELETE /:id` — owner/admin.
  - `PATCH /:id/status` — internal status update.

### 4.4 Claim Service — `services/claim-service` (port 5003, DB `maindb`)

Owns the claim lifecycle and OTP-verified handover.

- **Models**: `Listing` (reuses `listings` collection) and `Claim` — `listingId`, `listingTitle`, `qty`, `city`, `ngoId`, `ngoName`, `riderId`, `status` (`CLAIMED|PICKED_UP|DELIVERED|CANCELLED`), `timeline[]`, timestamps.
- **Endpoints**:
  - `GET /health`
  - `POST /` — `ngo`/`admin` only. Rules: listing must be `POSTED` and not expired; **only one active claim per listing**; sets listing → `CLAIMED`; returns `{ claim, otp }`.
  - `GET /` — role-scoped: NGO sees own claims; rider sees the open pool (`CLAIMED`/`PICKED_UP`) **plus** their own runs including delivered; donor sees claims on their listings; admin sees all. Attaches `otp` and `listingStatus`.
  - `PATCH /:id/pickup` — body `{ otp }`; validates OTP; `CLAIMED → PICKED_UP`; records rider.
  - `PATCH /:id/deliver` — `PICKED_UP → DELIVERED`; updates listing to `DELIVERED`.
  - `DELETE /:id` — `admin` only.

### 4.5 Notify Service — `services/notify-service` (port 5004, DB `maindb`)

Simple event log.

- **Model `Notify`**: `type`, `message`, `refId`, `by`, timestamps.
- **Endpoints**: `GET /health`, `GET /` (latest 50), `POST /`.

---

## 5. Frontend

Single-page React app served by nginx. All API calls go through the gateway via `VITE_API_URL`.

### 5.1 Routing shell (`src/App.jsx`)
Three screens driven by auth state: **landing** (public) → **auth** (sign in / register) → **app** (role dashboard). Session persisted in `localStorage` (`user`, `token`) through `src/api.js` `store`.

### 5.2 Design system (`src/styles.css`)
- **Palette**: Forest Green `#176B45` (primary), Soft Sage `#E8F4E9`, Warm Ivory `#F7F5EC` (background), Harvest Orange `#F97316` (urgency/warnings), Charcoal `#1F2937`, White cards. Status colors: Available (green), Claimed (blue), Expiring (amber), Picked up (orange), Delivered (green), Expired (red), Cancelled (gray).
- **Typography**: Plus Jakarta Sans (headings/buttons) + Inter (body).
- **Radii/shadows**: card radius 10–16px, button radius 8–12px, subtle elevation scale.
- **Responsive**: breakpoints at 1024px and 720px; mobile sidebar drawer; `prefers-reduced-motion` respected; visible keyboard focus.

### 5.3 Reusable UI (`src/components/ui.jsx`)
`ToastProvider`/`useToast`, `Button` (primary/secondary/ghost/orange/danger), `Field`, `Modal`, `Spinner`, `EmptyState`, `StatCard`, `Stepper`, `StatusBadge`, `FoodImage` (with emoji fallback), `ExpiryBadge`, plus `fmt`/`hoursLeft` helpers.

### 5.4 Icons (`src/icons.jsx`)
~60 inline Lucide-style SVG icons (leaf, utensils, package, mapPin, clock, shieldCheck, bike, handHeart, route, store, hourglass, etc.) — zero dependency.

### 5.5 Landing page (`src/landing/Landing.jsx`)
Public marketing page following the 16-section structure:

1. Announcement bar · 2. Navbar · 3. Hero ("Every crumb counts.") · 4. Trust indicators · 5. Problem/Solution · 6. Features · 7. How it works (4 steps) · 8. Product showcase · 9. Use cases · 10. Why choose us · 11. Built-on (tech) · 12. Always-free · 13. FAQ · 14. Final CTA · 15. Footer.
Includes an interactive mobile menu, dismissible banner, FAQ accordion, and a CSS-mock product window. CTAs deep-link into auth with a preselected role.

### 5.6 Auth screen (`src/auth.jsx`)
Split-screen sign-in / register with role picker (donor/NGO/rider/admin), organisation field, and one-click demo-account chips.

### 5.7 App shell (`src/app/Shell.jsx`)
Forest-green sidebar (role-based nav, user card, sign-out) + topbar (title, role badge, refresh) with a mobile drawer toggle.

### 5.8 Role dashboards (`src/app/App.jsx`)
| Role | Nav / capabilities |
|------|--------------------|
| **Donor** | Overview stats · Post surplus (validated form) · My listings (with OTP codes) · Claims received · Notifications |
| **NGO** | Overview · Find food (city + veg search) · Claim · My claims · Notifications |
| **Rider** | Overview · My pickups (pool + own runs) · 4-digit **OTP verification modal** · Mark delivered · Notifications |
| **Admin** | Overview analytics · All listings · All claims (incl. remove) · Users table · Search · Notifications |

Also included: `FoodCard`, `PostForm`, `OtpModal` (auto-advance OTP inputs), `ClaimCard` (with status stepper), stat cards, and a derived notifications feed that merges claim timelines with the notify log.

---

## 6. Data Models (summary)

- **User** (`authdb.users`): name, email, passwordHash, role, org, phone.
- **Listing** (`maindb.listings`): donorId, donorName, title, qty, veg, cookedAt, expiryAt, city, address, photoUrl, status, otp.
- **Claim** (`maindb.claims`): listingId, listingTitle, qty, city, ngoId, ngoName, riderId, status, timeline[].
- **Notify** (`maindb.notifies`): type, message, refId, by.

---

## 7. Infrastructure

### 7.1 Docker Compose (`docker-compose.yml`) — 8 containers
| Service | Image / build | Host port |
|---------|---------------|-----------|
| mongo | `mongo:7` (+ `mongo-data` volume, healthcheck) | 27017 |
| auth-service | build `./services/auth-service` | 5001 |
| listing-service | build `./services/listing-service` | 5002 |
| claim-service | build `./services/claim-service` | 5003 |
| notify-service | build `./services/notify-service` | 5004 |
| api-gateway | build `./services/api-gateway` | 8085 → 8080 |
| frontend | build `./frontend` (ARQ `VITE_API_URL`) | 5173 → 80 |
| mongo-express | `mongo-express:1` | 8081 |

### 7.2 Dockerfiles
- **Backend**: `node:20-alpine`, `npm install --omit=dev`, copy `src`, expose service port.
- **Frontend**: multi-stage — `node:20-alpine` build (`npm install` → `vite build` with `VITE_API_URL` build arg) → `nginx:alpine` serving `dist` + SPA `nginx.conf`.

### 7.3 Kubernetes (`k8s/all.yaml`) — complete, deployed & verified
Deployments + Services for `mongo`, `auth-service`, `listing-service` (2 replicas + liveness probe), and `gateway` (LoadBalancer). Uses placeholder images `crumbly/*:latest`. Not used for the live demo.

### 7.4 Frontend serving
`nginx.conf` does SPA fallback (`try_files $uri /index.html`). `vite.config.js` sets dev/preview port 5173.

---

## 8. Tests & Scripts

- **`tests/smoke.js`** — E2E smoke against the gateway. Registers throwaway users and asserts:
  - duplicate email → `409`
  - post without token → `401`
  - NGO posting → `403`
  - short expiry (<2h) → `400`
  - post → search → claim → double claim → `409` → wrong OTP → `400` → pickup → deliver
  - Result: **SMOKE PASS** (all paths green).
- **`scripts/seed.js`** — registers the 4 demo users via the gateway.
- **Manual check** (`docs/TEST_PLAN.md`) — auth, listings, claims+OTP, responsive, docker.

---

## 9. Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Donor | donor@test.com | donor123 |
| NGO | ngo@test.com | ngo123 |
| Rider | rider@test.com | rider123 |
| Admin | admin@test.com | admin123 |

(Also available as one-click chips on the sign-in screen.)

---

## 10. How to Run

```bash
cp .env.example .env      # then set a strong JWT_SECRET
docker compose up --build
```
- Frontend UI: http://localhost:5173
- Gateway health: http://localhost:8085/health
- Mongo admin UI: http://localhost:8081 (admin / pass)

Seed demo users (gateway must be up): `node scripts/seed.js`
Run smoke test: `node tests/smoke.js`

---

## 11. Environment Variables (`.env.example`)

`JWT_SECRET`, `MONGO_URL`, `AUTH_MONGO_URL`, `VITE_API_URL` (`http://localhost:8085`), `ME_CONFIG_BASICAUTH_USERNAME`, `ME_CONFIG_BASICAUTH_PASSWORD`. Secrets live only in the gitignored `.env`.

---

## 12. Documentation Inventory

| File | Purpose |
|------|---------|
| `docs/PRD.md` | Product requirements, users, MVP features, non-functional, **§10 Business Model** |
| `docs/ARCHITECTURE.md` | Stack, topology, services & ports, data models, auth flow, folder structure |
| `docs/DESIGN.md` | Baseline design system (colors, typography, components) |
| `docs/RULES.md` | General/backend/frontend/security/testing/git rules |
| `docs/DECISIONS.md` | ADR-001…005 (Express vs Next.js, MongoDB, Vite, custom JWT, Compose vs K8s) |
| `docs/MEMORY.md` | Living status: completed, current task, known issues, next step |
| `docs/TEST_PLAN.md` | Test checklist for auth, listings, claims+OTP, responsive, docker |
| `docs/SECURITY.md` | Auth/authorization, secrets, input validation, API & upload rules |
| `docs/workflow.md` | 2-day vibe-coding loop and prompt template |
| `docs/implementation.md` | Vertical slices build order + API contracts |
| `docs/alldiagrams.md` | C4 L1/L2, ER, JWT sequence, claim state machine, docker topology, user flows |
| `docs/businessmodel.md` | Revenue streams, pricing, unit economics, GTM, risks, guardrails |
| `docs/UserEarnings.md` | Stakeholder financial benefits across 8 groups + unified value prop |
| `docs/WhatIsBuilt.md` | This complete build inventory |

Additional root files:
- `EarningGaps.md` — critical analysis of the earnings model (who pays / who gets / what's left).
- `EarningGapsSolved.md` — mentor-style phased plan ("Prove, Pay, Profit") to close those gaps.
- `README.md`, `TASKS.md`, `skills-lock.json`.

---

## 13. Editor Rules (`.cursor/rules/`)

- `general.mdc` — gateway-only frontend, validate inputs, JWT server-side, small commits.
- `backend.mdc` — Express `{ok,data}` responses, validate body, trust identity headers, one active claim per listing, expiry ≥ now+2h.
- `frontend.mdc` — Vite SPA, gateway-only calls, design tokens, loading/empty/error states, role-guarded routes.
- `testing.mdc` — run smoke + test plan after each slice; verify 401/403/409/400 paths.

---

## 14. Verified Working

- `npm run build` (frontend) — clean, no errors.
- `docker compose up` — 8 containers healthy (gateway `:8085`, mongo healthy).
- `node tests/smoke.js` — **SMOKE PASS** (409/401/403/400 + full claim→pickup→deliver).
- UI data checks — donor name propagates to listings, NGO name to claims, rider retains delivered-run history.
- Frontend served at `:5173` with hashed assets; landing content and gateway URL present in the bundle.

---

## 15. Deliberately Not Built (Out of Scope / v2)

- Online payments, commission/subscription billing, sponsor-a-meal, reward stars/streaks.
- Live maps / routing, AI food-quality check, chat, native mobile app, SMS gateway.
- Real image upload (listings take a photo URL only).
- (Completed) Full Kubernetes manifest set — `k8s/all.yaml` now covers all 7 workloads with Secret/ConfigMap/PVC/Ingress, deployed and smoke-tested on kind.
- Ledger/records for rewards and payouts (the earnings model is design-only so far).

---

*Crumbly turns surplus food into a verified, accountable rescue — post, claim, OTP pickup, deliver.*

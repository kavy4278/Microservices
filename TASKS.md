# Tasks — Crumbly 2-Day Sprint

## Phase 1: Setup (TASK-001)
- [x] Folders, git init, docs skeleton
- [x] docker-compose.yml, .env.example, .gitignore, README
- [x] `docker compose up --build` healthy (8 containers, gateway :8085)

## Phase 2: Auth Slice (TASK-002/003)
- [x] auth-service register/login/me + bcrypt+JWT
- [x] gateway proxy /api/auth + health (fetch-proxy)
- [x] frontend Auth view + role guard + logout
- [x] Test: 4 roles register/login, 409 dup, 401 wrong — SMOKE PASS

## Phase 3: Listing Slice (TASK-004/005)
- [x] listing-service CRUD + search + expiry guard + OTP gen
- [x] gateway RBAC donor/admin write (403 verified)
- [x] PostFood + Browse + MyListings UI
- [x] Test: post, filter city/veg, edit/delete owner only, 400 short-expiry

## Phase 4: Claim Slice (TASK-006/007)
- [x] claim-service claim/pickup/deliver + one-active-claim rule (409 verified)
- [x] MyClaims + Pickups UI + OTP display rule
- [x] notify-service log + activity feed
- [x] Test: claim → 409 second → wrong OTP 400 → deliver — SMOKE PASS

## Phase 5: Polish + Demo (TASK-008+)
- [x] Leaderboard, DESIGN pass, empty/loading/error states

## Phase 6: Todo-Dhruv — Real-time + photos (TASK-009)
- [x] notify-service: user/role notifications, unread/read-all, gateway fan-out
- [x] api-gateway: authenticated SSE stream `GET /api/notify/stream`
- [x] claim/listing services: live status broadcasts, timelines, expiry sweep
- [x] frontend: EventSource client, unread badge, live badges, Alerts feed
- [x] photos on claim cards, OTP modal, browse/all listings (base64 `photoUrl`)
- [x] E2E verified: real-time notifications/status, photos, expiry warnings, role isolation

## Remaining demo tasks
- [ ] Run `node scripts/seed.js`, full TEST_PLAN click-through, `v1-mvp` tag
- [ ] Viva: architecture diagram, JWT flow, `docker compose logs gateway`

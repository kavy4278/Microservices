# Development Rules — Crumbly

## General
- JavaScript (CommonJS), Express 4. Reuse existing middleware, no duplicate logic.
- Small functions, early returns. Do not modify unrelated files.
- All APIs return `{ok:true,data}` or `{ok:false,error}` with correct HTTP codes.

## Before Coding
- Read docs/PRD.md, ARCHITECTURE.md, DESIGN.md.
- Inspect existing service for pattern. Reuse `authMiddleware` shape.
- Plan large changes in TASKS.md first.

## Backend
- Validate body: required fields, qty>0, expiryAt>now+2h, cookedAt<=now.
- Hash passwords with bcryptjs (10 rounds). Never return passwordHash.
- JWT secret from env only. Verify in gateway AND trust service-level userId from header `x-user-id`, `x-user-role` — never trust client body for donorId.
- One active claim per listing (409 if already claimed).

## Frontend
- Follow DESIGN.md colors/radius. Only call gateway (`VITE_API_URL` default http://localhost:8080).
- Store token+user in localStorage. Attach `Authorization: Bearer`.
- Guard routes by role. Include loading/empty/error states.

## Security
- Never commit `.env`. Never expose `JWT_SECRET` or mongo URL to frontend.
- Sanitize strings (trim), cap qty ≤1000, cap title 120 chars.
- CORS enabled on gateway only.

## Testing
- After each TASK: `node -e` smoke or curl health, `docker compose ps`.
- Fix failing tests before next task.

## Git
- Small commits: `feat:`, `fix:`, `docs:`. Commit after each working vertical slice.
- Branches: `main` only for 2-day sprint (speed), tag `v1-mvp` before demo.

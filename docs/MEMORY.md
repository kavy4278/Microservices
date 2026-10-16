# Project Memory

## Current Status
MVP v1 built and verified. `docker compose up` green (8 containers), `node tests/smoke.js` SMOKE PASS.

## Completed
- [x] Stack: Vite + Express x5 + Mongo + Compose, custom JWT
- [x] MVP: auth, post, search/claim, OTP pickup/deliver, dashboards
- [x] Gateway fetch-proxy (replaced HPM which hung with express.json)
- [x] Gateway port moved 8080 -> 8085 (8080 occupied on dev PC)
- [x] Docs: PRD, ARCHITECTURE, DESIGN, RULES, DECISIONS, TEST_PLAN, SECURITY, workflow, implementation, alldiagrams, TASKS, README
- [x] tests/smoke.js, scripts/seed.js, k8s/all.yaml

## Current Task
TASK-008 polish/demo: seed demo users, viva prep

## Known Issues
- npm.ps1 blocked in PS5.1 → use `npm.cmd`
- Port 8080 occupied → gateway on 8085, frontend VITE_API_URL updated
- http-proxy-middleware hung → replaced with fetch proxy (gateway pattern intact)

## Next Step
Run `node scripts/seed.js`, practice demo flow, `git tag v1-mvp`.

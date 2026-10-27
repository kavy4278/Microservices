# 🍛 Crumbly — Surplus Food Rescue Network

Microservices MVP: rescue surplus food before expiry. Donor posts → NGO claims → Rider OTP pickup → Delivered.

## Stack
React Vite + Express ×4 + Gateway + MongoDB + Docker Compose. Custom JWT + RBAC.

## Run (2 min)
```bash
cp .env.example .env
# edit JWT_SECRET
docker compose up --build
```
- Frontend: http://localhost:5173
- Gateway: http://localhost:8085/health
- DB UI: http://localhost:8081 (admin/pass)

## Demo accounts (seed: `node scripts/seed.js`)
- donor@test.com / donor123 (role donor)
- ngo@test.com / ngo123 (role ngo)
- rider@test.com / rider123 (role rider)
- admin@test.com / admin123 (role admin)

Demo flow: donor posts (expiry +4h) → NGO Browse → Claim → copy OTP → rider Pickups → OTP → Deliver → Leaderboard.

## Docs
See `docs/PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `alldiagrams.md`, `TEST_PLAN.md`. Tasks in `TASKS.md`.

## K8s
Full manifest set in `k8s/all.yaml` (Secret, ConfigMap, PVC, 7 Deployments/Services, Ingress). Deploy on any cluster; `kind` is the tested path:

```powershell
.\scripts\k8s-deploy.ps1 -Expose     # create kind cluster, build+load images, apply, port-forward
node tests/smoke.js                  # verify: SMOKE PASS
.\scripts\k8s-deploy.ps1 -TearDown   # remove the cluster
```
Live demo on Docker: `docker compose up --build`.

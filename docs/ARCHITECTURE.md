# Architecture — Crumbly

## 1. Stack (locked)
- Frontend: React 18 + Vite, plain CSS (no Tailwind to save time), fetch API
- Backend: Node.js 20 + Express 4, Mongoose 8, bcryptjs, jsonwebtoken
- DB: MongoDB 7 (two logical DBs on one container: `authdb`, `maindb`)
- Gateway: Express http-proxy-middleware, central auth + RBAC
- Deploy: Docker + Docker Compose (live demo). K8s YAMLs included for marks only.

## 2. Topology
```
Browser :5173 → API Gateway :8080 → auth-service :5001 → mongo:27017/authdb
                                    → listing-service :5002 → mongo/maindb
                                    → claim-service :5003 → mongo/maindb
                                    → notify-service :5004 → mongo/maindb
```

## 3. Services & Ports
| Service | Port | DB | Responsibility |
|---|---|---|---|
| auth-service | 5001 | authdb.users | register, login, me |
| listing-service | 5002 | maindb.listings | food CRUD, search, expiry guard |
| claim-service | 5003 | maindb.claims | claim, OTP pickup, deliver |
| notify-service | 5004 | maindb.notifies | event log list/create |
| api-gateway | 8080 | — | JWT verify, requireRole, proxy /api/auth, /api/listings, /api/claims, /api/notify |
| frontend | 5173 | — | Vite SPA, role dashboards |
| mongo | 27017 | — | single container, 2 DBs |
| mongo-express | 8081 | — | DB demo UI |

## 4. Data Models
**User:** name, email unique, passwordHash, role enum, org, phone
**Listing:** donorId, title, qty (servings), veg(bool), cookedAt, expiryAt, city, address, photoUrl, status[POSTED|CLAIMED|PICKED_UP|DELIVERED|EXPIRED|CANCELLED], otp(4-digit), createdAt
**Claim:** listingId, ngoId, riderId|nullable, status, otpAttempt, timeline[]
**Notify:** type, message, refId, createdAt

## 5. Auth Flow
Register → bcrypt hash → login compares → sign JWT `{id,role}` 7d → client stores localStorage → gateway `authMiddleware` verifies → `requireRole(...roles)` gates writes. Frontend hides routes per role.

## 6. Key Rules
- UI never talks to services directly, only via gateway.
- DB ops only in services, never in gateway/frontend.
- Business logic (expiry check, OTP, overlap: one active claim per listing) lives in services.
- All services stateless, health endpoint `GET /health`.
- Common response: `{ok:true,data}|{ok:false,error}`.

## 7. Folder Structure
```
services/<svc>/src/{index.js,models.js,routes.js,middleware.js} + package.json + Dockerfile
services/api-gateway/src/index.js + Dockerfile
frontend/src/{main.jsx,App.jsx,api.js,views/*.jsx} + Dockerfile + vite.config.js
docker-compose.yml, k8s/*.yaml, docs/*
```

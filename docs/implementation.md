# Implementation Guide — Crumbly MVP

## Vertical Slices (build in order)
### Slice A — Auth (TASK-002/003)
Frontend Auth.jsx → gateway /api/auth/* → auth-service. Store token. Test: register 4 roles, login, me.

### Slice B — Post + Browse (TASK-004/005)
PostFood.jsx (donor) → POST /api/listings. Browse.jsx → GET /api/listings?city&veg&available=1. MyListings edit/delete.

### Slice C — Claim + OTP (TASK-006/007)
Browse Claim button → POST /api/claims {listingId}. MyClaims shows OTP (owner/claimer only). Rider Pickups → PATCH pickup {otp} → deliver.

### Slice D — Polish + Docker (TASK-008+)
Leaderboard (sum qty DELIVERED), notify log, DESIGN pass, compose up, TEST_PLAN run.

## API Contracts
- POST /api/auth/register {name,email,password,role,org?} → {token,user}
- POST /api/auth/login {email,password} → {token,user}
- GET /api/auth/me (Bearer) → user
- POST /api/listings (donor) {title,qty,veg,cookedAt,expiryAt,city,address,photoUrl?}
- GET /api/listings?city&veg=true&available=1
- GET /api/listings/mine, PUT /api/listings/:id, DELETE /api/listings/:id
- POST /api/claims {listingId} (ngo) → claim+listing CLAIMED
- GET /api/claims/mine, GET /api/claims/all? (admin), PATCH /api/claims/:id/pickup {otp}, PATCH /api/claims/:id/deliver
- GET /api/notify, POST /api/notify {type,message,refId}

## Env
- auth: PORT=5001 MONGO_URL=mongodb://mongo:27017/authdb JWT_SECRET=change_me
- listing/claim/notify: PORT=500x MONGO_URL=mongodb://mongo:27017/maindb
- gateway: PORT=8080 JWT_SECRET same, AUTH_URL etc.
- frontend: VITE_API_URL=http://localhost:8080

## Done = UI click works + curl 200 + no secret leak + MEMORY updated

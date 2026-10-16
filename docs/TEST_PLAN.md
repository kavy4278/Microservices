# Test Plan — AnnBachao

## Auth
- [ ] Register donor/ngo/rider/admin works, duplicate email → 409
- [ ] Login ok → token, wrong pass → 401
- [ ] No token on POST /listings → 401 via gateway
- [ ] NGO cannot POST /listings → 403 (donor/admin only)
- [ ] Refresh keeps session, logout clears

## Listings
- [ ] Donor creates listing (expiry now+4h default) → appears in Browse
- [ ] Expiry <2h → 400 rejected
- [ ] Edit qty/city works, delete works (owner or admin)
- [ ] Search ?city=Jaipur&veg=true filters correctly
- [ ] Expired listings hidden from available

## Claims + OTP
- [ ] NGO claims POSTED listing → CLAIMED, second claim → 409
- [ ] Donor sees OTP, stranger does not
- [ ] Wrong OTP → 400, correct OTP → PICKED_UP
- [ ] Deliver → DELIVERED, leaderboard +qty

## Responsive
- [ ] 375px single column, 768px 2-col, 1440px 3-col
- [ ] Loading/empty/error states visible

## Docker
- [ ] `docker compose up --build` → 8 containers healthy
- [ ] `curl localhost:8080/health` ok, frontend loads :5173
- [ ] mongo-express :8081 shows users/listings

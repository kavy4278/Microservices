# Product Requirements Document — AnnBachao

## 1. Product
**AnnBachao — Surplus Food Rescue Network.** Microservices web app to rescue surplus cooked food from donors and deliver to NGOs via riders before expiry.

## 2. Problem
Restaurants, messes, weddings waste ~70,000 tonnes food/day in India. NGOs cannot discover surplus in time. No tracking, no expiry guard, no accountability for pickup.

## 3. Target Users
- **Donor** (restaurant / mess / caterer): posts surplus food
- **NGO** (shelter / food bank): claims food for beneficiaries
- **Rider** (volunteer / delivery): picks up and delivers, OTP-verified
- **Admin**: moderates users, listings, sees waste-saved stats

## 4. Goal
One place to post surplus food, claim within expiry window, and track pickup-to-delivery with proof.

## 5. Core Features (MVP — 2 days)
1. Auth: register/login/JWT/me, roles `admin|donor|ngo|rider`
2. Donor dashboard: create/edit/delete food listing, view my listings
3. Browse: search by city, veg-only filter, qty, expiring-soon sort
4. Claim flow: NGO claims listing → status CLAIMED
5. OTP handover: donor gets 4-digit OTP, rider enters OTP at pickup → PICKED_UP → DELIVERED
6. Role dashboards + leaderboard (servings saved)
7. Notify log: claim/pickup/deliver events

## 6. MVP User Stories
- As donor I can post food with qty, veg flag, cookedAt, expiryAt, city, address so NGOs can find it.
- As NGO I can search available food and claim it before expiry.
- As rider I can see assigned pickups and confirm pickup with OTP.
- As admin I can view all listings/claims and delete abuse.

## 7. Out of Scope (v2)
- Payments, live maps routing, AI food-quality check, chat, mobile app, SMS gateway, image upload service (URL only in MVP).

## 8. Success Criteria
A user can: register → login → (donor) post listing → (ngo) search + claim → (rider) OTP pickup → deliver → leaderboard increments. All write APIs require JWT + role check. `docker compose up --build` runs frontend + gateway + 4 services + mongo.

## 9. Non-Functional
- p95 search < 300ms, stateless services, JWT expiry 7d
- Expiry guard: reject listing with expiry < now+2h or cookedAt in future
- No secrets in git, input validation on all POST/PATCH

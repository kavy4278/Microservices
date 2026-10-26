# Todo-Dhruv: Real-Time Delivery, Status Updates & Photo Visibility

> **Status:** Planned  
> **Owner:** AnnBachao — Surplus Food Rescue Network  
> **Priority:** High  
> **Affected services:** auth-service, listing-service, claim-service, notify-service, api-gateway, React frontend  

This document captures three real-time feature enhancements:

1. **Real-time delivery notifications to driver** — instant alerts when a rider has a pickup/delivery action.
2. **Real-time status updates for all users** — live food and delivery status changes pushed to donor, NGO, rider, and admin.
3. **Photo visibility for all users** — food photos uploaded by the donor are visible to NGOs, riders, and admin.

---

## 1. Real-time delivery notifications to driver

### Current behaviour
- Riders poll the claims feed manually (or on screen load) to see new `CLAIMED` listings assigned to them.
- No push notification when a new delivery is assigned, when OTP is ready, or when a pickup window is about to expire.
- Rider may miss a pickup because they are not actively refreshing the app.

### Desired behaviour
| # | Requirement |
|---|-------------|
| 1.1 | Rider receives an instant in-app notification when a listing is claimed and assigned to them (status → `CLAIMED` + `riderId` set). |
| 1.2 | Rider receives a notification when the donor shares the OTP / when pickup is ready for verification. |
| 1.3 | Rider receives a reminder when a pickup window is expiring soon (configurable, e.g. 30 min before `expiryAt`). |
| 1.4 | Rider receives a notification when a delivery is marked complete (their own action confirmed). |
| 1.5 | Notifications appear in the rider's **Alerts** tab and as a real-time badge count (unread count) in the Shell nav. |
| 1.6 | (Future) Push notification / SMS fallback when the rider has the app backgrounded. |

### Data model changes
- `notify-service` `Notification` schema adds fields: `riderId`, `type` (`pickup_ready`, `delivery_assigned`, `window_expiring`, `delivery_confirmed`), `listingId`, `claimId`, `read` (boolean), `createdAt`.
- Index on `riderId` + `read` for fast unread-count queries.

### Frontend (frontend/src/app/App.jsx)
- `Alerts` tab for rider shows delivery-specific notifications with accept/dismiss actions.
- Shell topbar shows a badge: `Notifications N` when unread count > 0.
- Real-time badge updates without page reload.

---

## 2. Real-time status updates for all users

### Current behaviour
- Food status (`POSTED → CLAIMED → PICKED_UP → DELIVERED → EXPIRED → CANCELLED`) and delivery status are only visible after manual refresh.
- Donor, NGO, rider, and admin all reload the screen to see the latest status.
- No cross-user visibility of status transitions (e.g. donor does not know when a rider has picked up unless they refresh).

### Desired behaviour
| # | Requirement |
|---|-------------|
| 2.1 | Any status change on a listing or claim is pushed to all relevant users in real time (donor, NGO, rider, admin). |
| 2.2 | Donor sees live status: `Posted → Claimed by NGO X → Picked up by Rider Y → Delivered`. |
| 2.3 | NGO sees live status of their own claims: `Claimed → Picked up → Delivered`. |
| 2.4 | Rider sees live status of their active runs. |
| 2.5 | Admin sees live network-wide status changes on the dashboard (live ticker or list). |
| 2.6 | Status transitions are recorded in a `timeline` array on the claim/listing with `at`, `by` (userId), `msg`, `status`. |
| 2.7 | UI shows a small status badge + timestamp on each listing/claim card that updates without reload. |

### Implementation options
- **Option A (WebSocket):** Socket.IO or `ws` server in api-gateway or a dedicated notify-service; clients open a WebSocket connection authenticated by JWT.
- **Option B (Server-Sent Events):** Lightweight, one-way server→client, easier over HTTP.
- **Option C (Polling fallback):** 10–15 second polling for clients that cannot open WebSockets.

Recommended: Start with **SSE** for status updates (simpler, works over existing HTTP), upgrade to WebSocket if bidirectional chat is later needed.

### Data model changes
- `listing-service` `Listing` schema: `timeline` array `{ at, by, msg, status }`.
- `claim-service` `Claim` schema already has `timeline`; ensure every status push appends to it.
- `notify-service` `Notification` schema: `userId`, `type`, `entityType` (`listing`/`claim`), `entityId`, `status`, `read`, `createdAt`.

### Frontend (frontend/src/app/App.jsx)
- `Alerts` tab shows a unified live feed: `Listing "Veg Biryani" — Picked up by Rider Y — 2 min ago`.
- Each `FoodCard` and `ClaimCard` shows a live status badge with `updatedAt` timestamp.
- Admin dashboard shows a "Live activity" panel with the most recent status changes across the network.

---

## 3. Photo visibility for all users

### Current behaviour
- Donor uploads a photo (device/camera) when posting a listing.
- Photo is stored as `photoUrl` (base64 data URL) on the listing.
- Photo is visible on the `FoodCard` in Browse (to NGOs/riders who can claim), but **not consistently** shown on claim screens, donor's own listing view, or delivery screens.
- NGOs and riders sometimes do not see the food photo at pickup time, making identification harder.

### Desired behaviour
| # | Requirement |
|---|-------------|
| 3.1 | Donor-uploaded photo is stored on the listing and returned in all API responses that include the listing. |
| 3.2 | Photo is visible to **donor** on their own listing (My listings). |
| 3.3 | Photo is visible to **NGO** in Browse (FoodCard) and in their Claims (ClaimCard). |
| 3.4 | Photo is visible to **rider** in their Claims / pickups (ClaimCard) before and during pickup. |
| 3.5 | Photo is visible to **admin** on All listings and All claims views. |
| 3.6 | Photo is shown in the OtpModal at handover so the rider can verify they are collecting the right food. |
| 3.7 | Fallback: if no photo, show the existing veg/non-veg emoji fallback. |
| 3.8 | Photos are lazy-loaded and optimized (already downscaled on upload) so real-time feeds remain fast. |

### Data model changes
- No schema change needed — `photoUrl` already exists on `Listing`. Ensure `claim-service` attaches `photoUrl` from the linked listing when returning claims.

### Frontend (frontend/src/app/App.jsx)
- `FoodCard` already renders `FoodImage` — ensure it is shown in all contexts (Browse, My listings, All listings).
- `ClaimCard`: render the listing photo above the OTP/pickup code.
- `OtpModal`: render a thumbnail of the food photo with the caption "Confirm this is the food being handed over."
- `Shell` / dashboard: small photo thumbnail in the live activity feed for status changes involving a listing.

---

## Acceptance criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC1 | Rider gets a new delivery assigned | Rider sees instant notification + Alerts badge increments |
| AC2 | Donor's food status changes to `PICKED_UP` | Donor sees live badge update without refresh |
| AC3 | NGO opens their Claims | Sees the donor's food photo on each claim card |
| AC4 | Rider opens a pickup | Sees photo + donor phone + OTP in one view |
| AC5 | Admin opens All listings | Sees photos on every listing card |
| AC6 | OtpModal opens at handover | Food photo thumbnail shown alongside OTP |
| AC7 | No photo uploaded | Veg/non-veg emoji fallback is shown instead |
| AC8 | Rider's pickup window expires soon | Rider gets "window expiring" notification |

---

## Implementation order (suggested)
1. **notify-service:** create `Notification` model + SSE/WebSocket broadcast endpoint.
2. **claim-service + listing-service:** append `timeline` entries on every status change; attach `photoUrl` to claim responses.
3. **api-gateway:** expose SSE stream (`/api/notify/stream`) authenticated by JWT; broadcast status changes to relevant `userId`s.
4. **Frontend:** SSE client in `Shell.jsx` or `AppHome`; unread badge in nav; photo rendering in `FoodCard`, `ClaimCard`, `OtpModal`; `Alerts` live feed.

---

## Files likely to touch
- `services/notify-service/src/index.js`
- `services/claim-service/src/index.js`
- `services/listing-service/src/index.js`
- `services/api-gateway/src/index.js`
- `frontend/src/app/App.jsx` (`ClaimCard`, `OtpModal`, `FoodCard`, `Alerts`, Shell nav badge)
- `frontend/src/components/PhotoInput.jsx` (no change — already captures)
- `frontend/src/components/ui.jsx` (possibly a `LiveBadge` or `NotificationItem` component)

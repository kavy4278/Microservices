# Todo-Dhruv: Real-Time Delivery, Status Updates & Photo Visibility

> **Status:** Ready for implementation  
> **Owner:** AnnBachao — Surplus Food Rescue Network  
> **Priority:** High  
> **Affected services:** auth-service, listing-service, claim-service, notify-service, api-gateway, React frontend  

This document specifies **concrete, feasible implementation options** for three real-time features. Each section lists Option A / B / C with pros, cons, and the recommended choice, plus exact files to touch and step-by-step order so the work can be executed in one go.

---

## Feature 1 — Real-time delivery notifications to driver

### Goal
A rider receives an instant in-app notification (no manual refresh) when:
- a listing is claimed and assigned to them,
- the OTP / pickup is ready,
- the pickup window is expiring soon,
- a delivery they performed is confirmed.

### Feasible options

| Option | Technology | How it works | Pros | Cons |
|--------|------------|--------------|------|------|
| **A (Recommended)** | **Server-Sent Events (SSE)** over HTTP | `api-gateway` exposes `GET /api/notify/stream` (authenticated by JWT). Backend pushes `data: {...}` events to the rider's open connection. Browser `EventSource` consumes it. | Native browser API, works over standard HTTP (no WebSocket upgrade), auto-reconnect, easy to debug, no extra server process. | One-way server→client only (fine for notifications). |
| **B** | **WebSocket (Socket.IO / ws)** | Dedicated WebSocket endpoint in api-gateway or a small notify-service. Client opens persistent bidirectional socket. | Bidirectional, low latency, supports typing indicators later. | Requires WebSocket upgrade support on the gateway, connection management, heartbeat handling. |
| **C** | **Short-interval polling** | Frontend `setInterval` fetches `GET /api/notify/unread` every 15–30 s. | Zero new server tech, trivial to implement, works everywhere. | Not real-time, wastes battery/data, delayed by up to the poll interval. |

**Recommended: Option A (SSE)** — real-time enough for delivery notifications, minimal new infra, works inside the existing Express gateway.

### Data model changes (notify-service)
`services/notify-service/src/index.js` — add to `Notification` schema:
```js
const notificationSchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },   // riderId
  type:     { type: String, enum: ['delivery_assigned','pickup_ready','window_expiring','delivery_confirmed'], required: true },
  title:    { type: String, required: true },
  body:     { type: String },
  entityType: { type: String, enum: ['listing','claim'] },
  entityId: { type: String },
  status:   { type: String },
  read:     { type: Boolean, default: false, index: true },
  createdAt:{ type: Date, default: Date.now },
}, { timestamps: true });
```

### Files to touch
1. `services/notify-service/src/index.js` — Notification model, SSE broadcast helper (`broadcastToUser(userId, event)`), in-memory map of open SSE connections keyed by `userId`.
2. `services/api-gateway/src/index.js` — mount `GET /api/notify/stream` (JWT-authenticated, returns `text/event-stream`), re-use notify-service broadcast map via HTTP call or shared in-memory module.
3. `services/claim-service/src/index.js` — on `POST /api/claims` (claim created) and `PATCH /:id/pickup` (OTP verified) and `PATCH /:id/deliver` (delivered), call notify-service to push to rider + donor + NGO.
4. `frontend/src/app/App.jsx` — `EventSource` client in `Shell.jsx` or `AppHome`; unread badge in Shell nav; `Alerts` tab renders notifications.

### Step-by-step implementation order
1. Add `Notification` model + `broadcastToUser` in notify-service.
2. Add SSE stream endpoint in api-gateway (`GET /api/notify/stream`).
3. Wire claim-service status transitions to call notify-service (rider, donor, NGO).
4. Frontend: open `EventSource` on login, close on logout, increment unread badge, render `Alerts`.
5. Test: open two browsers (donor + rider), claim a listing, verify rider gets instant notification without refresh.

---

## Feature 2 — Real-time status updates for all users

### Goal
Donor, NGO, rider, admin see listing/claim status changes live:
`POSTED → CLAIMED → PICKED_UP → DELIVERED → EXPIRED → CANCELLED`, without page reload.

### Feasible options

| Option | Technology | How it works | Pros | Cons |
|--------|------------|--------------|------|------|
| **A (Recommended)** | **SSE via api-gateway** | Same SSE connection as Feature 1 carries `status_changed` events. `EventSource` listener updates local React state and re-renders cards. | Single connection for notifications + status, no new infra, one code path to maintain. | Same one-way limitation (acceptable). |
| **B** | **WebSocket** | Dedicated socket per user; server pushes status diffs. | Bidirectional, can send selective status diffs. | More complex than SSE; overkill for status-only pushes. |
| **C** | **Polling with React Query / SWR** | `useQuery` refetches claims/listings every 20 s. | No backend change beyond existing REST endpoints. | Not real-time, 20 s lag, more server load. |

**Recommended: Option A (SSE)** — reuse the Feature 1 connection; status events and notification events share one pipe.

### Timeline recording
On every status transition, append to `timeline`:
```js
{ at: new Date(), by: <userId>, byName: <name>, msg: 'picked up', status: 'PICKED_UP' }
```

### Files to touch
1. `services/listing-service/src/index.js` — add `timeline` array to `Listing` schema; on every `PATCH /:id/status`, append entry + broadcast.
2. `services/claim-service/src/index.js` — on every status patch, append to claim `timeline` + broadcast to donor / NGO / rider / admin.
3. `services/notify-service/src/index.js` — broadcast event type `status_changed` with payload `{ entityType, entityId, status, at, by, byName }`.
4. `frontend/src/app/App.jsx` —
   - `ClaimCard`: show live status badge + `updatedAt` timestamp + timeline mini-list.
   - `FoodCard`: show live status badge.
   - `Alerts` tab: unified feed `Listing "Veg Biryani" — Picked up by Rider Y — 2 min ago`.
   - Admin `Overview` / new `Live activity` panel: most recent status changes across network.
5. `frontend/src/components/ui.jsx` — optional `LiveBadge` component (animated status pill).

### Step-by-step implementation order
1. Add `timeline` to listing + claim schemas.
2. Ensure every status mutation appends a timeline entry.
3. Broadcast `status_changed` via SSE on each mutation.
4. Frontend consumes `status_changed` events and updates local state (React `useState` / `useReducer`).
5. Test: donor posts, NGO claims, rider picks up, rider delivers — donor sees each badge change live without refresh.

---

## Feature 3 — Photo visibility for all users

### Goal
Donor-uploaded food photo is visible to donor, NGO, rider, and admin everywhere the listing/claim is shown.

### Feasible options

| Option | Technology | How it works | Pros | Cons |
|--------|------------|--------------|------|------|
| **A (Recommended)** | **Base64 data URL in `photoUrl`** | Photo is downscaled (≤1400 px, JPEG 0.72) on the client and stored as a `data:image/jpeg;base64,...` string in `listing.photoUrl`. Returned in every listing/claim JSON response. | No new storage service, works inside existing JSON body limit (8 MB), zero infra change, immediate visibility everywhere. | Base64 increases payload ~33 % (mitigated by downscaling). |
| **B** | **Multipart upload + static file service** | `multer` in listing-service, files saved to disk / S3, `photoUrl` = `http://.../uploads/xxx.jpg`. | Smaller JSON bodies, browser caches images. | Requires file storage, CDN or static server, new routes, CORS, cleanup of orphaned files. |
| **C** | **Cloudinary / ImgBB third-party** | Client uploads image to third-party, stores returned URL in `photoUrl`. | Offloads storage and bandwidth. | External dependency, API keys, privacy considerations for food photos. |

**Recommended: Option A (base64 data URL)** — already implemented in `PhotoInput.jsx`; the backend already accepts 8 MB JSON bodies; no new services needed.

### Data model changes
None required — `Listing.photoUrl` (String) and `claim-service` already expose `photoUrl` via `donorPhone`/`photoUrl` linkage. Ensure `claim-service` GET attaches `photoUrl` from the linked listing:
```js
o.photoUrl = l ? l.photoUrl : undefined;
```

### Files to touch
1. `services/claim-service/src/index.js` — in `GET /api/claims`, attach `o.photoUrl = l ? l.photoUrl : undefined` (already partially present; verify all roles receive it).
2. `services/listing-service/src/index.js` — `GET /:id` returns `photoUrl` (already present).
3. `frontend/src/app/App.jsx` —
   - `FoodCard`: `FoodImage` already renders `l.photoUrl` — verify it renders in Browse, My listings, All listings.
   - `ClaimCard`: add photo thumbnail above the OTP / pickup code.
   - `OtpModal`: render photo thumbnail with caption "Confirm this is the food being handed over."
   - Admin `All listings` / `All claims`: photo thumbnails.
4. `frontend/src/components/ui.jsx` — `FoodImage` already handles fallback emoji on error; no change required unless a `PhotoThumb` variant is wanted.

### Step-by-step implementation order
1. Verify `claim-service` GET returns `photoUrl` for every role.
2. Add photo thumbnail to `ClaimCard` (all roles) and `OtpModal`.
3. Verify `FoodCard` renders photo in Browse / My listings / All listings.
4. Test end-to-end: donor posts with photo, NGO sees it in Browse/Claims, rider sees it at pickup, admin sees it in All listings.

---

## Cross-cutting acceptance criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC1 | Rider gets a new delivery assigned | Instant SSE notification + Alerts badge increments (no refresh) |
| AC2 | Donor food status → `PICKED_UP` | Donor sees live badge update without page reload |
| AC3 | NGO opens Claims | Sees donor food photo on each claim card |
| AC4 | Rider opens a pickup | Sees photo + donor phone + OTP in one view |
| AC5 | Admin opens All listings | Sees photos on every listing card |
| AC6 | OtpModal opens | Food photo thumbnail shown alongside OTP |
| AC7 | No photo uploaded | Veg / non-veg emoji fallback shown |
| AC8 | Rider pickup window expiring soon | Rider gets "window expiring" notification |
| AC9 | NGO views their claim timeline | Sees `claimed → picked up → delivered` with timestamps |

---

## Suggested implementation order (one-go checklist)

```
[ ] 1. notify-service: Notification model + broadcastToUser() helper
[ ] 2. api-gateway: SSE stream endpoint GET /api/notify/stream (JWT auth)
[ ] 3. claim-service: broadcast on claim create / pickup / deliver
[ ] 4. listing-service: broadcast on status change; timeline entries
[ ] 5. Frontend: EventSource client + unread badge in Shell nav
[ ] 6. Frontend: Alerts tab live feed
[ ] 7. Frontend: photo thumbnail in ClaimCard + OtpModal + FoodCard
[ ] 8. Frontend: admin live activity panel (optional phase 2)
[ ] 9. E2E test: two browsers, donor posts → NGO claims → rider picks up → rider delivers; verify live badges + photos + notifications
```

---

## Files likely to touch (summary)

| File | Change |
|------|--------|
| `services/notify-service/src/index.js` | Notification model, SSE broadcast map, broadcastToUser |
| `services/api-gateway/src/index.js` | SSE stream endpoint, JWT auth for stream |
| `services/claim-service/src/index.js` | timeline entries, broadcast on status change, photoUrl in GET |
| `services/listing-service/src/index.js` | timeline on Listing schema, broadcast on PATCH /:id/status |
| `frontend/src/app/App.jsx` | EventSource client, Alerts feed, photo in ClaimCard/OtpModal/FoodCard, admin live panel |
| `frontend/src/components/ui.jsx` | optional LiveBadge / NotificationItem components |

# Todo-1: Communication, City Filter & Delivery-Status Permissions

> **Status:** Planned  
> **Owner:** AnnBachao — Surplus Food Rescue Network  
> **Priority:** High  
> **Affected services:** auth-service, listing-service, claim-service, api-gateway, React frontend  

This document captures three related feature enhancements:

1. **City-filter enhancement** — smarter discovery of nearby surplus food.
2. **Phone-based communication (donor ↔ NGO ↔ rider)** — OTP and all hand-off details flow over phone number instead of only in-app messages.
3. **Delivery-status permissions** — "Mark delivered" visible to both NGO and rider, but **only the rider can change** delivery status.

---

## 1. City-filter enhancement

### Current behaviour
- `/api/listings?available=1&city=X` does an exact, case-insensitive regex match: `q.city = new RegExp('^' + city.trim() + '$', 'i')`.
- Donors and NGOs must type the city exactly. Nearby cities and partial matches are excluded.
- No city auto-suggest; the donor posting a listing types city free-text with no validation against the network's known cities.

### Desired behaviour
| # | Requirement |
|---|-------------|
| 1.1 | City filter supports **partial / fuzzy matching** (e.g. "mumb" returns "Mumbai"). |
| 1.2 | City filter is **case-insensitive** and trims whitespace. |
| 1.3 | Donor posting a listing picks city from a **validated dropdown** of cities already present in the network (prevents typos like "Mumbay", "Mummbai"). |
| 1.4 | Browse page shows a **"Cities with food" chip list** so NGOs/riders can one-click filter. |
| 1.5 | Listing detail/search result shows distance-aware ordering (city match first, then expiry ascending). |

### API contract (listing-service)
```
GET /api/listings?available=1&city=<partial>&veg=<true|false>
```
- `city` now does a case-insensitive **contains** match: `new RegExp(city.trim(), 'i')`.
- Falls back to exact match when no partial results exist (optional ranking boost).

### Frontend (frontend/src/app/App.jsx)
- `Browse` view: city input gains a dropdown of distinct cities from `data.available`.
- `PostForm`: city becomes a `<select>` populated from `GET /api/listings` distinct cities, plus an "Other…" free-text option.

---

## 2. Phone-based communication (donor ↔ NGO ↔ rider)

### Current behaviour
- User schema stores `phone` but it is **not** surfaced in listings, claims, or OTP flows.
- OTP is shown only inside the claim record to donor/NGO/admin; riders and NGOs never see the donor's phone number directly.
- No SMS/phone notification layer; all coordination happens via in-app toasts and the claim OTP modal.

### Desired behaviour
| # | Requirement |
|---|-------------|
| 2.1 | `phone` stored on registration (**optional** — does not block sign-up or listing creation). |
| 2.2 | Listing stores `donorPhone` (from the donor's profile, only if provided). |
| 2.3 | Claim record exposes `donorPhone` to **NGO and rider** roles only when present, alongside the existing OTP. |
| 2.4 | Claim detail / OtpModal shows an optional "Contact donor: <phone>" line **only when a phone number exists** — never a required field. |
| 2.5 | Rider may call the donor ahead of pickup **only if they choose to**; the app never forces a call or auto-dials. |
| 2.6 | No SMS gateway, no auto-SMS OTP, no phone verification step added to any existing flow. |

#### Scope rule — OTP stays exactly as-is
The existing **OTP verification flow is unchanged**. The 4-digit pickup code is still generated, shown, and verified exactly as today. Phone is **not** used to replace, bypass, or add steps to OTP. OTP is **not** sent via SMS; it remains an in-app code.

If a donor never provides a phone number, every existing feature (post, claim, pickup, deliver) continues to work exactly as before — the phone line simply does not appear.

### Data changes
- `auth-service` `User` schema: `phone` optional, default `''`.
- `pub(u)` includes `phone`.
- `listing-service` `Listing` schema adds `phone: { type: String, default: '' }`.
- `claim-service` `GET /api/claims` attaches `donorPhone` + `donorName` to each claim for NGO/rider roles (only when present).

### Frontend
- `ClaimCard`: when role is `ngo` or `rider`, render an optional "Contact donor: <phone>" line next to the pickup-code display — only rendered when `donorPhone` exists.
- `OtpModal`: unchanged; no phone line added unless a number exists.
- No new required phone field on any form.

---

## 3. Delivery-status permissions

### Current behaviour
- `ClaimCard` shows "Mark delivered" button for role `rider || ngo || admin` when `status === 'PICKED_UP'`.
- Both NGO and rider can move a claim `PICKED_UP → DELIVERED`.
- No enforcement that the person physically moving the food is the rider.

### Desired behaviour
| # | Requirement |
|---|-------------|
| 3.1 | "Mark delivered" button is **visible to NGO and rider** (transparency: NGO can see their food was delivered). |
| 3.2 | **Only the rider** (`c.riderId === currentUser.id`) can actually execute the `PATCH /api/claims/:id/deliver` transition. |
| 3.3 | NGO clicking "Mark delivered" (without being the assigned rider) gets `403 Forbidden` with message "Only the assigned rider can mark delivery." |
| 3.4 | Admin retains override ability to mark delivered. |
| 3.5 | ClaimCard shows a rider-assigned badge: "Picked up by <riderName>" when `riderId` is set. |

### Backend changes (claim-service)
```js
app.patch('/:id/deliver', async (req, res) => {
  const c = await Claim.findById(req.params.id);
  if (!c) return 404;
  if (c.status !== 'PICKED_UP') return 400 'pick up first';
  // permission gate
  if (req.userRole !== 'admin' && String(c.riderId) !== req.userId) {
    return 403 { ok: false, error: 'only the assigned rider can mark delivery' };
  }
  c.status = 'DELIVERED';
  ...
});
```

### Frontend changes (frontend/src/app/App.jsx, ClaimCard)
- Visibility: `{ (role === 'rider' || role === 'ngo' || role === 'admin') && c.status === 'PICKED_UP' && <Button ... onClick={onDeliver}> }` — keep for all three roles so the button is visible.
- The `onDeliver` handler calls the API; the server enforces the rider-only rule and returns `403` for NGOs who are not the rider.
- Show toast: "Only the rider assigned to this pickup can confirm delivery." on `403`.
- Add rider badge: `{c.riderId && <span>Picked up by {c.riderName}</span>}`.

---

## Acceptance criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC1 | NGO types partial city in Browse | Matching nearby cities returned |
| AC2 | Donor posts listing | City chosen from validated dropdown |
| AC3 | Donor registers without phone | `400` "phone required" |
| AC4 | NGO opens a claimed listing | Sees donor phone + OTP |
| AC5 | Rider opens a claimed listing they picked up | Sees donor phone; "Mark delivered" works |
| AC6 | NGO (not the rider) clicks "Mark delivered" | Button visible; click returns `403`; status stays `PICKED_UP` |
| AC7 | Rider clicks "Mark delivered" on their own pickup | `200`; status becomes `DELIVERED` |

---

## Implementation order (suggested)
1. auth-service: make `phone` required + include in JWT/public user.
2. listing-service: add `phone` field; populate `donorPhone` on create.
3. claim-service: attach `donorPhone`/`donorName`; add rider-only gate on `/deliver`.
4. api-gateway: forward `x-user-phone`.
5. Frontend: register phone field; PostForm city dropdown; Browse city chips; ClaimCard phone + rider badge + 403 handling.

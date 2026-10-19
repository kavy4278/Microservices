# AnnBachao: What to Add for the Final App

Recommendation after reading the build inventory (WhatIsBuilt.md).

**Short answer:** do not build rider earnings alone. Build **one new service** that holds three things: rider earnings, sponsor-a-meal, and impact numbers. The MVP already gives the proof (OTP-verified `DELIVERED`), so the only job left is to attach money to it.

**Memory trick: Hook, Ledger, Sponsor, Show.**

## What the build already gives you

| Already built | Why it helps |
| --- | --- |
| `PATCH /:id/deliver` in claim-service moves a claim to `DELIVERED` | This is the **hook**. Money is created at this exact moment |
| `riderId` is saved on the claim at pickup | You already know which rider to credit |
| `qty` on every claim | This is the meal count for sponsors and impact |
| Gateway with role guard and identity headers | New routes plug in with little work |
| Admin dashboard | A place to mark payouts as paid |
| Smoke test pattern | Copy it to test the new service |

## What to add (in priority order)

| # | Add | Where it lives |
| --- | --- | --- |
| 1 | **ledger-service** (new, port 5005) | New container, DB `maindb` |
| 2 | **Rider earnings** | `earnings` collection: `claimId`, `riderId`, `amount`, `status` (`PENDING` / `PAID`), `paidRef` |
| 3 | **Sponsor-a-meal** | `pledges` collection: `sponsorId`, `amount`, `mealsFunded`, `mealsDelivered` |
| 4 | **Impact endpoint** | Counts from `DELIVERED` claims: meals, deliveries, by city and NGO |
| 5 | **`sponsor` role** | Add to the User model's role whitelist and the gateway |
| 6 | **Frontend** | Rider: earnings tab. Sponsor: pledge and progress page. Admin: payouts and impact |

## How the money flows (step by step)

1. The rider delivers and claim-service sets `DELIVERED`.
2. Claim-service calls ledger-service with `claimId`, `riderId` and `qty`.
3. Ledger-service creates **one earning** for the rider, for example a flat ₹40, status `PENDING`.
4. It also assigns the claim's meals to the **oldest open pledge** (first in, first out).
5. The sponsor's page updates: "78 of 100 meals delivered."
6. The admin pays the rider by UPI outside the app and marks the earning `PAID`.

## Three things to get right

1. **Make it safe to retry.** Add a unique index on `claimId` in `earnings`, so a repeated deliver call can never pay twice.
2. **Don't lose earnings if ledger-service is down.** Add an admin "sync delivered claims" button that creates any missing rows.
3. **Keep the payout rate in config**, such as an env variable, not in code.

## Small cleanups before the final version

These come from the build inventory:

- **Unused dependency:** `http-proxy-middleware` is still in the gateway's `package.json`. Remove it.
- **Demo security:** the demo passwords and mongo-express `admin / pass` are fine for a demo but should not ship publicly. Close or protect mongo-express.
- **Expiry:** `EXPIRED` exists as a status, but the inventory does not say what sets it. Check that expired listings actually get marked, because the impact numbers depend on it.
- **Deliver check:** the inventory does not say whether `/deliver` verifies that the delivering rider is the one who picked up. Confirm this, since money now depends on it.
- **Tests:** extend `tests/smoke.js` for the ledger. For example: deliver, then assert one earning; deliver again, then assert still one.

## Still leave out

Stars and streaks, paid food orders, real payment gateway, subscriptions, SMS, live maps. These match the v2 list.

## How to present it

"Every rescue is OTP-verified. A verified delivery creates a rider earning and funds a sponsor's meal automatically, and the same data powers an impact dashboard."

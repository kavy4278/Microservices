# Business Model — Crumbly

**Surplus Food Rescue Network.** Connects restaurants, hotels, messes and caterers (donors) with nearby NGOs (beneficiaries) and volunteer riders to move safe surplus food before it expires — with an OTP-verified handover so every rescue is accountable.

---

## 1. Positioning

Crumbly is a **marketplace for surplus food**, not a charity portal. The core rescue loop (post → claim → pickup → deliver) stays free so supply stays high; monetization comes from the layers enterprises, logistics and impact-reporting buyers will pay for.

> Keep the rescue free. Charge for the value around it.

---

## 2. Value Proposition by User

| User | Pain today | Crumbly value | Why they'd pay |
|------|-----------|-----------------|----------------|
| **Donor** (restaurant / hotel / caterer) | Pays to dispose of surplus; no brand upside | Post in seconds, verifiable rescue, sustainability proof | Fee < disposal cost; tax + CSR credit; brand goodwill |
| **NGO** (shelter / food bank) | Can't discover surplus in time | Live local listings, claim + track | Free supply — no direct charge |
| **Rider** (volunteer / delivery) | Ad-hoc, untracked pickups | Clear runs, OTP proof, history | Optional priority routing / earnings perks |
| **Platform** | — | Trust + volume + verified impact data | Commission, subscription, impact reports |

---

## 3. Revenue Streams

### 3.1 Commission (donor-side, per successful rescue)
- **Model:** small flat fee per rescue, or **3–5% of the food's replacement value**.
- **Why it converts:** a restaurant already pays for the food and then again to throw it away. A rescue fee is cheaper than disposal *and* generates CSR/tax benefit.
- **Enforcement point:** charged only when a claim reaches `DELIVERED` (OTP-verified), so donors only pay for real outcomes — no fee for listings that expire.

### 3.2 Enterprise SaaS (multi-outlet chains)
- Monthly subscription for restaurants/hotel groups/caterers with many outlets.
- **Included:** consolidated dashboard across outlets, food-safety & compliance logs, CSV/analytics export, API/webhooks, priority pickup scheduling, SSO.
- **Pricing signal (illustrative):** tiered by number of outlets (e.g. starter / growth / enterprise).

### 3.3 Impact & CSR reports
- **Verified impact data** is the product: meals served, kg CO₂ avoided, outlets participating, per-NGO and per-city breakdowns.
- Buyers: corporate CSR budgets (they need audited impact for reporting), foundations, municipal sustainability programs.
- **Also opens:** grants and public-sector contracts where cities have food-waste mandates.

### 3.4 Logistics / delivery
- Per-pickup delivery fee where a paid rider is used (vs volunteer).
- Optional rider subscription for premium routing / guaranteed slots.
- Future: cold-chain and last-mile partners on a revenue share.

### 3.5 Marketplace & partners
- **Sponsored / featured listings** — donors pay for visibility in the browse feed (clearly labelled).
- Partner ecosystem revenue share: packaging, cold storage, food banks, CSR platforms.

---

## 4. Pricing Approach

- **Always free:** small donors, NGOs, riders — this is what keeps listings and rescues high.
- **Paid:** commission on delivered rescues, enterprise subscriptions, impact reports, logistics, sponsorship.
- Prices are set as **value-based** (below the cost of disposal for donors; below the cost of building an in-house CSR/impact pipeline for enterprises), not cost-plus.

*Illustrative starting points (to be validated in pilots):*

| Offering | Signal |
|----------|--------|
| Small donor rescue fee | Flat micro-fee per delivered rescue |
| Enterprise SaaS | Monthly tier by outlet count |
| Impact report | Per report / annual license |
| Paid logistics | Per pickup, distance/weight based |
| Featured listing | Per listing or per campaign |

---

## 5. Cost Structure

- **Engineering/infra:** microservices on containers; costs scale with traffic (gateway + 4 services + MongoDB).
- **Ops & trust:** food-safety guidance, NGO verification, abuse/moderation.
- **Growth:** onboarding donors and NGOs city-by-city; rider community building.
- **Support & compliance:** enterprise contracts, CSR audit trails.

---

## 6. Unit Economics (logic, illustrative)

```
Contribution per rescue = commission_per_rescue
                       − (payment_processing + support_share + ops_share)

Monthly profit = (delivered_rescues × contribution)
               + enterprise_subscriptions
               + impact_report_revenue
               − fixed (infra + ops + growth)
```

The engine is **volume**: free access for small donors/NGOs maximizes listings → more rescues → more commission and more impact data to sell. Enterprise subscription and impact reports are higher-margin recurring layers on top.

---

## 7. Go-to-Market (phased)

1. **Pilot (single city):** sign up a dense cluster of restaurants + 5–10 NGOs + volunteer riders. Prove the rescue loop and OTP accountability.
2. **Density before breadth:** saturate one city so NGOs always find food → word-of-mouth among donors.
3. **Enterprise motion:** convert multi-outlet chains with the subscription dashboard + compliance logs.
4. **CSR/impact:** package verified data into reports for corporate and municipal buyers.
5. **Expand:** replicate the pilot playbook city-by-city; add logistics/partner revenue.

---

## 8. Competitive Angle

- **Vs. ad-hoc WhatsApp/phone coordination:** no tracking, no proof, no expiry guard — Crumbly gives status + OTP accountability.
- **Vs. generic food-donation directories:** they stop at discovery; Crumbly owns the **verified pickup-to-delivery loop**, which is what makes the impact data (and thus the revenue) credible.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Donors resist paying a fee | Fee only on **delivered** rescues; frame vs disposal cost; keep small-donor tier free |
| Food-safety liability | Clear safety windows (expiry guard), OTP-verified chain of custody, NGO verification |
| Network cold-start | Seed supply (donors) first in a dense area; volunteers riders lower logistics cost |
| Fraud / misuse | Role-based access, admin moderation, verified handover, abuse deletion |
| Mission drift from monetization | Guardrail below |

---

## 10. Guardrails

- The **core rescue never becomes paywalled** — small donors, NGOs and riders keep free access.
- Commission is charged **only on OTP-verified delivery**, so the platform only profits when food actually reaches people.
- Impact numbers sold to buyers are **derived from the same verified event data** shown to users — no separate, inflated metrics.

---

*This model is a plan for sustainability around an MVP that is already built and working (auth, listings, claims, OTP pickup/delivery, role dashboards). Monetization features (commission, subscriptions, impact reports, logistics) are intentionally out of MVP scope and marked for v2.*

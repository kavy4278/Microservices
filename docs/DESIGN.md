# Design System — Crumbly

## Style
Warm, trust-first, food-rescue. Modern minimal, high contrast, big touch targets. No clutter — donor posts in <30s.

## Typography
System stack + Inter fallback. H1 28px/700, H2 20px/700, Body 15px, Muted 13px. All forms labeled, required marked *.

## Colors
- Primary (action/save food): #16A34A
- Primary dark hover: #15803D
- Accent (expiry/warn): #F59E0B
- Danger: #DC2626
- Background: #FFF7ED / #F8FAFC cards white
- Text: #0F172A, Muted: #64748B, Border: #E2E8F0
- Radius 12px cards, 8px buttons. Header green gradient.

## Layout
Top navbar: logo 🍛 Crumbly + role badge + logout. Sidebar per role:
- Donor: Post Food | My Listings | Leaderboard
- NGO: Browse | My Claims | Leaderboard
- Rider: Pickups | Log
- Admin: All Listings | All Claims | Users

## Components
- Card: white, 1px border, 12px radius, 12px padding
- Buttons: primary green, secondary outline, destructive red outline
- Badge: status pills POSTED(green) CLAIMED(amber) PICKED(blue) DELIVERED(grey) EXPIRED(red)
- Countdown: red if <1h to expiry
- OTP box: 4-digit mono, big

## UX Requirements
- Every page: loading state, empty state ("No food yet — post first"), error state with retry
- Mobile responsive: single column <768px, grid ≥900px
- Expiry input defaults to now+4h to prevent validation fail
- Confirm before delete/claim. Show OTP only to donor + claimer.
- Accessibility: labels, keyboard focus, contrast ≥4.5:1

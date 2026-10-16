# Security Requirements

## Authentication
Private routes require `Authorization: Bearer <JWT>`. Gateway verifies with JWT_SECRET. Token 7d.

## Authorization
- POST/PUT/DELETE /listings: donor,admin only. Owners can edit own; admin any.
- POST /claims: ngo,admin. Pickup/deliver: ngo,rider,admin or donor owner.
- /notify write: internal via gateway, read: any authed.
- Frontend also hides buttons, but server is source of truth.

## Secrets
Never commit `.env`. Required: JWT_SECRET, MONGO_URL, PORT. Frontend only gets VITE_API_URL. Provide `.env.example`.

## Input Validation
Trim strings, title ≤120, qty 1–1000 int, city required, cookedAt ≤ now, expiryAt ≥ now+2h, OTP 4-digit. Reject extra fields for role/email change.

## APIs
Gateway rate-limits naive (100/min IP in-memory). Services trust only `x-user-id/role` from gateway, not body. CORS on gateway only.

## File Uploads
MVP: photoUrl string only, no binary upload. Validates http(s) prefix, length ≤500. v2 would add type+size checks.

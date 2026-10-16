# All Diagrams — AnnBachao

## 1. C4 Level 1 (Context)
```mermaid
graph TD
  Donor-->FE[AnnBachao SPA]
  NGO-->FE
  Rider-->FE
  Admin-->FE
  FE-->GW[API Gateway :8080]
  GW-->Mongo[(MongoDB)]
```

## 2. C4 Level 2 (Containers)
```mermaid
graph TD
  FE["Frontend :5173"]-->GW["Gateway :8080"]
  GW-->A["auth :5001"]
  GW-->L["listing :5002"]
  GW-->C["claim :5003"]
  GW-->N["notify :5004"]
  A-->DBA[("authdb")]
  L-->DBM[("maindb")]
  C-->DBM
  N-->DBM
```

## 3. ER
```mermaid
erDiagram
  USER ||--o{ LISTING : posts
  LISTING ||--o| CLAIM : has
  USER ||--o{ CLAIM : claims
  CLAIM ||--o{ NOTIFY : emits
  USER { string email string role string passwordHash }
  LISTING { string title int qty bool veg datetime expiryAt string status string otp }
  CLAIM { string listingId string ngoId string status string otpAttempt }
```

## 4. JWT Sequence
```mermaid
sequenceDiagram
  Browser->>Gateway: POST /api/auth/login
  Gateway->>Auth: proxy
  Auth-->>Browser: {token,user}
  Browser->>Gateway: POST /api/listings + Bearer
  Gateway->>Gateway: verify JWT, requireRole(donor)
  Gateway->>Listing: forward x-user-id
  Listing-->>Browser: created
```

## 5. Claim State Machine
```mermaid
stateDiagram-v2
  [*]-->POSTED: donor posts
  POSTED-->CLAIMED: NGO claims
  CLAIMED-->PICKED_UP: correct OTP
  PICKED_UP-->DELIVERED: rider delivers
  POSTED-->EXPIRED: cron/expiry filter
  CLAIMED-->CANCELLED: admin cancel
```

## 6. Docker Topology
```mermaid
graph LR
  subgraph compose
    fe-->gw-->a & l & c & n --> mongo
    mex[mongo-express]-->mongo
  end
```

## 7. User Flows
- Donor: login → Post → MyListings sees OTP → Rider picks → Leaderboard up
- NGO: login → Browse filter city/veg → Claim → MyClaims OTP → share OTP offline to rider
- Rider: login → Pickups → enter OTP → Deliver

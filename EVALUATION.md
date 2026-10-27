# Evaluation — Crumbly

## What is Crumbly?
AnnBachao → rebranded as **Crumbly**, a microservices-based surplus food rescue network. Donors post surplus food, NGOs claim it, riders pick it up with an OTP, and the rescue is recorded as delivered — all before the food expires.

## Core Flow (5 minutes)
1. **Donor** posts surplus food (title, qty, city, address, photo, safe-until time).
2. **NGO** browses available food, claims a listing → OTP generated.
3. **Rider** confirms pickup by entering the OTP at the donor's doorstep.
4. **Rider** marks delivery → status becomes **DELIVERED**.
5. **Admin** monitors all listings, claims, and users across the network.

## Tech Stack (chosen for simplicity & speed)
- **Frontend:** React + Vite (port 5173)
- **Backend:** 6 Express microservices (Node.js)
  - auth-service (5001), listing-service (5002), claim-service (5003), notify-service (5004), api-gateway (8080)
- **Database:** MongoDB 7 (authdb + maindb)
- **Authentication:** JWT + bcrypt, role-based access (donor / ngo / rider / admin)

## Docker — Why & How
Each service is packaged into its own Docker image:
- Isolated dependencies (Node version, npm packages) per service
- Same image runs identically on any machine ("works on my machine" problem solved)
- Images built and tagged as `crumbly/<service>:latest`
- `docker-compose.yml` spins up all 8 containers (6 services + mongo + mongo-express) with one command

## Kubernetes — Why & How
Instead of running containers manually on one host, the app is deployed on a **kind (Kubernetes in Docker)** cluster:
- **Deployment:** Declares how many replicas of each service should run
- **Service:** Exposes each service inside the cluster via a stable internal IP
- **Ingress:** Routes external traffic to the right service
- **Pods:** Containers run inside pods; if a pod crashes, Kubernetes restarts it automatically
- **Port-forward:** `kubectl port-forward` maps cluster ports (80, 8080) to localhost (5173, 8085)

## How to Run (Evaluation)
```bash
# Option 1: Docker Compose (simplest)
docker compose up --build
# UI: http://localhost:5173 | API: http://localhost:8085/health

# Option 2: Kubernetes (kind cluster)
powershell.exe -ExecutionPolicy Bypass -File "./scripts/k8s-deploy.ps1" -Expose
# UI: http://localhost:5173 | API: http://localhost:8085/health
```

## Demo Accounts (pre-seeded)
| Role | Email | Password |
|------|-------|----------|
| Donor | donor@test.com | donor123 |
| NGO | ngo@test.com | ngo123 |
| Rider | rider@test.com | rider123 |
| Admin | admin@test.com | admin123 |

## What the Evaluator Can Test
- Register/login as any role
- Donor posts a listing with photo + expiry window
- NGO claims a listing (blocks double-claim)
- Rider picks up with OTP, marks delivery
- Admin views all listings, claims, and users
- Real-time status updates via SSE notifications
- Admin cannot claim food (RBAC enforced)

## Git & Version Control
- Full history on GitHub: `https://github.com/kavy4278/Microservices.git`
- All changes committed and pushed; tag `v1-mvp` available

## Summary
Crumbly is a complete, containerized, Kubernetes-orchestrated microservices app demonstrating CRUD operations, JWT auth, RBAC, real-time notifications, photo uploads, and container orchestration — ready for live demonstration.
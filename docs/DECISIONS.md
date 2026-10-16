# Architecture Decisions

## ADR-001: Express microservices over Next.js monolith
Decision: 4 Express services + gateway.
Reason: Syllabus requires NodeJS CRUD + SOA + containers. Monolith hides service boundaries.
Trade-off: More Dockerfiles, but clear demo of independent deploy/scale.

## ADR-002: MongoDB over PostgreSQL/Supabase
Decision: Single mongo container, 2 logical DBs.
Reason: Syllabus allows MongoDB, flexible food schema, free local demo, mongo-express for CRUD proof.
Trade-off: No joins; we denormalize donor name/city into listing.

## ADR-003: React Vite over Next.js
Decision: Vite SPA.
Reason: 2-day speed, tiny Docker image (nginx), no SSR needed, faster HMR.
Trade-off: No SSR/SEO — irrelevant for dashboard app.

## ADR-004: Custom JWT auth-service over Supabase Auth
Decision: bcryptjs + jsonwebtoken in auth-service.
Reason: Must demo middleware, JWT, RBAC explicitly for marks.
Trade-off: We own hashing/rotation; acceptable for MVP.

## ADR-005: Docker Compose for live demo, K8s YAMLs for marks
Decision: Live demo = `docker compose up --build`. Ship `k8s/` deployments/services for viva.
Reason: Lab PC has Docker only; Minikube not guaranteed.
Trade-off: No live pod scaling, but YAMLs + `kubectl --dry-run` screenshots suffice.

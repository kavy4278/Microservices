# Running & Verifying AnnBachao

How to start the project, which shell to use for which command, every URL you need, and a step-by-step checklist for proving each function works.

---

## 1. Shell compatibility

Verified on this machine (Windows, PowerShell 5.1 + Git Bash).

| Tool | Git Bash | PowerShell 5.1 |
|---|---|---|
| `git`, `node`, `docker`, `kubectl`, `kind` | ✅ | ✅ |
| **`npm`** | ✅ **works** (11.8.0) | ❌ **fails** — `AuthorizationManager check failed` |
| `curl` | ✅ native | use `curl.exe` (bare `curl` is an alias for `Invoke-WebRequest`) |

### The one rule

> **Any `npm ...` command → Git Bash.** Everything else works in either shell.

If you must run npm in PowerShell, use `npm.cmd` instead of `npm`.

### Project root

- Git Bash: `cd "/c/Users/DELL/Desktop/MicroServices/Kavy_Project"`
- PowerShell: `cd C:\Users\DELL\Desktop\MicroServices\Kavy_Project`

---

## 2. Prerequisites

1. **Docker Desktop is running** — both paths need it (kind runs as a Docker container; Compose needs the daemon).
2. Tools already on PATH: `git`, `node`, `npm`, `docker`, `kubectl`, `kind`.

---

## 3. How to run — Option A: Kubernetes (recommended)

This is the path that proves requirement 5 (Kubernetes deployment).

**Git Bash:**
```bash
cd "/c/Users/DELL/Desktop/MicroServices/Kavy_Project"
powershell.exe -ExecutionPolicy Bypass -File "./scripts/k8s-deploy.ps1" -Expose
```

**PowerShell:**
```powershell
cd C:\Users\DELL\Desktop\MicroServices\Kavy_Project
.\scripts\k8s-deploy.ps1 -Expose
```

Other switches:
```powershell
.\scripts\k8s-deploy.ps1                # build, load, deploy, verify (no port-forwards)
.\scripts\k8s-deploy.ps1 -VerifyOnly    # re-run only the verification block
.\scripts\k8s-deploy.ps1 -TearDown      # delete the cluster
```

What the script does, in order:
1. switches kubectl to context `kind-annbachao`
2. builds 6 images: auth-service, listing-service, claim-service, notify-service, api-gateway, frontend
3. `kind load docker-image` for each (kind uses containerd, not Docker's image store)
4. `kubectl apply -f k8s/all.yaml` (18 documents)
5. waits for all pods to be Ready
6. **verifies** — see below
7. with `-Expose`: opens port-forward windows (skips any port already listening, so re-running never creates duplicates)

> ℹ️ kind prints `not yet present on node ... loading...` while it copies images into the node. That is **normal progress on stderr**, not an error. `Invoke-Checked` now hides it on success and only prints it in red if the command actually fails.

### Built-in verification

The script ends with a pass/fail summary instead of just stopping:

```
=== verification ===
images on node:      6/6 present
pods ready:          8/8 Running 1/1
pod images:          all pinned to annbachao/*:latest
storage:             PVC mongo-data Bound
port 5173 :          LISTENING
port 8085 :          LISTENING
end-to-end smoke test: ... SMOKE PASS
ALL CHECKS PASSED
```

**Keep the two port-forward windows open.** Closing them disconnects the app from `localhost`.

### Cluster shape

| Resource | Detail |
|---|---|
| Cluster | `kind-annbachao` (single node: `annbachao-control-plane`, K8s v1.37.0) |
| Workloads | mongo, auth, listing (2 replicas), claim, notify, gateway, frontend — 8 pods |
| Storage | PVC `mongo-data` (1Gi, RWO, StorageClass `standard`) |
| Access | `kubectl port-forward` (no ingress controller installed in kind) |

### Useful cluster commands
```powershell
kubectl config current-context     # kind-annbachao
kubectl get pods                   # 8/8 Running
kubectl get pvc                   # Bound
kubectl get ingress,svc
kubectl logs deploy/api-gateway --tail=50
```

### Teardown
- PowerShell: `.\scripts\k8s-deploy.ps1 -TearDown`
- Git Bash: `powershell.exe -ExecutionPolicy Bypass -File "./scripts/k8s-deploy.ps1" -TearDown`

---

## 4. How to run — Option B: Docker Compose

Use this if you want to demo the Docker path instead. Free the ports first.

```powershell
.\scripts\k8s-deploy.ps1 -TearDown    # or just stop the two port-forward windows
docker compose up -d --build
node tests/seed.js                    # optional demo data
```

Brings up 8 containers: mongo, auth (5001), listing (5002), claim (5003), notify (5004), gateway (8085), frontend (5173), mongo-express (8081).

```powershell
docker compose ps         # status
docker compose logs -f    # tail everything
docker compose down       # stop (named volume mongo-data is kept)
```

> ⚠️ **Do not run Compose and the cluster at the same time.** Both claim ports `5173` and `8085`.

---

## 5. URL list

### UI

| URL | What |
|---|---|
| http://localhost:5173 | **App** (landing → Sign in / Get started) |
| http://localhost:5173/ | Landing — 15 sections, nav anchors `#how #features #usecases #faq` |
| http://localhost:5173/login | Login |
| http://localhost:5173/register | Register |

Routing is state-based (single-page, no router library) — dashboard routes are driven by the in-app sidebar, not the address bar.

### API — gateway base `http://localhost:8085`

| Method + path | Purpose | Auth |
|---|---|---|
| `GET /health` | Gateway health | none |
| `POST /api/auth/register` | Register `{name,email,password,role,org,phone}` | none |
| `POST /api/auth/login` | Login → JWT | none |
| `GET /api/auth/me` | Current user | JWT |
| `GET /api/users` | All users | admin |
| `GET /api/listings?available=1&city=&veg=` | Browse available | JWT |
| `GET /api/listings?mine=1` | My listings | JWT |
| `POST /api/listings` | Create listing | donor / admin |
| `PUT /api/listings/:id` | Edit listing | donor / admin |
| `DELETE /api/listings/:id` | Delete listing | donor / admin |
| `PATCH /api/listings/:id/status` | Lifecycle change | donor / admin |
| `POST /api/claims` | Claim a listing | ngo |
| `GET /api/claims` | My claims (role-aware) | JWT |
| `PATCH /api/claims/:id/pickup` | Pick up `{otp}` | rider |
| `PATCH /api/claims/:id/deliver` | Mark delivered | rider |
| `DELETE /api/claims/:id` | Cancel claim | JWT |
| `GET /api/notify` | Notifications | JWT |
| `POST /api/notify` | Create notification | JWT |

Send the token as `Authorization: Bearer <jwt>`.

### Service ports

| Service | Port |
|---|---|
| frontend | 5173 (host) |
| api-gateway | 8085 (host) · 8080 (in-cluster) |
| auth-service | 5001 |
| listing-service | 5002 |
| claim-service | 5003 |
| notify-service | 5004 |
| mongo | 27017 |
| mongo-express | 8081 (**Compose only** — not exposed in the cluster) |

Per-service health from inside the cluster:
```powershell
kubectl exec deploy/api-gateway -- wget -qO- http://auth-service:5001/health
```

---

## 6. Seed accounts

| Role | Email | Password |
|---|---|---|
| Donor | `donor@test.com` | `donor123` |
| NGO | `ngo@test.com` | `ngo123` |
| Rider | `rider@test.com` | `rider123` |
| Admin | `admin@test.com` | `admin123` |

Load demo listings/claims with `node tests/seed.js` (Compose path). The cluster starts empty — create data through the UI to exercise the full flow.

---

## 7. Function check — run in this order

| # | Check as | Steps | Expected |
|---|---|---|---|
| 1 | — | Landing: scroll all 15 sections, click the nav anchors | Smooth scroll to `#how #features #usecases #faq` |
| 2 | — | Register a new **Donor** | Success → donor dashboard |
| 3 | Donor | **Post** a listing: name, qty, city, veg on/off, expiry **≥ 10 minutes out** | Card appears as **Posted** (green) |
| 4 | NGO | **Browse** → find the post → **Claim** | Status **Claimed** (blue); donor sees it under **Claims** |
| 5 | Rider | **Claims** → **Pick up** → enter the OTP shown to the NGO | Status **Picked Up** (orange) |
| 6 | Rider | **Deliver** | Status **Delivered** (green); claim closes |
| 7 | NGO / Donor | Send a notification | Appears under **Alerts** |
| 8 | Admin | **Users** tab | Lists every registered user with roles |
| 9 | NGO | Try to **Create** a listing | Blocked — `403` (RBAC) |
| 10 | Anyone | Claim the same listing twice | Blocked — `409` |
| 11 | NGO | Enter a wrong OTP | Blocked — `400` |
| 12 | Donor | Create a listing expiring in ~2 min, wait | Auto **Expired** |
| 13 | — | Login as `admin@test.com` / `admin123` | Admin dashboard loads |

### Status colours

| Status | Colour |
|---|---|
| Posted | `#176B45` on `#E3F3E8` |
| Claimed | `#2563EB` on `#E4EDFD` |
| Pending OTP | `#B45309` on `#FEF3C7` |
| Picked Up | `#EA580C` on `#FFEDD5` |
| Delivered | `#15803D` on `#DCFCE7` |
| Expired | `#B91C1C` on `#FEE2E2` |
| Cancelled | `#4B5563` on `#F3F4F6` |

---

## 8. Automated verification

```bash
node tests/smoke.js
```
Runs against `http://localhost:8085` by default. Override with:
```bash
API=http://localhost:8085 node tests/smoke.js
```
Output ends with **`SMOKE PASS`** on success. It covers register/login, listing create + search, claim, double-claim rejection, wrong OTP, pickup and delivery.

Manual probes:
- Git Bash: `curl http://localhost:8085/health`
- PowerShell: `curl.exe http://localhost:8085/health`
- With auth: `curl.exe http://localhost:8085/api/listings?available=1 -H "Authorization: Bearer <token>"`

---

## 9. Quick reference — which shell for which task

| Task | Shell | Command |
|---|---|---|
| Deploy / teardown / port-forward | Either | `.\scripts\k8s-deploy.ps1` (Git Bash: wrap in `powershell.exe -ExecutionPolicy Bypass -File`) |
| Health check only (no rebuild) | Either | `.\scripts\k8s-deploy.ps1 -VerifyOnly` |
| `npm install` / `npm run dev` | **Git Bash** | `npm install` |
| `docker compose up/down/ps/logs` | Either | `docker compose up -d --build` |
| `kubectl get/describe/logs/exec` | Either | `kubectl get pods` |
| `node tests/smoke.js` / `tests/seed.js` | Either | `node tests/smoke.js` |
| `curl` API checks | Git Bash: `curl` · PS: `curl.exe` | `curl http://localhost:8085/health` |
| `git add/commit/push` | Either | `git push origin main` |

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `AuthorizationManager check failed` on `npm` | Running npm in PowerShell 5.1. Use Git Bash, or `npm.cmd`. |
| Ports `5173` / `8085` already in use | Compose and the cluster are both up. Stop one: `docker compose down`, or close the port-forward windows. |
| Port-forward windows closed, app unreachable | Restart them: `.\scripts\k8s-deploy.ps1 -Expose` |
| kind cluster missing | Recreate: `.\scripts\k8s-deploy.ps1` (creates `kind-annbachao`). |
| Kubernetes tab in Docker Desktop shows "no clusters" | Expected. That tab is Docker Desktop's **own** built-in Kubernetes (separate feature, currently off). kind clusters appear in the **Containers** tab as `annbachao-control-plane`, and are driven via `kubectl`. |
| Frontend loads but API calls fail | `VITE_API_URL` must be reachable **from your browser**. For port-forward use `http://localhost:8085`; rebuild the image with `--build-arg VITE_API_URL=...` if it differs. |
| Pods CrashLoopBackOff | `kubectl logs <pod>`. Mongo historically needed longer probe timeouts (`mongosh` ping exceeds the 1s default) and a `Recreate` deploy strategy because its PVC is RWO — both are already set in `k8s/all.yaml`. |
| `kind load` prints `not yet present ... loading...` | **Normal progress, not an error** — kind writes it to stderr, which PowerShell makes look alarming. The script now swallows it on success and only surfaces it in red when the command actually fails. |
| `kind exec` → `unknown command "exec"` | kind v0.33 has no `exec` subcommand here. Use `docker exec annbachao-control-plane crictl images` to inspect the node. |

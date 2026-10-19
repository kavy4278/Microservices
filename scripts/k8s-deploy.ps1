# AnnBachao — Kubernetes: build, deploy, expose, verify (kind)
# Usage:
#   .\scripts\k8s-deploy.ps1            # create cluster if needed, build, load, deploy, wait
#   .\scripts\k8s-deploy.ps1 -Expose    # + open windows with port-forwards (UI :5173, API :8085)
#   .\scripts\k8s-deploy.ps1 -TearDown  # delete the cluster
param(
  [string]$Cluster = "annbachao",
  [switch]$Expose,
  [switch]$TearDown
)

# IMPORTANT: kind / docker / kubectl print informational text on stderr.
# PowerShell turns *redirected* stderr into error records, so
# $ErrorActionPreference = 'Stop' would abort the run on harmless messages
# (e.g. kind's "loading..."). Keep 'Continue' and fail fast on real
# failures by checking $LASTEXITCODE after each native command.
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# kind.exe lives in ~/.local/bin; make sure it is on PATH for this session
$kindDir = Join-Path $env:USERPROFILE ".local\bin"
if ($env:PATH -notlike "*$kindDir*") { $env:PATH = "$env:PATH;$kindDir" }

function Invoke-Checked {
  param([string]$Label, [string]$Exe, [string[]]$ArgumentList)
  Write-Host ">> $Label" -ForegroundColor DarkCyan
  & $Exe @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed: '$Exe' exited with code $LASTEXITCODE"
  }
}

if ($TearDown) {
  Invoke-Checked "deleting cluster '$Cluster'" kind @('delete', 'cluster', '--name', $Cluster)
  Write-Host "cluster '$Cluster' deleted" -ForegroundColor Yellow
  return
}

# 1. cluster — creates context kind-<Cluster> if it does not exist yet
$ctx = "kind-$Cluster"
$contexts = kubectl config get-contexts -o name
$hasCtx = $null -ne ($contexts | Where-Object { $_ -eq $ctx })
if (-not $hasCtx) {
  Write-Host "creating kind cluster '$Cluster'..." -ForegroundColor Cyan
  Invoke-Checked "create cluster" kind @('create', 'cluster', '--name', $Cluster, '--wait', '300s')
} else {
  Invoke-Checked "use context $ctx" kubectl @('config', 'use-context', $ctx)
}
Write-Host "context: $(kubectl config current-context)" -ForegroundColor Green

# 2. build images (gateway exposed on host :8085 via port-forward; frontend baked to match)
Write-Host "building images..." -ForegroundColor Cyan
Invoke-Checked "build auth-service"    docker @('build', '-q', '-t', 'annbachao/auth-service:latest', 'services/auth-service')
Invoke-Checked "build listing-service" docker @('build', '-q', '-t', 'annbachao/listing-service:latest', 'services/listing-service')
Invoke-Checked "build claim-service"   docker @('build', '-q', '-t', 'annbachao/claim-service:latest', 'services/claim-service')
Invoke-Checked "build notify-service"  docker @('build', '-q', '-t', 'annbachao/notify-service:latest', 'services/notify-service')
Invoke-Checked "build api-gateway"     docker @('build', '-q', '-t', 'annbachao/api-gateway:latest', 'services/api-gateway')
Invoke-Checked "build frontend"        docker @('build', '-q', '--build-arg', 'VITE_API_URL=http://localhost:8085', '-t', 'annbachao/frontend:latest', 'frontend')

# 3. load into the node (kind nodes use containerd; images are NOT shared with Docker automatically)
Write-Host "loading images into node..." -ForegroundColor Cyan
foreach ($img in @('auth-service', 'listing-service', 'claim-service', 'notify-service', 'api-gateway', 'frontend')) {
  Invoke-Checked "load $img" kind @('load', 'docker-image', "annbachao/${img}:latest", '--name', $Cluster)
}

# 4. deploy + wait (mongo uses Recreate strategy: an RWO PVC cannot be shared)
Write-Host "applying manifests..." -ForegroundColor Cyan
Invoke-Checked "kubectl apply" kubectl @('apply', '-f', 'k8s/all.yaml')
Invoke-Checked "wait for pods" kubectl @('wait', '--for=condition=Ready', 'pod', '--all', '--timeout=420s')
Write-Host "`nworkloads:" -ForegroundColor Cyan
kubectl get "pods,svc,pvc,ingress"

if ($Expose) {
  Write-Host "`nopening port-forward windows..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList '-NoExit', '-Command',
    "kubectl config use-context $ctx; kubectl port-forward svc/frontend 5173:80 --address 127.0.0.1"
  Start-Process powershell -ArgumentList '-NoExit', '-Command',
    "kubectl config use-context $ctx; kubectl port-forward svc/api-gateway 8085:8080 --address 127.0.0.1"
  Start-Sleep -Seconds 7
  Write-Host "UI:  http://localhost:5173" -ForegroundColor Green
  Write-Host "API: http://localhost:8085/health" -ForegroundColor Green
  Write-Host "verify: node tests/smoke.js" -ForegroundColor Green
}

Write-Host "`nTear down with: .\scripts\k8s-deploy.ps1 -TearDown" -ForegroundColor Yellow

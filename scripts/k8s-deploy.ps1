# AnnBachao — Kubernetes: build, deploy, expose, verify (kind)
# Usage:
#   .\scripts\k8s-deploy.ps1            # create cluster if needed, build, load, deploy, wait, verify
#   .\scripts\k8s-deploy.ps1 -Expose    # + port-forwards (UI :5173, API :8085) + smoke test
#   .\scripts\k8s-deploy.ps1 -TearDown  # delete the cluster
#   .\scripts\k8s-deploy.ps1 -VerifyOnly  # re-run only the verification block
param(
  [string]$Cluster = "annbachao",
  [switch]$Expose,
  [switch]$TearDown,
  [switch]$VerifyOnly
)

# kind / docker / kubectl write informational text on stderr. PowerShell renders that
# like an error, so keep the preference at 'Continue' and decide ourselves what to show:
# Invoke-Checked captures stdout+stderr separately, hides progress noise on success,
# and only prints it (in red) when the command actually failed.
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$kindDir = Join-Path $env:USERPROFILE ".local\bin"
if ($env:PATH -notlike "*$kindDir*") { $env:PATH = "$env:PATH;$kindDir" }

$Services = @('auth-service', 'listing-service', 'claim-service', 'notify-service', 'api-gateway', 'frontend')
$Node     = "$Cluster-control-plane"
$Ctx      = "kind-$Cluster"

function Invoke-Checked {
  param(
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][string]$Exe,
    [string[]]$ArgumentList = @(),
    [switch]$ShowOutput
  )
  Write-Host ">> $Label" -ForegroundColor DarkCyan
  $errFile = [System.IO.Path]::GetTempFileName()
  try {
    $stdout = & $Exe @ArgumentList 2> $errFile
    $code   = $LASTEXITCODE
    $stderr = ''
    if (Test-Path $errFile) { $stderr = Get-Content $errFile -Raw }
  } finally {
    Remove-Item $errFile -ErrorAction SilentlyContinue
  }
  if ($code -ne 0) {
    if ($stdout) { $stdout | ForEach-Object { Write-Host "   $_" -ForegroundColor Red } }
    if ($stderr) { ($stderr -split "`r?`n") | Where-Object { $_ } | ForEach-Object { Write-Host "   $_" -ForegroundColor Red } }
    throw "$Label failed: '$Exe' exited with code $code"
  }
  if ($ShowOutput -and $stdout) {
    $stdout | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
  } else {
    Write-Host "   ok" -ForegroundColor DarkGray
  }
}

# A kubectl forward can still hold its TCP port after the pod it was pinned to was replaced,
# so a bare socket test is not proof of health. Probe the real HTTP endpoint instead.
function Test-Url {
  param([string]$Url, [int]$Attempts = 1, [int]$TimeoutSec = 5)
  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch {
      # any HTTP response (even 4xx/5xx) proves the forward itself is alive
      if ($_.Exception.Response) { return $true }
    }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function Get-ListenerPids {
  param([int]$Port)
  @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique)
}

# Kills only kubectl forwards. Anything else holding the port is left alone so we never
# terminate an unrelated program.
function Stop-StaleForward {
  param([int]$Port)
  $killed = $false
  foreach ($p in (Get-ListenerPids $Port)) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -match 'kubectl') { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; $killed = $true }
  }
  foreach ($i in 1..14) { if ((Get-ListenerPids $Port).Count -eq 0) { break }; Start-Sleep -Milliseconds 150 }
  return $killed
}

if ($TearDown) {
  Invoke-Checked "deleting cluster '$Cluster'" kind @('delete', 'cluster', '--name', $Cluster)
  Write-Host "cluster '$Cluster' deleted" -ForegroundColor Yellow
  return
}

if (-not $VerifyOnly) {
  # 1. cluster — creates context kind-<Cluster> if it does not exist yet
  $contexts = kubectl config get-contexts -o name
  $hasCtx = $null -ne ($contexts | Where-Object { $_ -eq $Ctx })
  if (-not $hasCtx) {
    Write-Host "creating kind cluster '$Cluster'..." -ForegroundColor Cyan
    Invoke-Checked "create cluster" kind @('create', 'cluster', '--name', $Cluster, '--wait', '300s')
  } else {
    Invoke-Checked "use context $Ctx" kubectl @('config', 'use-context', $Ctx)
  }
  Write-Host "context: $(kubectl config current-context)" -ForegroundColor Green

  # 2. build images (gateway exposed on host :8085 via port-forward; frontend baked to match)
  Write-Host "`nbuilding images..." -ForegroundColor Cyan
  Invoke-Checked "build auth-service"    docker @('build', '-q', '-t', 'annbachao/auth-service:latest', 'services/auth-service')
  Invoke-Checked "build listing-service" docker @('build', '-q', '-t', 'annbachao/listing-service:latest', 'services/listing-service')
  Invoke-Checked "build claim-service"   docker @('build', '-q', '-t', 'annbachao/claim-service:latest', 'services/claim-service')
  Invoke-Checked "build notify-service"  docker @('build', '-q', '-t', 'annbachao/notify-service:latest', 'services/notify-service')
  Invoke-Checked "build api-gateway"     docker @('build', '-q', '-t', 'annbachao/api-gateway:latest', 'services/api-gateway')
  Invoke-Checked "build frontend"        docker @('build', '-q', '--build-arg', 'VITE_API_URL=http://localhost:8085', '-t', 'annbachao/frontend:latest', 'frontend')

  # 3. load into the node (kind nodes use containerd; images are NOT shared with Docker automatically).
  #    kind prints "not yet present ... loading..." on stderr — that is normal progress, not an error.
  Write-Host "`nloading images into node..." -ForegroundColor Cyan
  foreach ($img in $Services) {
    Invoke-Checked "load $img" kind @('load', 'docker-image', "annbachao/${img}:latest", '--name', $Cluster)
  }

  # 4. deploy + restart (mongo uses Recreate strategy: an RWO PVC cannot be shared).
  #    IMPORTANT: kind load only replaces the image *behind* a tag. Kubernetes does not
  #    restart pods when that tag changes, so a rebuilt image would silently never run —
  #    an explicit rollout is required to pick up new code.
  Write-Host "`napplying manifests..." -ForegroundColor Cyan
  Invoke-Checked "kubectl apply" kubectl @('apply', '-f', 'k8s/all.yaml') -ShowOutput

  Write-Host "`nrestarting workloads to pick up freshly loaded images..." -ForegroundColor Cyan
  foreach ($d in $Services) {
    Invoke-Checked "restart $d" kubectl @('rollout', 'restart', "deploy/$d")
  }

  Write-Host "`nwaiting for rollouts..." -ForegroundColor Cyan
  foreach ($d in ($Services + @('mongo'))) {
    Invoke-Checked "rollout $d" kubectl @('rollout', 'status', "deploy/$d", '--timeout=300s') -ShowOutput
  }

  # `rollout status` returns as soon as the new ReplicaSet is up, while the superseded pods are
  # still Terminating. A port-forward pinned to one of those would pass the health probe and then
  # die seconds later, failing the smoke test mid-run — so drain them before exposing.
  Write-Host "`nwaiting for old pods to finish terminating..." -ForegroundColor Cyan
  foreach ($i in 1..60) {
    $term = @(kubectl get pods --no-headers 2>$null | Where-Object { $_ -match 'Terminating' })
    if ($term.Count -eq 0) { break }
    Start-Sleep -Seconds 1
  }
  $left = @(kubectl get pods --no-headers 2>$null | Where-Object { $_ -match 'Terminating' })
  if ($left.Count -eq 0) { Write-Host "   ok" -ForegroundColor DarkGray }
  else { Write-Host "   $($left.Count) pod(s) still terminating" -ForegroundColor Yellow }
}

# 5. verification — prove everything is present and running
Write-Host "`n=== verification ===" -ForegroundColor Cyan

$fail = @()

# 5a. all images present on the node?
$nodeImgs = docker exec $Node crictl images 2>$null
$present = 0
foreach ($img in $Services) {
  if ($nodeImgs -match "annbachao/$img") { $present++ } else { $fail += "image missing on node: $img" }
}
if ($present -eq $Services.Count) {
  Write-Host ("images on node:      {0}/{1} present" -f $present, $Services.Count) -ForegroundColor Green
} else {
  Write-Host ("images on node:      {0}/{1} present" -f $present, $Services.Count) -ForegroundColor Red
}

# 5b. pods ready?  Poll until every non-terminating pod is 1/1 Running (up to ~60s).
#     `rollout status` has already proven the new ReplicaSet is serving; this just waits
#     for the superseded/starting pods to settle so verification isn't a race.
$readyAll = $false
$pods = @()
foreach ($i in 1..60) {
  $pods = @(kubectl get pods --no-headers 2>$null | Where-Object { $_.Trim() -ne '' -and $_ -notmatch 'Terminating' })
  $ready = @($pods | Where-Object { $_ -match '^\S+\s+1/1\s+Running' })
  if ($ready.Count -eq $pods.Count -and $pods.Count -gt 0) { $readyAll = $true; break }
  Start-Sleep -Seconds 1
}
$total = @($pods).Count
if ($readyAll) {
  Write-Host ("pods ready:          {0}/{1} Running 1/1" -f $ready.Count, $total) -ForegroundColor Green
} else {
  Write-Host ("pods ready:          {0}/{1} Running 1/1" -f $ready.Count, $total) -ForegroundColor Red
  $fail += "pods not ready"
  kubectl get pods
}

# 5c. every workload uses the image we just built?
$k8sImages = kubectl get pods -o custom-columns="NAME:.metadata.name,IMAGE:.spec.containers[*].image" --no-headers 2>$null
$badImg = @($k8sImages | Where-Object { $_ -match 'annbachao/' -and $_ -notmatch 'annbachao/.*:latest' })
if ($badImg.Count -eq 0) { Write-Host "pod images:          all pinned to annbachao/*:latest" -ForegroundColor Green }
else { $fail += "pods using unexpected images"; $badImg | ForEach-Object { Write-Host "   $_" -ForegroundColor Red } }

# 5d. storage
$pvc = kubectl get pvc mongo-data -o jsonpath='{.status.phase}' 2>$null
if ($pvc -eq 'Bound') { Write-Host "storage:             PVC mongo-data Bound" -ForegroundColor Green }
else { $fail += "PVC not Bound (got '$pvc')"; Write-Host "storage:             PVC mongo-data = $pvc" -ForegroundColor Red }

# 5e. workload list
Write-Host "`nworkloads:" -ForegroundColor Cyan
kubectl get "pods,svc,pvc,ingress"

if ($Expose) {
  Write-Host "`nsetting up port-forwards..." -ForegroundColor Cyan
  $forwards = @(
    @{ Port = 5173; Svc = 'frontend';    Target = '80';   Probe = 'http://127.0.0.1:5173/'            },
    @{ Port = 8085; Svc = 'api-gateway'; Target = '8080'; Probe = 'http://127.0.0.1:8085/health'     }
  )
  foreach ($f in $forwards) {
    # keep an existing forward only if it is actually proxying traffic
    if (Test-Url $f.Probe) {
      Write-Host "   port $($f.Port) : healthy - keeping the existing forward" -ForegroundColor DarkGray
      continue
    }
    if ((Get-ListenerPids $f.Port).Count -gt 0) {
      Write-Host "   port $($f.Port) : stale forward (bound but not serving) - recycling" -ForegroundColor Yellow
      Stop-StaleForward $f.Port
      Start-Sleep -Milliseconds 400
    }
    Start-Process powershell -ArgumentList '-NoExit', '-Command',
      "kubectl config use-context $Ctx; kubectl port-forward svc/$($f.Svc) $($f.Port):$($f.Target) --address 127.0.0.1"
    if (Test-Url $f.Probe -Attempts 30 -TimeoutSec 3) {
      Write-Host "   port $($f.Port) : forward started and serving svc/$($f.Svc)" -ForegroundColor Green
    } else {
      Write-Host "   port $($f.Port) : forward did not become reachable" -ForegroundColor Red
      $fail += "port $($f.Port) not reachable"
    }
  }

  # 5f. confirm each port serves real HTTP
  foreach ($f in $forwards) {
    if (Test-Url $f.Probe) { Write-Host "port $($f.Port) :            SERVING ($($f.Svc))" -ForegroundColor Green }
    else { Write-Host "port $($f.Port) :            NOT reachable" -ForegroundColor Red; $fail += "port $($f.Port) not reachable" }
  }

  # 5g. seed the demo accounts README / projectrun.md advertise, then sign in as each one
  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "`nseeding demo accounts..." -ForegroundColor Cyan
    $seed = node tests/seed.js 2>&1
    $seedCode = $LASTEXITCODE
    $seed | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
    if ($seedCode -eq 0) { Write-Host "   demo accounts ready" -ForegroundColor Green }
    else { $fail += 'demo account seeding failed'; Write-Host "   SEED FAILED" -ForegroundColor Red }
  }

  # 5h. end-to-end proof
  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "`nend-to-end smoke test:" -ForegroundColor Cyan
    $smoke = node tests/smoke.js 2>&1
    $code = $LASTEXITCODE
    $smoke | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
    if ($code -eq 0) {
      Write-Host "   end-to-end: OK" -ForegroundColor Green
    } else {
      $fail += "smoke test failed"
      Write-Host "   end-to-end: FAILED" -ForegroundColor Red
    }
  }
}

Write-Host ""
if ($fail.Count -eq 0) {
  Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
  if ($Expose) {
    Write-Host "UI:  http://localhost:5173" -ForegroundColor Green
    Write-Host "API: http://localhost:8085/health" -ForegroundColor Green
  }
} else {
  Write-Host "CHECKS FAILED:" -ForegroundColor Red
  $fail | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host "`nTear down with: .\scripts\k8s-deploy.ps1 -TearDown" -ForegroundColor Yellow

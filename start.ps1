# npm start: prepares a fresh clone, starts MySQL, applies the database
# migrations and the demo user, then opens the backend and, once the API answers, the frontend,
# each in its own terminal tab, giving the focus back to the window where
# npm start was typed.
# Failures are detected through $LASTEXITCODE: with ErrorActionPreference=Stop,
# Windows PowerShell 5.1 aborts on any stderr line (even Docker warnings).
$root = $PSScriptRoot
$healthUrl = 'http://localhost:3000/api/health/ready'
$frontendUrl = 'http://localhost:4200'

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class StartWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
}
'@
$origin = [StartWindow]::GetForegroundWindow()
$useWindowsTerminal = [bool](Get-Command wt -ErrorAction SilentlyContinue)

function Step([string]$message) { Write-Host "`n> $message" -ForegroundColor Cyan }
function Fail([string]$message) { Write-Host "`n$message" -ForegroundColor Red; exit 1 }

function Copy-EnvExample([string]$dir) {
  $envFile = Join-Path $dir '.env'
  if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $dir '.env.example') $envFile -ErrorAction Stop
    Write-Host "  criado $(Resolve-Path $envFile -Relative) a partir do .env.example"
  }
}

function Install-Dependencies([string]$dir) {
  if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
    Write-Host "  instalando dependências em $(Split-Path $dir -Leaf)/ ..."
    npm install --prefix $dir --no-audit --no-fund
    if ($LASTEXITCODE) { Fail "npm install falhou em $dir" }
  }
}

# Docker Desktop sometimes fails to load its CLI plugins ("unknown flag"),
# so a failed compose call gets two more tries.
function Invoke-Compose {
  for ($try = 1; $try -le 3; $try++) {
    docker compose --project-directory $root @args
    if (-not $LASTEXITCODE) { return }
    Start-Sleep -Seconds 2
  }
}

function Test-Url([string]$url) {
  try { (Invoke-WebRequest $url -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch { $false }
}

function Open-Tab([string]$title, [string]$dir, [string]$command) {
  if ($useWindowsTerminal) {
    wt -w 0 new-tab --title $title -d $dir powershell -NoExit -Command $command
  } else {
    Start-Process powershell -WorkingDirectory $dir -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='$title'; $command"
  }
}

# Opens $command in a new tab unless $url already answers, then waits for $url.
function Start-App([string]$name, [string]$dir, [string]$command, [string]$url, [int]$timeoutSeconds) {
  if (Test-Url $url) {
    Write-Host "  o $name já está rodando em $url"
    return
  }
  Open-Tab $name (Join-Path $root $dir) $command
  Restore-Focus
  $timer = [Diagnostics.Stopwatch]::StartNew()
  while (-not (Test-Url $url)) {
    if ($timer.Elapsed.TotalSeconds -gt $timeoutSeconds) {
      Fail "O $name não respondeu em $url após $timeoutSeconds s. Veja o erro na aba $name."
    }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "  $name respondendo em $url ($([int]$timer.Elapsed.TotalSeconds) s)"
}

# Gives the focus back to the window where npm start was typed.
function Restore-Focus {
  # No window to go back to (no desktop), or npm start ran inside a Windows
  # Terminal tab: there the new tab stays selected, going back needs its index.
  if ($origin -eq [IntPtr]::Zero -or $env:WT_SESSION) { return }
  # The new window takes the focus once it is up (up to 5 s).
  for ($i = 0; $i -lt 50 -and [StartWindow]::GetForegroundWindow() -eq $origin; $i++) { Start-Sleep -Milliseconds 100 }
  Start-Sleep -Milliseconds 300
  # Windows only lets the foreground app hand the focus over; a tap of Alt
  # lifts that lock (otherwise the taskbar button just flashes).
  [StartWindow]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
  [StartWindow]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  [void][StartWindow]::SetForegroundWindow($origin)
}

Step 'Preparando o ambiente'
Copy-EnvExample $root
Copy-EnvExample (Join-Path $root 'backend')
Install-Dependencies $root
Install-Dependencies (Join-Path $root 'backend')
Install-Dependencies (Join-Path $root 'frontend')

Step 'Subindo o MySQL (Docker)'
docker info *> $null
if ($LASTEXITCODE) { Fail 'O Docker não está respondendo. Abra o Docker Desktop e rode npm start de novo.' }
# Only the databases: in development the API and the frontend run from source, with hot reload.
Invoke-Compose up -d --wait mysql mongo
if ($LASTEXITCODE) { Fail 'O MySQL não ficou saudável. Veja os logs com: docker compose logs mysql' }

Step 'Aplicando as migrations do banco'
npm run migrate --silent --prefix (Join-Path $root 'backend')
if ($LASTEXITCODE) { Fail 'As migrations falharam. Veja o erro acima.' }

Step 'Preparando o usuário de demonstração'
npm run seed --silent --prefix (Join-Path $root 'backend')
if ($LASTEXITCODE) { Fail 'O seed falhou. Veja o erro acima.' }

Step 'Iniciando o backend'
Start-App 'Backend' 'backend' 'npm run dev' $healthUrl 60

# Only after the API answers, so the app never opens against a backend that is still starting.
Step 'Iniciando o frontend'
Start-App 'Frontend' 'frontend' 'npm start' $frontendUrl 120

Write-Host "`nPronto. Abra $frontendUrl no navegador." -ForegroundColor Green

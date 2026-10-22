# npm start: prepares a fresh clone, starts MySQL, opens the backend in its own
# terminal tab, waits until the API answers, then gives the focus back to the
# window where npm start was typed.
# Failures are detected through $LASTEXITCODE: with ErrorActionPreference=Stop,
# Windows PowerShell 5.1 aborts on any stderr line (even Docker warnings).
$root = $PSScriptRoot
$healthUrl = 'http://localhost:3000/api/health'

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

function Test-Health {
  try { (Invoke-WebRequest $healthUrl -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch { $false }
}

function Open-Tab([string]$title, [string]$dir, [string]$command) {
  if ($useWindowsTerminal) {
    wt -w 0 new-tab --title $title -d $dir powershell -NoExit -Command $command
  } else {
    Start-Process powershell -WorkingDirectory $dir -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='$title'; $command"
  }
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
Install-Dependencies (Join-Path $root 'backend')

Step 'Subindo o MySQL (Docker)'
docker info *> $null
if ($LASTEXITCODE) { Fail 'O Docker não está respondendo. Abra o Docker Desktop e rode npm start de novo.' }
Invoke-Compose up -d --wait
if ($LASTEXITCODE) { Fail 'O MySQL não ficou saudável. Veja os logs com: docker compose logs mysql' }

Step 'Iniciando o backend'
if (Test-Health) {
  Write-Host '  o backend já está rodando em http://localhost:3000'
} else {
  Open-Tab 'Backend' (Join-Path $root 'backend') 'npm run dev'
  Restore-Focus
  $timer = [Diagnostics.Stopwatch]::StartNew()
  while (-not (Test-Health)) {
    if ($timer.Elapsed.TotalSeconds -gt 60) {
      Fail "O backend não respondeu em $healthUrl após 60 s. Veja o erro na aba Backend."
    }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "  backend respondendo em $healthUrl ($([int]$timer.Elapsed.TotalSeconds) s)"
}

Write-Host "`nPronto." -ForegroundColor Green

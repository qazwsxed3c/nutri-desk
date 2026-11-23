param(
  [int]$Port = 8788,
  [string]$Bind = '127.0.0.1',
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Resolve-Command($name) {
  $command = Get-Command $name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $null
}

function Test-Runs($exe, [string[]]$prefix = @(), [string]$pattern = '') {
  if (-not $exe -or -not (Test-Path -LiteralPath $exe)) { return $false }
  try {
    $output = & $exe @prefix --version 2>&1
    if ($LASTEXITCODE -ne 0) { return $false }
    if ($pattern -and ("$output" -notmatch $pattern)) { return $false }
    return $true
  } catch {
    return $false
  }
}

$node = Resolve-Command 'node'
if (-not (Test-Runs $node @() '^v\d+')) {
  $bundledNode = Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
  if (Test-Runs $bundledNode @() '^v\d+') { $node = $bundledNode } else { $node = $null }
}

$python = Resolve-Command 'python'
$pythonArgs = @()
if (-not (Test-Runs $python @() '^Python 3')) {
  $py = Resolve-Command 'py'
  if (Test-Runs $py @('-3') '^Python 3') {
    $python = $py
    $pythonArgs = @('-3')
  } else {
    $bundledPython = Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
    if (Test-Runs $bundledPython @() '^Python 3') { $python = $bundledPython } else { $python = $null }
  }
}

$displayHost = if ($Bind -eq '0.0.0.0') { '<IP-компьютера>' } else { $Bind }
$url = "http://${displayHost}:$Port/"

if (-not $node -and -not $python) {
  throw 'Не найден ни Node.js, ни Python. Установите Node.js (nodejs.org) или Python (python.org), либо запустите любой статический сервер в этой папке.'
}

Write-Host ''
Write-Host '  NutriDesk — кабинет нутрициолога' -ForegroundColor Green
Write-Host "  Адрес: $url"
Write-Host '  Остановка: Ctrl+C'
Write-Host ''

if (-not $NoBrowser) { Start-Process $url }

if ($node) {
  & $node (Join-Path $root 'tools\serve.mjs') --port $Port --host $Bind
} else {
  & $python @pythonArgs -m http.server $Port --bind $Bind
}

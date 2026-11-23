@echo off
setlocal
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8788"

set "NOBROWSER="
if defined NUTRI_NO_BROWSER set "NOBROWSER=-NoBrowser"

set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"

%PS% -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port %PORT% %NOBROWSER%
if errorlevel 1 (
  echo.
  echo Failed to start. See the error above.
  echo Install Node.js from nodejs.org or Python from python.org, then run start.cmd again.
  pause
)
endlocal

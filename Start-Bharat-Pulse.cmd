@echo off
rem Bharat Pulse - one-click launcher for Windows.
rem Needs Node.js 22.12+ (https://nodejs.org). Double-click to run.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org and run this again.
  start "" https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies - first run only...
  call npm.cmd install --no-fund --no-audit || goto :fail
)

if not exist dist\server\server.js (
  echo Building...
  call npm.cmd run build || goto :fail
)

echo Starting Bharat Pulse on http://127.0.0.1:3000  ^(close this window to stop^)
start "" http://127.0.0.1:3000
node serve.mjs
goto :eof

:fail
echo Something went wrong. See the messages above.
pause
exit /b 1

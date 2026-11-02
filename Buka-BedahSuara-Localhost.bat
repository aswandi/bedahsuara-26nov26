@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js tidak ditemukan. Pasang Node.js terlebih dahulu.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm tidak ditemukan. Pastikan instalasi Node.js menyertakan npm.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependensi aplikasi belum terpasang. Menjalankan npm install...
  call npm install
  if errorlevel 1 (
    echo Instalasi dependensi gagal.
    pause
    exit /b 1
  )
)

netstat -ano | findstr /R /C:":3002 .*LISTENING" >nul
if errorlevel 1 (
  echo Menjalankan BEDAH SUARA di http://localhost:3002/ dan http://100.102.175.102:3002/
  start "BEDAH SUARA - Server lokal dan Tailscale" /D "%~dp0" cmd /k "node node_modules/nuxt/bin/nuxt.mjs dev --host 0.0.0.0 --port 3002"
  timeout /t 8 /nobreak >nul
) else (
  echo Server pada port 3002 sudah berjalan.
  echo Akses Tailscale: http://100.102.175.102:3002/
)

start "" "http://localhost:3002/"
endlocal

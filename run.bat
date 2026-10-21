@echo off
setlocal
cd /d "%~dp0"
title Chorus Deck [120 FPS GPU Engine]

echo ========================================================
echo   Launching Chorus Deck (Tauri Engine + GPUI 120 FPS)
echo ========================================================
echo.

cargo run -p chorus-deck

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application exited with code %ERRORLEVEL%.
    echo Press any key to close this terminal...
    pause >nul
)

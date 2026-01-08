@echo off
REM Build script for Reachy Mini 3D Card - Windows version

echo Building Reachy Mini 3D Card...

REM Run rollup build
call npx rollup -c

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

echo Build completed successfully!
echo Output: ha-reachy-mini-card.js

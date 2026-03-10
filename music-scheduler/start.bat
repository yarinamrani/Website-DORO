@echo off
title DORO Music Scheduler
echo.
echo Starting DORO Music Scheduler...
echo.
cd /d "%~dp0"
node dist\index.js
pause

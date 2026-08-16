@echo off
title SkillTrack v1.0 Launcher
echo Starting SkillTrack v1.0...

rem Start the Backend
cd /d "E:\git\skilltrack\skilltrack-backend"
start "SkillTrack Backend" cmd /c "start-skilltrack.bat"

rem Start the Frontend
cd /d "E:\git\skilltrack\skilltrack-frontend"
start "SkillTrack Frontend" cmd /k "npm run dev"

echo Backend and Frontend have been launched.
exit

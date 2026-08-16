@echo off
rem ===========================================================
rem  SkillTrack v2.0 — Master Startup Script
rem  Run this script to start the entire backend platform.
rem
rem  Services:
rem    AI Scoring Service   -> http://localhost:18001  (Python FastAPI)
rem    Eureka Server        -> http://localhost:18761
rem    User Service         -> http://localhost:18081
rem    Simulation Service   -> http://localhost:18082
rem    Attempt/Analytics    -> http://localhost:18083
rem    Notification Service -> http://localhost:18084
rem    API Gateway          -> http://localhost:19090  (main entry)
rem
rem  MongoDB must be running on localhost:27017 (skilltrack DB)
rem
rem  After all services are up, start the frontend:
rem    cd D:\SkillTrackv2.0\skilltrack-frontend
rem    npm run dev   ->  http://localhost:15173
rem ===========================================================

set MVN=mvn.cmd
set PYTHON=python.exe
set ROOT=E:\git\skilltrack\skilltrack-backend

echo.
echo  ============================================================
echo   SkillTrack v2.0 — Starting all services
echo  ============================================================
echo.

rem --- Pre-flight: MongoDB ---
echo Checking MongoDB on port 27017...
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue) -eq $true) { Write-Host '  [OK] MongoDB is running' } else { Write-Host '  [ERROR] MongoDB is NOT running! Start it first.' ; exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo Please start MongoDB and run this script again.
    pause & exit /b 1
)

echo.
echo ============================================================
echo  [0/7] AI Scoring Service (port 18001) — Python FastAPI
echo ============================================================
start "SkillTrack: ai-scoring-service" /D "%ROOT%\ai-scoring-service" cmd /k "%PYTHON% -m uvicorn main:app --reload --port 18001"

echo ============================================================
echo  [0b/7] Sandbox Orchestrator (port 18086) — Python FastAPI
echo ============================================================
start "SkillTrack: sandbox-orchestrator" /D "%ROOT%\sandbox-orchestrator" cmd /k "%PYTHON% -m uvicorn main:app --reload --port 18086"

echo.
echo ============================================================
echo  [1/7] eureka-server (port 18761)
echo ============================================================
start "SkillTrack: eureka-server" /D "%ROOT%\eureka-server" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo Waiting for Eureka to be ready (may take ~30s on first run)...
:waitEureka
timeout /t 4 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 18761 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto waitEureka
echo   [18761] eureka-server READY

echo.
echo ============================================================
echo  [2-5/7] Backend microservices (in parallel)
echo ============================================================

start "SkillTrack: user-service" /D "%ROOT%\user-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"
start "SkillTrack: simulation-service" /D "%ROOT%\simulation-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"
start "SkillTrack: attempt-analytics-service" /D "%ROOT%\attempt-analytics-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"
start "SkillTrack: notification-service" /D "%ROOT%\notification-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo Waiting for services (this takes 1-2 min on first run — Maven downloads nothing after first build)...

:wait18081
timeout /t 4 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 18081 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto wait18081
echo   [18081] user-service            READY

:wait18082
timeout /t 2 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 18082 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto wait18082
echo   [18082] simulation-service      READY

:wait18083
timeout /t 2 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 18083 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto wait18083
echo   [18083] attempt-analytics       READY

:wait18084
timeout /t 2 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 18084 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto wait18084
echo   [18084] notification-service    READY

echo.
echo ============================================================
echo  [7/7] api-gateway (port 19090)
echo ============================================================
start "SkillTrack: api-gateway" /D "%ROOT%\api-gateway" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

:wait19090
timeout /t 4 /nobreak >nul
powershell -NoLogo -NoProfile -Command "exit [int](-not (Test-NetConnection localhost -Port 19090 -InformationLevel Quiet -WarningAction SilentlyContinue))"
if %ERRORLEVEL% NEQ 0 goto wait19090
echo   [19090] api-gateway             READY

echo.
echo ============================================================
echo   SkillTrack Backend is FULLY RUNNING!
echo.
echo   API Gateway:     http://localhost:19090
echo   Eureka:          http://localhost:18761
echo   AI Scoring:      http://localhost:18001/health
echo   Swagger (users): http://localhost:18081/swagger-ui/index.html
echo.
echo   MongoDB:         mongodb://localhost:27017/skilltrack
echo   Collections:     users, simulations, attempts, notifications
echo.
echo   To start the frontend:
echo     cd D:\SkillTrackv2.0\skilltrack-frontend
echo     npm run dev    ^(http://localhost:15173^)
echo ============================================================
echo.
pause

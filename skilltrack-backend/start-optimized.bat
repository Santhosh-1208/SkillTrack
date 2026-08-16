@echo off
rem ===========================================================
rem  SkillTrack Optimized Microservices Startup Script
rem  Project root: E:\git\skilltrack
rem ===========================================================

set MVN=mvn.cmd
set ROOT=E:\git\skilltrack\skilltrack-backend

rem -----------------------------------------------------------
rem Start Eureka Server first (required for service registration)

echo [1/6] Starting eureka-server (port 18761)...
start "eureka-server" /D "%ROOT%\eureka-server" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

rem Wait until Eureka is reachable (max ~60 seconds)
:waitEureka
echo Waiting for Eureka on port 18761...
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 18761 -InformationLevel Quiet) -eq $true) { exit 0 } else { exit 1 }"
if %ERRORLEVEL%==0 goto eurekaReady
timeout /t 3 /nobreak >nul
goto waitEureka
:eurekaReady
echo Eureka is up!

rem -----------------------------------------------------------
rem Start remaining services in parallel

echo [2/6] Starting user-service (port 18081)...
start "user-service" /D "%ROOT%\user-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [3/6] Starting simulation-service (port 18082)...
start "simulation-service" /D "%ROOT%\simulation-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [4/6] Starting attempt-analytics-service (port 18083)...
start "attempt-analytics-service" /D "%ROOT%\attempt-analytics-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [5/6] Starting notification-service (port 18084)...
start "notification-service" /D "%ROOT%\notification-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo Waiting up to 90 seconds for all services to start...
:wait18081
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 18081 -InformationLevel Quiet) -eq $true) { exit 0 } else { exit 1 }"
if %ERRORLEVEL%==0 goto up18082
timeout /t 3 /nobreak >nul
goto wait18081
:up18082
echo user-service [18081] ready!

:wait18082
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 18082 -InformationLevel Quiet) -eq $true) { exit 0 } else { exit 1 }"
if %ERRORLEVEL%==0 goto up18083
timeout /t 3 /nobreak >nul
goto wait18082
:up18083
echo simulation-service [18082] ready!

:wait18083
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 18083 -InformationLevel Quiet) -eq $true) { exit 0 } else { exit 1 }"
if %ERRORLEVEL%==0 goto up18084
timeout /t 3 /nobreak >nul
goto wait18083
:up18084
echo attempt-analytics-service [18083] ready!

:wait18084
powershell -NoLogo -NoProfile -Command "if ((Test-NetConnection -ComputerName localhost -Port 18084 -InformationLevel Quiet) -eq $true) { exit 0 } else { exit 1 }"
if %ERRORLEVEL%==0 goto allReady
timeout /t 3 /nobreak >nul
goto wait18084
:allReady
echo notification-service [18084] ready!

rem -----------------------------------------------------------
rem Finally start the API Gateway

echo [6/6] Starting api-gateway (port 8080)...
start "api-gateway" /D "%ROOT%\api-gateway" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo ===========================================================
echo  All services started. API Gateway available at:
echo    http://localhost:8080
echo    Eureka Dashboard: http://localhost:18761
echo ===========================================================
pause

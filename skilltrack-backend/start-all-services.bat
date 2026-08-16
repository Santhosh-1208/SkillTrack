@echo off
echo ============================================================
echo  SkillTrack Microservices Startup Script (With Eureka)
echo  Project root: D:\SkillTrackv2.0
echo ============================================================
echo.
echo Starting all microservices...
echo.

set MVN=C:\Users\abhis\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd
set ROOT=D:\SkillTrackv2.0\skilltrack-backend

echo [1/6] Starting eureka-server       (port 18761)...
start "eureka-server" /D "%ROOT%\eureka-server" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo.
echo Waiting 10 seconds for Eureka Server to initialize...
timeout /t 10 /nobreak

echo [2/6] Starting user-service        (port 18081)...
start "user-service" /D "%ROOT%\user-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [3/6] Starting simulation-service  (port 18082)...
start "simulation-service" /D "%ROOT%\simulation-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [4/6] Starting attempt-analytics-service (port 18083)...
start "attempt-analytics-service" /D "%ROOT%\attempt-analytics-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo [5/6] Starting notification-service (port 18084)...
start "notification-service" /D "%ROOT%\notification-service" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo.
echo Waiting 15 seconds for microservices to register with Eureka...
timeout /t 15 /nobreak

echo [6/6] Starting api-gateway          (port 8080)...
start "api-gateway" /D "%ROOT%\api-gateway" cmd /k "%MVN% org.springframework.boot:spring-boot-maven-plugin:3.3.2:run"

echo.
echo ============================================================
echo  All services starting. API Gateway available at:
echo  http://localhost:8080
echo  Eureka Dashboard: http://localhost:18761
echo ============================================================
pause

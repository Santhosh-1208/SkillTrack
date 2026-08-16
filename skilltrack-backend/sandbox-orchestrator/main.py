import subprocess
import os
import uuid
import json
import urllib.request
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List

app = FastAPI(title="SkillTrack Sandbox Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, sandbox_id: str):
        await websocket.accept()
        if sandbox_id not in self.active_connections:
            self.active_connections[sandbox_id] = []
        self.active_connections[sandbox_id].append(websocket)

    def disconnect(self, websocket: WebSocket, sandbox_id: str):
        if sandbox_id in self.active_connections:
            self.active_connections[sandbox_id].remove(websocket)
            if not self.active_connections[sandbox_id]:
                del self.active_connections[sandbox_id]

    async def broadcast(self, message: str, sandbox_id: str):
        if sandbox_id in self.active_connections:
            for connection in self.active_connections[sandbox_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

class CommandRequest(BaseModel):
    sandbox_id: str
    command: str

# Keep track of active sandboxes and their working directory or container ID
active_sandboxes = {}

@app.post("/sandbox/start")
def start_sandbox(simulation_id: str):
    sandbox_id = f"box-{uuid.uuid4().hex[:8]}"
    
    # Try using Docker if available
    try:
        # Check if docker is running
        subprocess.run(["docker", "--version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Spin up a lightweight alpine/ubuntu container in background
        container_name = f"skilltrack_{sandbox_id}"
        subprocess.run([
            "docker", "run", "-d", "--name", container_name,
            "--memory", "128m", "--cpus", "0.5",
            "ubuntu:latest", "sleep", "3600"
        ], check=True)
        active_sandboxes[sandbox_id] = {"type": "docker", "target": container_name}
        
        # Seed container files based on simulation
        if simulation_id in ["CYBER_INCIDENT_004", "UBUNTU_MGMT_011"]:
            subprocess.run(["docker", "exec", container_name, "mkdir", "-p", "/var/log/nginx"], check=True)
            
            log_content = "unauthorized shell detected"
            if simulation_id == "CYBER_INCIDENT_004":
                try:
                    req = urllib.request.Request("http://localhost:8001/generate/cyber-scenario")
                    with urllib.request.urlopen(req, timeout=3) as response:
                        if response.status == 200:
                            scenario = json.loads(response.read().decode())
                            log_content = scenario.get("log_entry", log_content)
                except Exception as e:
                    print("Could not fetch dynamic scenario:", e)
                    
            subprocess.run(["docker", "exec", container_name, "sh", "-c", f"echo '{log_content}' > /var/log/syslog"], check=True)
            subprocess.run(["docker", "exec", container_name, "sh", "-c", "echo '[error] infinite redirect loop detected' > /var/log/nginx/error.log"], check=True)
            # Spawn a dummy process inside container that looks like nginx for Ubuntu Mgmt
            subprocess.run(["docker", "exec", "-d", container_name, "sh", "-c", "exec -a nginx sleep 3600"], check=True)
            
        elif simulation_id == "EOD_SHUTDOWN_014":
            # Spawn dummy background processes
            subprocess.run(["docker", "exec", "-d", container_name, "sh", "-c", "exec -a redis-dev sleep 3600"], check=True)
            subprocess.run(["docker", "exec", "-d", container_name, "sh", "-c", "exec -a postgres-staging sleep 3600"], check=True)
            subprocess.run(["docker", "exec", "-d", container_name, "sh", "-c", "exec -a data_sync_job_prod sleep 3600"], check=True)
            
        elif simulation_id == "APP_DEPLOY_013":
            # Seed a dummy kubernetes config and dummy deployment log
            subprocess.run(["docker", "exec", container_name, "mkdir", "-p", "/home/deploy"], check=True)
            subprocess.run(["docker", "exec", container_name, "sh", "-c", "echo 'image: app:v2.0.0' > /home/deploy/deployment.yaml"], check=True)
            subprocess.run(["docker", "exec", "-d", container_name, "sh", "-c", "exec -a kubeproxy sleep 3600"], check=True)
            
        elif simulation_id == "GIT_COLLAB_012":
            # Setup a basic git repo with a merge conflict
            subprocess.run(["docker", "exec", container_name, "sh", "-c", "apk add git || apt-get update && apt-get install -y git"], check=True)
            script = '''
git config --global user.email "bot@skilltrack" && git config --global user.name "Bot"
mkdir /project && cd /project && git init
echo "function login() { return true; }" > auth.js && git add auth.js && git commit -m "initial"
git branch feature-login
echo "function login() { return validate(); }" > auth.js && git commit -am "main logic"
git checkout feature-login
echo "function login() { return false; }" > auth.js && git commit -am "feature logic"
'''
            subprocess.run(["docker", "exec", container_name, "sh", "-c", script], check=True)
    except Exception as e:
        # Fallback to local process/directory sandbox
        sandbox_dir = os.path.join(os.getcwd(), "scratch", sandbox_id)
        os.makedirs(sandbox_dir, exist_ok=True)
        active_sandboxes[sandbox_id] = {"type": "local", "target": sandbox_dir}
        
        # Seed files locally
        log_dir = os.path.join(sandbox_dir, "var", "log")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "syslog"), "w") as f:
            f.write("unauthorized shell detected\n")

    return {"sandbox_id": sandbox_id, "status": "running"}

@app.post("/sandbox/exec")
def exec_command(req: CommandRequest):
    box = active_sandboxes.get(req.sandbox_id)
    if not box:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    cmd = req.command.strip()
    
    if box["type"] == "docker":
        container_name = box["target"]
        try:
            res = subprocess.run(
                ["docker", "exec", container_name, "sh", "-c", cmd],
                capture_output=True, text=True, timeout=10
            )
            return {"stdout": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Command timed out after 10 seconds", "exit_code": 124}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": 1}
            
    else:
        # Local command execution
        sandbox_dir = box["target"]
        try:
            # Map simple Linux commands to Windows equivalents or use shell
            # To ensure it runs shell commands safely in their isolated workspace directory:
            res = subprocess.run(
                cmd, shell=True, cwd=sandbox_dir,
                capture_output=True, text=True, timeout=10
            )
            return {"stdout": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Command timed out", "exit_code": 124}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": 1}

@app.post("/sandbox/stop")
def stop_sandbox(sandbox_id: str):
    box = active_sandboxes.pop(sandbox_id, None)
    if not box:
        return {"status": "already_stopped"}

    if box["type"] == "docker":
        container_name = box["target"]
        subprocess.run(["docker", "stop", container_name], stderr=subprocess.DEVNULL)
        subprocess.run(["docker", "rm", container_name], stderr=subprocess.DEVNULL)
    else:
        # Local cleanup
        import shutil
        shutil.rmtree(box["target"], ignore_errors=True)

    return {"status": "stopped"}

@app.websocket("/sandbox/ws/{sandbox_id}")
async def websocket_endpoint(websocket: WebSocket, sandbox_id: str):
    await manager.connect(websocket, sandbox_id)
    box = active_sandboxes.get(sandbox_id)
    if not box:
        await websocket.send_text("Error: Sandbox not found.")
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_text()
            cmd = data.strip()
            # Broadcast the command itself so others see what was typed
            await manager.broadcast(f"$ {cmd}\n", sandbox_id)
            
            if box["type"] == "docker":
                container_name = box["target"]
                try:
                    res = subprocess.run(
                        ["docker", "exec", container_name, "sh", "-c", cmd],
                        capture_output=True, text=True, timeout=10
                    )
                    output = res.stdout if res.stdout else ""
                    if res.stderr:
                        output += f"Error: {res.stderr}"
                    await manager.broadcast(output, sandbox_id)
                except subprocess.TimeoutExpired:
                    await manager.broadcast("Command timed out.\n", sandbox_id)
                except Exception as e:
                    await manager.broadcast(str(e) + "\n", sandbox_id)
            else:
                sandbox_dir = box["target"]
                try:
                    res = subprocess.run(
                        cmd, shell=True, cwd=sandbox_dir,
                        capture_output=True, text=True, timeout=10
                    )
                    output = res.stdout if res.stdout else ""
                    if res.stderr:
                        output += f"Error: {res.stderr}"
                    await manager.broadcast(output, sandbox_id)
                except subprocess.TimeoutExpired:
                    await manager.broadcast("Command timed out.\n", sandbox_id)
                except Exception as e:
                    await manager.broadcast(str(e) + "\n", sandbox_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, sandbox_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8086)

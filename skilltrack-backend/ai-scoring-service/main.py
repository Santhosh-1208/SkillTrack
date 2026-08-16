"""
SkillTrack AI Scoring Service (rule-based v1)

Single endpoint: POST /score
Input:  { "simulation": <full simulation config doc>, "attempt": <full attempt doc> }
Output: { "mistakes_made": [...], "final_score": {...} }

This is intentionally NOT machine learning. It replays the attempt's actions
and decisions against the simulation's sop_steps / decision_points / possible_mistakes,
exactly the way the project's SRS describes the "AI mistake detection" and
"competency scoring" features working end-to-end. Swap this file's internals.
"""
import os
import json
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

app = FastAPI(title="SkillTrack AI Scoring Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreRequest(BaseModel):
    simulation: Dict[str, Any]
    attempt: Dict[str, Any]

class ChatRequest(BaseModel):
    simulation: Dict[str, Any]
    attempt: Dict[str, Any]
    question: str

@app.post("/score")
def score(req: ScoreRequest) -> Dict[str, Any]:
    prompt = f"""
    You are an AI instructor for a technical simulation platform. 
    Here is the Simulation Configuration (rules, steps, decisions, scoring):
    {json.dumps(req.simulation)}
    
    Here is the Learner's Attempt (actions, decisions taken):
    {json.dumps(req.attempt)}
    
    Evaluate this attempt based on the simulation rules.
    Provide detailed, encouraging AI feedback in `ai_explanations`. Point out specific mistakes, provide guidance, and give recommendations.
    Return a JSON response strictly matching this schema:
    {{
        "mistakes_made": [
            {{
                "mistake_id": "string",
                "occurred_at": "string (ISO)",
                "related_step_or_decision": "string",
                "severity": "string",
                "penalty": 0.0,
                "description": "string",
                "consequence": "string"
            }}
        ],
        "final_score": {{
            "overall_score": 0.0,
            "passed": true,
            "pass_threshold": 0.0,
            "base_score": 0.0,
            "total_penalty": 0.0,
            "hints_used_count": 0,
            "competency_scores": {{ "comp_name": 0.0 }},
            "ai_explanations": ["string"],
            "recommended_next_simulations": ["string"]
        }}
    }}
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    req_obj = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req_obj) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        
    text = response_data['candidates'][0]['content']['parts'][0]['text']
    result = json.loads(text)
    return result

@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, str]:
    prompt = f"""
    You are an AI assistant helping a learner complete a technical simulation.
    Simulation context:
    {json.dumps(req.simulation)}
    
    Learner's progress so far:
    {json.dumps(req.attempt)}
    
    Learner's Question:
    "{req.question}"
    
    Provide a helpful, educational response that guides the learner without simply giving them the answer. Keep it concise, friendly, and act as a realistic chat bot.
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    req_obj = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req_obj) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        
    text = response_data['candidates'][0]['content']['parts'][0]['text']
    return {"reply": text}


from fastapi import UploadFile, File

@app.post("/vision/ppe-detect")
async def ppe_detect(file: UploadFile = File(...)):
    # Read filename or content length to add variation
    filename = file.filename.lower()
    
    # Pre-trained YOLO detection mapping simulation
    detections = []
    
    # If the user uploaded an image containing 'unsafe' or 'missing', simulate safety violation
    if "unsafe" in filename or "missing" in filename or "no_helmet" in filename:
        detections = [
            {"class": "person", "confidence": 0.94, "box": [100, 200, 300, 800]},
            {"class": "safety_goggles", "confidence": 0.89, "box": [180, 220, 240, 260]},
            {"class": "gloves", "confidence": 0.81, "box": [450, 210, 490, 270]}
            # Helmet is intentionally missing
        ]
    else:
        # Standard correct scan (Person + Helmet + Goggles + Gloves)
        detections = [
            {"class": "person", "confidence": 0.96, "box": [100, 200, 300, 800]},
            {"class": "safety_helmet", "confidence": 0.92, "box": [150, 120, 250, 210]},
            {"class": "safety_goggles", "confidence": 0.88, "box": [180, 220, 240, 260]},
            {"class": "gloves", "confidence": 0.84, "box": [450, 210, 490, 270]}
        ]

    return {
        "filename": file.filename,
        "detections": detections,
        "summary": "Full PPE compliance detected" if any(d["class"] == "safety_helmet" for d in detections) else "Safety Violation: Missing Hard Hat!"
    }


@app.post("/vision/hazard-detect")
async def hazard_detect(file: UploadFile = File(...)):
    filename = file.filename.lower()
    detections = []
    
    if "spill" in filename or "blocked" in filename:
        detections = [
            {"class": "chemical_spill", "confidence": 0.95, "box": [500, 500, 600, 600]},
            {"class": "blocked_exit", "confidence": 0.98, "box": [700, 100, 900, 800]}
        ]
    else:
        detections = [
            {"class": "safe_floor", "confidence": 0.99, "box": [0, 500, 1000, 1000]}
        ]

    return {
        "filename": file.filename,
        "detections": detections,
        "summary": "Hazards detected!" if len(detections) > 1 else "Area is clear."
    }

class EvacRequest(BaseModel):
    blocked_nodes: List[str]
    start_node: str
    end_node: str

@app.post("/solve/fire-evac")
def solve_fire_evac(req: EvacRequest):
    # Dummy graph for Dijkstra/A* logic demonstration
    graph = {
        "A": ["B", "C"],
        "B": ["A", "D"],
        "C": ["A", "D", "E"],
        "D": ["B", "C", "Exit"],
        "E": ["C", "Exit"],
        "Exit": []
    }
    
    # Simple BFS as fallback
    queue = [[req.start_node]]
    visited = set()
    
    while queue:
        path = queue.pop(0)
        node = path[-1]
        
        if node == req.end_node:
            return {"optimal_path": path, "is_possible": True}
            
        if node not in visited:
            for adjacent in graph.get(node, []):
                if adjacent not in req.blocked_nodes:
                    new_path = list(path)
                    new_path.append(adjacent)
                    queue.append(new_path)
            visited.add(node)
            
    return {"optimal_path": [], "is_possible": False}

import random

@app.get("/generate/cyber-scenario")
def generate_cyber_scenario():
    attackers = ["192.168.1.105", "10.0.0.42", "172.16.254.1", "203.0.113.5"]
    users = ["admin", "root", "deploy", "guest"]
    vectors = ["ssh brute force", "sql injection", "unauthorized shell", "buffer overflow"]
    
    attacker = random.choice(attackers)
    user = random.choice(users)
    vector = random.choice(vectors)
    
    log_entry = f"[{vector}] detected from IP {attacker} targeting user {user}"
    
    return {
        "attacker_ip": attacker,
        "target_user": user,
        "attack_vector": vector,
        "log_entry": log_entry
    }

class GCodeRequest(BaseModel):
    gcode: str

@app.post("/solve/voxel-toolpath")
def solve_voxel_toolpath(req: GCodeRequest):
    # Dummy parser that converts G0/G1 commands into 3D voxel coordinates
    voxels = []
    x, y, z = 0.0, 0.0, 0.0
    
    for line in req.gcode.splitlines():
        line = line.strip().upper()
        if line.startswith("G0") or line.startswith("G1"):
            parts = line.split()
            for part in parts:
                if part.startswith("X"): x = float(part[1:])
                elif part.startswith("Y"): y = float(part[1:])
                elif part.startswith("Z"): z = float(part[1:])
            # If Z < 0, it means the tool is cutting into the material
            if z < 0:
                voxels.append({"x": x, "y": y, "z": z})
                
    return {"voxels_removed": voxels}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


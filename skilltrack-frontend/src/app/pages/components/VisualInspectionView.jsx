import { RefreshCw, Camera } from "lucide-react";
import { useRef, useEffect } from "react";
import { apiClient } from "../../../lib/apiClient";

export function VisualInspectionView({
  simulationId,
  simulation,
  stepIndex,
  handleNext,
  toast,
  // PPE state
  ppeState, setPpeState,
  visionLoading, setVisionLoading,
  yoloDetections, setYoloDetections,
  // Electrical state
  elecState, setElecState,
  lotoWarnings, setLotoWarnings,
  lotoRiskScore, setLotoRiskScore,
  // CNC state
  cncState, setCncState,
}) {
  const cncCanvasRef = useRef(null);

  // --- PPE CV Image detector ---
  const handlePpePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVisionLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8001/vision/ppe-detect", {
        method: "POST",
        body: formData
      }).then(r => r.json());

      setYoloDetections(res.detections);
      toast.success(res.summary);

      const hasHelmet = res.detections.some(d => d.class === "safety_helmet");
      if (hasHelmet) {
        setPpeState(prev => ({ ...prev, helmet: "good" }));
        if (stepIndex === 2) await handleNext();
      } else {
        setPpeState(prev => ({ ...prev, helmet: "cracked" }));
      }
    } catch (err) {
      toast.error("Could not run vision detector model.");
    } finally {
      setVisionLoading(false);
    }
  };

  // --- Electrical switch triggers wired to Nodal solver ---
  const handleBreakerToggle = async () => {
    const nextBreaker = elecState.mainBreaker === "ON" ? "OFF" : "ON";
    const nextState = { ...elecState, mainBreaker: nextBreaker };

    try {
      const res = await apiClient.post("/api/simulations/solve/electrical", nextState);
      setElecState({ ...nextState, measuredVoltage: res.voltage });
      toast.info(`Breaker turned ${nextBreaker}. Calculated node voltage: ${res.voltage}V`);

      if (nextBreaker === "OFF" && stepIndex === 1) {
        await handleNext();
      }
    } catch (err) {
      toast.error("Nodal analysis solver error.");
    }
  };

  const handleLotoAction = async (type) => {
    const nextState = { ...elecState, [type]: true };
    setElecState(nextState);
    toast.success(`${type === "lockApplied" ? "Lockout padlock" : "Danger warning tag"} applied.`);

    const actionLogs = [];
    if (elecState.mainBreaker === "OFF") actionLogs.push({ step_id: "ELEC_S1" });
    if (type === "lockApplied" || elecState.lockApplied) actionLogs.push({ step_id: "ELEC_S2" });
    if (type === "tagApplied" || elecState.tagApplied) actionLogs.push({ step_id: "ELEC_S3" });

    try {
      const val = await apiClient.post("/api/simulations/validate/loto", actionLogs);
      setLotoWarnings(val.warnings);
      setLotoRiskScore(val.safetyRiskScore);

      if (type === "lockApplied" && stepIndex === 2) await handleNext();
      else if (type === "tagApplied" && stepIndex === 3) await handleNext();
    } catch (err) {
      toast.error("LOTO sequence validator error.");
    }
  };

  // --- CNC Machine Setup G-Code Parser ---
  const drawGcodePath = () => {
    const canvas = cncCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 190);

    const lines = cncState.gcodeText.split("\n");
    let hasCrash = false;

    lines.forEach((line) => {
      const parts = line.toUpperCase().trim().split(/\s+/);
      const isMove = parts.includes("G00") || parts.includes("G01");
      const isHome = parts.includes("G28");

      if (isHome) {
        ctx.lineTo(10, 190);
      } else if (isMove) {
        let x = 0;
        let y = 0;
        parts.forEach((p) => {
          if (p.startsWith("X")) x = parseFloat(p.slice(1));
          if (p.startsWith("Y")) y = parseFloat(p.slice(1));
        });

        if (x < 0 || x > 100 || y < 0 || y > 100) {
          hasCrash = true;
        }

        const canvasX = 10 + (x * 1.8);
        const canvasY = 190 - (y * 1.8);
        ctx.lineTo(canvasX, canvasY);
      }
    });

    ctx.stroke();
    setCncState(prev => ({ ...prev, crashWarning: hasCrash }));
  };

  useEffect(() => {
    if (simulationId === "CNC_SETUP_003") {
      drawGcodePath();
    }
  }, [cncState.gcodeText, simulationId]);

  // --- PPE ---
  if (simulationId === "PPE_COMPLIANCE_001") {
    return (
      <div className="flex-1 grid grid-cols-2 gap-6 rounded-2xl p-6 overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="rounded-xl p-4 flex flex-col items-center justify-center relative shadow-sm" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
          {visionLoading ? (
            <div className="text-xs text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-blue-500" />
              YOLO scan processing...
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 relative">
                {ppeState.helmet ? <span className="text-4xl absolute -top-4">🪖</span> : "Mannequin"}
              </div>
              <div className="w-12 h-20 bg-slate-100 border-x border-slate-200 mt-2 relative">
                {ppeState.goggles && <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs">👓</span>}
                {ppeState.gloves && <span className="absolute top-6 -left-3 text-xs">🥊</span>}
                {ppeState.gloves && <span className="absolute top-6 -right-3 text-xs">🥊</span>}
              </div>
              <div className="text-[10px] text-slate-400 mt-4 text-center">
                {yoloDetections.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700">YOLO Detections:</p>
                    {yoloDetections.map((d, i) => (
                      <div key={i}>{d.class} ({(d.confidence*100).toFixed(0)}%)</div>
                    ))}
                  </div>
                ) : "Scan photo to check alignment"}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Webcam Scanner Upload:</p>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition-colors relative flex flex-col items-center justify-center gap-2 cursor-pointer">
            <Camera size={24} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600">Select or drop snap</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePpePhotoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <div className="text-[10px] text-slate-400 bg-white border border-slate-100 p-2.5 rounded-xl leading-relaxed">
            <p className="font-bold text-slate-600 mb-1">PPE Compliance Rules:</p>
            Ensure your photo is well-lit and includes helmet, goggles, and safety gloves. Uploading files with 'unsafe' in the name will simulate violations.
          </div>
        </div>
      </div>
    );
  }

  // --- Electrical Panel ---
  if (simulationId === "ELECTRICAL_PANEL_002") {
    return (
      <div className="flex-1 grid grid-cols-2 gap-6 rounded-2xl p-6 overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="rounded-xl p-4 flex flex-col justify-between shadow-sm" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-center font-bold text-[9px] text-slate-500 tracking-wider">NODAL ANALYSIS PANEL</div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-28 bg-slate-800 rounded-xl p-2 flex flex-col justify-between items-center shadow-inner border-2 border-slate-600">
              <div className="text-[9px] text-red-500 font-mono font-bold">BREAKER</div>
              <button
                onClick={handleBreakerToggle}
                className={`w-8 h-12 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all shadow-md ${elecState.mainBreaker === "ON" ? "bg-red-600 text-white translate-y-[-4px]" : "bg-slate-400 text-slate-800 translate-y-[4px]"}`}
              >
                {elecState.mainBreaker}
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {elecState.lockApplied && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔒 Lock</span>}
            {elecState.tagApplied && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">🏷️ Tag</span>}
          </div>
        </div>

        <div className="space-y-3 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Switchboard Operations:</p>

          <button
            onClick={() => handleLotoAction("lockApplied")}
            disabled={elecState.lockApplied}
            className="w-full py-2 text-xs font-bold rounded-xl border bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            Apply Lockout padlock
          </button>

          <button
            onClick={() => handleLotoAction("tagApplied")}
            disabled={elecState.tagApplied}
            className="w-full py-2 text-xs font-bold rounded-xl border bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            Apply Warning Tag
          </button>

          <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex justify-between items-center text-white font-mono shadow-sm">
            <span className="text-[10px] text-slate-400">VOLTMETER:</span>
            <span className="text-sm text-green-400 font-bold">{elecState.measuredVoltage}V AC</span>
          </div>

          {lotoWarnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] p-2 rounded-xl">
              <p className="font-bold">Risk Score: {lotoRiskScore}%</p>
              {lotoWarnings[0]}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- CNC ---
  if (simulationId === "CNC_SETUP_003") {
    return (
      <div className="flex-1 grid grid-cols-2 gap-6 rounded-2xl p-6 overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="rounded-xl p-3 flex flex-col justify-between shadow-sm relative" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">2D Cutter Toolpath Canvas</span>

          <div className="flex-1 flex items-center justify-center">
            <canvas ref={cncCanvasRef} width={200} height={200} className="bg-slate-950 rounded" />
          </div>

          {cncState.crashWarning && (
            <div className="absolute top-2 right-2 bg-red-600 text-white font-bold text-[8px] px-2 py-0.5 rounded animate-pulse">
              COLLISION DANGER
            </div>
          )}
        </div>

        <div className="space-y-4 flex flex-col justify-center min-h-0">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Feed G-Code commands:</p>

          <textarea
            value={cncState.gcodeText}
            onChange={(e) => setCncState(prev => ({ ...prev, gcodeText: e.target.value }))}
            className="flex-1 w-full bg-[#1E1E1E] text-[#D4D4D4] font-mono text-[10.5px] p-2.5 rounded-xl focus:outline-none resize-none leading-relaxed border border-[#2D2D2D]"
            spellCheck={false}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setCncState(prev => ({ ...prev, calibratedAxisX: true }))}
              disabled={cncState.calibratedAxisX}
              className="flex-1 py-2 text-xs font-bold rounded-xl border bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              Calibrate X
            </button>
            <button
              onClick={() => setCncState(prev => ({ ...prev, calibratedAxisY: true }))}
              disabled={cncState.calibratedAxisY}
              className="flex-1 py-2 text-xs font-bold rounded-xl border bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              Calibrate Y
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other VISUAL simulations (Motor Troubleshooting, Hydraulic, Hazard ID)
  return (
    <div className="flex-1 rounded-2xl flex items-center justify-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="text-center p-6">
        <div className="w-16 h-16 rounded-3xl shadow-md flex items-center justify-center mx-auto mb-3" style={{ background: '#f3f4f6' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>Visual Inspection Mode</p>
        <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: '#4b5563' }}>{simulation?.goal}</p>
        <div className="mt-3 inline-block text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
          Interactive inspection tools loading…
        </div>
      </div>
    </div>
  );
}

import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

export function TerminalSandboxView({
  simulationId,
  simulation,
  stepIndex,
  handleNext,
  toast,
  cyberState,
  setCyberState,
}) {
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cyberState.terminalLogs]);

  // --- Execute command via Sandbox Orchestrator ---
  const handleTerminalCommand = async (e) => {
    e.preventDefault();
    const cmd = cyberState.terminalCommand.trim();
    if (!cmd) return;

    setCyberState(prev => ({ ...prev, terminalCommand: "" }));

    if (cmd.toLowerCase() === "help") {
      setCyberState(prev => ({
        ...prev,
        terminalLogs: [...prev.terminalLogs, `> ${cmd}`, "sandbox-container commands:\n  ls              List files\n  ps              List processes\n  cat /var/log/syslog Print logs\n  kill -9 <PID>   Terminate process\n  netstat -tlnp   Show open ports\n  whoami          Current user\n  history         Command history"]
      }));
      return;
    }

    try {
      const res = await fetch("http://localhost:8086/sandbox/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandbox_id: cyberState.sandboxId, command: cmd })
      }).then(r => r.json());

      const output = res.exit_code === 0 ? (res.stdout || "[Success: No output]") : res.stderr;
      setCyberState(prev => ({
        ...prev,
        terminalLogs: [...prev.terminalLogs, `> ${cmd}`, output]
      }));

      // Check for step-specific progression
      if (cmd.includes("kill") && cmd.includes("4821") && stepIndex === 2) {
        await handleNext();
      }
    } catch (err) {
      toast.error("Sandbox execution failed.");
    }
  };

  // Determine title based on simulation
  const titles = {
    "CYBER_INCIDENT_004": "Cybersecurity IR Sandbox",
    "UBUNTU_MGMT_011": "Ubuntu Server Terminal",
    "GIT_COLLAB_012": "Git Collaboration Sandbox",
    "APP_DEPLOY_013": "Deployment Pipeline Terminal",
    "EOD_SHUTDOWN_014": "Resource Shutdown Console",
  };
  const title = titles[simulationId] || "Terminal Sandbox";

  return (
    <div className="flex-1 flex flex-col bg-black rounded-xl border border-slate-900 text-slate-300 font-mono text-[10px] overflow-hidden">
      <div className="bg-slate-900 px-3 py-2 text-slate-500 font-bold border-b border-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Terminal size={12} className="text-green-500" />
          {title} (Docker client)
        </span>
        <span className="text-[9px] text-green-500/80">Isolated Sandbox</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {cyberState.terminalLogs.map((log, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed">{log}</div>
        ))}
        <div ref={terminalEndRef} />
      </div>
      <form onSubmit={handleTerminalCommand} className="flex border-t border-slate-850 p-2 bg-slate-950">
        <span className="text-green-500 mr-2 font-bold">$</span>
        <input
          type="text"
          value={cyberState.terminalCommand}
          onChange={(e) => setCyberState(prev => ({ ...prev, terminalCommand: e.target.value }))}
          className="bg-transparent text-white outline-none flex-1 border-none p-0 text-[10px] font-mono"
          placeholder="Type container shell command (ps, ls, cat /var/log/syslog)..."
          autoFocus
        />
      </form>
    </div>
  );
}

// src/app/platform/widgets/Terminal.jsx
import React, { useEffect, useRef, useState } from 'react';

/**
 * A simulated terminal / console output component.
 * Props:
 *   simulationId – Used to scope WebSocket or polling if wired up later.
 */
export default function Terminal({ simulationId, steps = [], activeStepIndex = 0, onStepComplete }) {
  const [lines, setLines] = useState([
    { type: 'info',    text: `Simulation terminal ready [id: ${simulationId ?? 'unknown'}]` },
    { type: 'prompt',  text: 'Type a command and press Enter…' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever lines change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    const newLines = [{ type: 'command', text: `$ ${cmd}` }];

    if (activeStepIndex < steps.length) {
      const currentStep = steps[activeStepIndex];
      if (cmd === currentStep.expected_action) {
        newLines.push({ type: 'output', text: `Success: Executed '${cmd}' successfully.` });
        if (onStepComplete) onStepComplete(activeStepIndex);
      } else {
        newLines.push({ type: 'error', text: `Error: Command '${cmd}' is incorrect or not expected right now.` });
      }
    } else {
      newLines.push({ type: 'output', text: `Simulation complete. No further commands required.` });
    }

    setLines((prev) => [...prev, ...newLines]);
    setInput('');
  };

  const typeColor = { info: '#60a5fa', prompt: '#9ca3af', command: '#34d399', output: '#e5e7eb', error: '#f87171' };

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 16,
        padding: '16px 20px',
        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
        fontSize: 13,
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}
    >
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ color: '#475569', fontSize: 12, marginLeft: 8 }}>bash — skilltrack terminal</span>
      </div>

      {/* Output area */}
      <div
        style={{
          height: 240,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 12,
        }}
      >
        {lines.map((line, i) => (
          <p key={i} style={{ margin: 0, color: typeColor[line.type] ?? '#e5e7eb' }}>
            {line.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <span style={{ color: '#34d399', userSelect: 'none' }}>$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command…"
          disabled={activeStepIndex >= steps.length && steps.length > 0}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e5e7eb',
            fontFamily: 'inherit',
            fontSize: 13,
          }}
        />
      </form>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import 'xterm/css/xterm.css';

/**
 * Terminal component wraps xterm.js to provide a VS Code‑like terminal.
 * Props:
 *   onInput: (data: string) => void – called when user types.
 *   height: string – CSS height (default '300px').
 */
export default function Terminal({ onInput, height = '300px' }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);

  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      theme: { background: 'rgba(0,0,0,0.8)', foreground: '#fff' },
    });
    term.open(terminalRef.current);
    term.focus();
    xtermRef.current = term;

    // Handle user input
    term.onData((data) => {
      if (onInput) onInput(data);
    });

    // Example welcome message
    term.writeln('Welcome to SkillTrack Terminal');
    term.writeln('');

    return () => {
      term.dispose();
    };
  }, [onInput]);

  // Expose a simple write method for external usage (optional)
  const write = (msg) => {
    if (xtermRef.current) xtermRef.current.writeln(msg);
  };

  return <div style={{ height }} ref={terminalRef} className="glass-card" />;
}

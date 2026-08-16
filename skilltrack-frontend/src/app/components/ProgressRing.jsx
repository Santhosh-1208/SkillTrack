// src/app/platform/widgets/ProgressRing.jsx
import React from 'react';

/**
 * Circular progress ring component.
 * Props:
 *   progress – Number 0‑100
 *   size     – Diameter in px (default 80)
 *   stroke   – Ring thickness (default 8)
 *   color    – Ring colour (default indigo)
 */
export default function ProgressRing({ progress = 0, size = 80, stroke = 8, color = '#4f46e5' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Animated progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      {/* Centred label */}
      <span
        style={{
          position: 'absolute',
          fontSize: size * 0.22,
          fontWeight: 700,
          color,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
}

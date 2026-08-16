import React from 'react';
/**
 * Circular progress ring showing percentage completion.
 * Props:
 *   progress (0‑100) – percentage of SOP steps completed.
 */
export default function ProgressRing({ progress = 0 }) {
  const radius = 45;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2} className="glass-card">
      <circle
        stroke="rgba(255,255,255,0.2)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="hsl(217,91%,60%)"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="1rem"
        fontFamily="Inter, sans-serif"
      >
        {`${Math.round(progress)}%`}
      </text>
    </svg>
  );
}

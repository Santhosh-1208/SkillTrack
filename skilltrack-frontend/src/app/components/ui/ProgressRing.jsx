// src/app/components/ui/ProgressRing.jsx
import React from "react";

/**
 * A circular progress‑ring that animates from 0 % to the supplied `value`.
 *
 * Props
 * -----
 * `value`   – Number (0‑100) representing the current progress.
 * `size`    – Diameter in px (default 80).
 * `stroke`  – Width of the ring stroke (default 8).
 * `color`   – Ring colour; falls back to a vibrant gradient.
 */
export default function ProgressRing({
  value = 0,
  size = 80,
  stroke = 8,
  color = "#4f46e5",
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
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
      {/* Animated progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
      />
      {/* Percentage label */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.25}
        fill={color}
        fontFamily="\"Roboto\", \"Helvetica\", \"Arial\", sans-serif"
        style={{ transform: "rotate(90deg)" }}
      >
        {`${Math.round(value)}%`}
      </text>
    </svg>
  );
}

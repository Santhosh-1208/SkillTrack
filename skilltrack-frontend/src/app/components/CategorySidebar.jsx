// src/app/platform/widgets/CategorySidebar.jsx
import React, { useState } from 'react';

/**
 * Sidebar that lists simulation categories and lets the user filter.
 * Props:
 *   categories     – Array of category strings
 *   onFilterChange – Callback(selectedCategory | null)
 */
export default function CategorySidebar({ categories = [], onFilterChange }) {
  const [active, setActive] = useState(null);

  const handleClick = (cat) => {
    const next = cat === active ? null : cat;
    setActive(next);
    if (onFilterChange) onFilterChange(next);
  };

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100%',
        background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '2px 0 16px rgba(0,0,0,0.18)',
        flexShrink: 0,
      }}
    >
      <p
        style={{
          color: '#a5b4fc',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingLeft: 8,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Categories
      </p>

      {categories.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13, paddingLeft: 8 }}>No categories</p>
      )}

      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          style={{
            background: active === cat ? 'rgba(99,102,241,0.35)' : 'transparent',
            border: active === cat ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
            borderRadius: 8,
            padding: '10px 14px',
            color: active === cat ? '#e0e7ff' : '#a5b4fc',
            fontSize: 14,
            fontWeight: active === cat ? 600 : 400,
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={(e) => {
            if (active !== cat) e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
          }}
          onMouseLeave={(e) => {
            if (active !== cat) e.currentTarget.style.background = 'transparent';
          }}
        >
          {cat}
        </button>
      ))}
    </aside>
  );
}

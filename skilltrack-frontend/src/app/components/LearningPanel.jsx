// src/app/components/LearningPanel.jsx
import React, { useState } from 'react';

/**
 * Panel that displays "What you'll learn" and "How it works" sections.
 * Props:
 *   what – String describing what the learner will learn.
 *   how  – String describing how the simulation works.
 */
export default function LearningPanel({ what, how }) {
  const [tab, setTab] = useState('what');

  const tabs = [
    { key: 'what', label: 'What you\'ll learn', content: what },
    { key: 'how',  label: 'How it works',       content: how  },
  ];

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        marginBottom: 24,
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '3px solid #4f46e5' : '3px solid transparent',
              color: tab === t.key ? '#4f46e5' : '#6b7280',
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', minHeight: 80 }}>
        {tabs.find((t) => t.key === tab)?.content ? (
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            {tabs.find((t) => t.key === tab).content}
          </p>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>No content available.</p>
        )}
      </div>
    </div>
  );
}

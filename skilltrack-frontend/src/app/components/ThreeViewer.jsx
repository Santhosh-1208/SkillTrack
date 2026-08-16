// src/app/platform/widgets/ThreeViewer.jsx
import React, { useEffect, useRef } from 'react';

/**
 * 3‑D model viewer powered by <model-viewer> web component (Google).
 * Falls back to a placeholder card if the web component script is not loaded.
 *
 * Props:
 *   modelUrl – URL of the .glb / .gltf 3‑D model to display.
 */
export default function ThreeViewer({ modelUrl }) {
  const scriptId = 'model-viewer-script';

  useEffect(() => {
    // Lazily inject the <model-viewer> web-component script once
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  if (!modelUrl) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        background: '#f8fafc',
      }}
    >
      {/* eslint-disable-next-line react/no-unknown-property */}
      <model-viewer
        src={modelUrl}
        alt="3D model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: '100%', height: 400, display: 'block' }}
      />
    </div>
  );
}

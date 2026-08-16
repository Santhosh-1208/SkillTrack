import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Simple 3D viewer for GLTF models.
 * Props:
 *   modelUrl – URL or relative path to a .glb/.gltf file.
 */
export default function ThreeViewer({ modelUrl }) {
  return (
    <Canvas className="glass-card" style={{ height: '400px' }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={<Html>Loading 3D model…</Html>}>
        {/* Load model asynchronously */}
        <primitive
          object={new GLTFLoader().loadAsync(modelUrl).then((g) => g.scene)}
        />
      </Suspense>
      <OrbitControls enableZoom={true} />
    </Canvas>
  );
}

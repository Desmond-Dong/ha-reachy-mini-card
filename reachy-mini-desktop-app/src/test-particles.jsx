import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ParticleEffect from './components/viewer3d/effects/ParticleEffect';

/**
 * 🧪 Particle Effect Test Page
 * Standalone page to preview and test all particle effects
 */
export default function TestParticles() {
  const [activeEffect, setActiveEffect] = useState('sleep');
  const [key, setKey] = useState(0);

  const effects = ['sleep', 'love', 'surprised', 'sad', 'thinking', 'happy'];

  const handleEffectChange = (effect) => {
    setActiveEffect(effect);
    setKey(k => k + 1); // Force re-mount to restart animation
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 600,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}>
          ✨ Particle System V2
        </h1>
        <span style={{
          fontSize: '14px',
          color: '#64748b',
        }}>
          Production-Grade Effects
        </span>
      </div>

      {/* Effect Selector */}
      <div style={{
        padding: '20px 30px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {effects.map((effect) => (
          <button
            key={effect}
            onClick={() => handleEffectChange(effect)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: activeEffect === effect 
                ? '2px solid #3b82f6' 
                : '1px solid rgba(255,255,255,0.15)',
              background: activeEffect === effect 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'rgba(255,255,255,0.05)',
              color: activeEffect === effect ? '#60a5fa' : '#94a3b8',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'capitalize',
            }}
          >
            {effect}
          </button>
        ))}
        
        <button
          onClick={() => setKey(k => k + 1)}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🔄 Replay
        </button>
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0.2, 0.6], fov: 50 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <color attach="background" args={['#0f172a']} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-3, 3, 3]} intensity={0.3} color="#60a5fa" />
          
          {/* Reference sphere to show spawn point */}
          <mesh position={[0, 0.18, 0.02]}>
            <sphereGeometry args={[0.01, 16, 16]} />
            <meshStandardMaterial color="#475569" opacity={0.5} transparent />
          </mesh>
          
          {/* Grid for reference */}
          <gridHelper args={[1, 20, '#334155', '#1e293b']} position={[0, 0, 0]} />
          
          {/* Particle Effect */}
          <ParticleEffect
            key={`${activeEffect}-${key}`}
            type={activeEffect}
            spawnPoint={[0, 0.18, 0.02]}
            particleCount={24}
            enabled={true}
            duration={5.0}
          />
          
          <OrbitControls 
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            target={[0, 0.18, 0]}
            minDistance={0.2}
            maxDistance={2}
          />
        </Canvas>
        
        {/* Effect Info Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#e2e8f0',
          fontSize: '13px',
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'capitalize' }}>
            {activeEffect} Effect
          </div>
          <div style={{ color: '#94a3b8' }}>
            Multi-layer particles • Simplex noise motion • Soft color palette
          </div>
        </div>
      </div>
    </div>
  );
}


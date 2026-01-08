import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simplex3, fbm } from './particles/NoiseGenerator';

/**
 * ✨ PRODUCTION-GRADE PARTICLE SYSTEM V2
 * 
 * Premium features:
 * - Multi-layer particles (glow + core + center)
 * - Subtle muted color palette
 * - Organic movement with Simplex noise
 * - Smooth easing curves
 * - GPU-optimized with proper cleanup
 */

// ═══════════════════════════════════════════════════════════════
// EASING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const smoothstep = (t) => t * t * (3 - 2 * t);

// ═══════════════════════════════════════════════════════════════
// EFFECT CONFIGURATIONS - Subtle & Elegant
// ═══════════════════════════════════════════════════════════════

const EFFECT_CONFIGS = {
  sleep: {
    name: 'sleep',
    // Soft, dreamy floating particles - "Zzz" effect
    layers: [
      { type: 'glow', count: 6, sizeRange: [0.08, 0.14], opacity: 0.35 },
      { type: 'core', count: 10, sizeRange: [0.025, 0.05], opacity: 0.85 },
      { type: 'dot', count: 8, sizeRange: [0.01, 0.02], opacity: 1.0 },
    ],
    colors: {
      primary: new THREE.Color(0xc4b5fd),   // Violet-300 (dreamy)
      secondary: new THREE.Color(0xa78bfa), // Violet-400
      glow: new THREE.Color(0xddd6fe),      // Violet-200
    },
    motion: {
      baseVelocity: [0, 0.035, 0],
      noiseScale: 0.6,
      noiseSpeed: 0.25,
      spread: 0.04,
      turbulence: 0.012,
      damping: 0.994,
      rotationSpeed: 0.08,
    },
    spawnPattern: 'gentle',
    blending: THREE.AdditiveBlending,
  },
  
  love: {
    name: 'love',
    // Romantic floating hearts with soft glow
    layers: [
      { type: 'glow', count: 5, sizeRange: [0.1, 0.16], opacity: 0.3 },
      { type: 'heart', count: 8, sizeRange: [0.035, 0.06], opacity: 0.9 },
      { type: 'dot', count: 12, sizeRange: [0.008, 0.018], opacity: 0.95 },
    ],
    colors: {
      primary: new THREE.Color(0xfb7185),   // Rose-400
      secondary: new THREE.Color(0xfda4af), // Rose-300
      glow: new THREE.Color(0xfecdd3),      // Rose-200
    },
    motion: {
      baseVelocity: [0, 0.04, 0],
      noiseScale: 1.0,
      noiseSpeed: 0.35,
      spread: 0.045,
      turbulence: 0.018,
      damping: 0.99,
      rotationSpeed: 0.12,
      spiralFactor: 0.25,
    },
    spawnPattern: 'burst',
    blending: THREE.AdditiveBlending,
  },
  
  surprised: {
    name: 'surprised',
    // Quick radial burst then fade - "!" effect
    layers: [
      { type: 'glow', count: 10, sizeRange: [0.06, 0.12], opacity: 0.4 },
      { type: 'line', count: 8, sizeRange: [0.025, 0.045], opacity: 0.95 },
      { type: 'dot', count: 14, sizeRange: [0.01, 0.025], opacity: 1.0 },
    ],
    colors: {
      primary: new THREE.Color(0xfbbf24),   // Amber-400
      secondary: new THREE.Color(0xfcd34d), // Amber-300
      glow: new THREE.Color(0xfef08a),      // Yellow-200
    },
    motion: {
      baseVelocity: [0, 0.06, 0],
      noiseScale: 1.8,
      noiseSpeed: 0.7,
      spread: 0.08,
      turbulence: 0.035,
      damping: 0.978,
      rotationSpeed: 0.0,
      burstForce: 0.1,
    },
    spawnPattern: 'burst',
    blending: THREE.AdditiveBlending,
  },
  
  sad: {
    name: 'sad',
    // Gentle falling droplets - tear effect
    layers: [
      { type: 'glow', count: 4, sizeRange: [0.06, 0.1], opacity: 0.25 },
      { type: 'drop', count: 8, sizeRange: [0.02, 0.04], opacity: 0.8 },
      { type: 'dot', count: 6, sizeRange: [0.008, 0.015], opacity: 0.9 },
    ],
    colors: {
      primary: new THREE.Color(0x60a5fa),   // Blue-400
      secondary: new THREE.Color(0x93c5fd), // Blue-300
      glow: new THREE.Color(0xbfdbfe),      // Blue-200
    },
    motion: {
      baseVelocity: [0, 0.02, 0],
      noiseScale: 0.4,
      noiseSpeed: 0.15,
      spread: 0.035,
      turbulence: 0.006,
      damping: 0.996,
      rotationSpeed: 0.03,
      gravity: -0.015,
    },
    spawnPattern: 'gentle',
    blending: THREE.AdditiveBlending,
  },

  thinking: {
    name: 'thinking',
    // Orbiting dots around head - "..." effect
    layers: [
      { type: 'glow', count: 3, sizeRange: [0.05, 0.08], opacity: 0.3 },
      { type: 'core', count: 5, sizeRange: [0.02, 0.035], opacity: 0.95 },
    ],
    colors: {
      primary: new THREE.Color(0xa78bfa),   // Violet-400
      secondary: new THREE.Color(0xc4b5fd), // Violet-300
      glow: new THREE.Color(0xddd6fe),      // Violet-200
    },
    motion: {
      baseVelocity: [0, 0.008, 0],
      noiseScale: 0.25,
      noiseSpeed: 0.12,
      spread: 0.025,
      turbulence: 0.004,
      damping: 0.998,
      rotationSpeed: 0.0,
      orbitSpeed: 1.8,
      orbitRadius: 0.07,
    },
    spawnPattern: 'orbit',
    blending: THREE.AdditiveBlending,
  },

  happy: {
    name: 'happy',
    // Sparkles bursting outward - celebration effect
    layers: [
      { type: 'glow', count: 8, sizeRange: [0.05, 0.1], opacity: 0.35 },
      { type: 'star', count: 10, sizeRange: [0.025, 0.045], opacity: 0.95 },
      { type: 'dot', count: 16, sizeRange: [0.006, 0.015], opacity: 1.0 },
    ],
    colors: {
      primary: new THREE.Color(0xfbbf24),   // Amber-400
      secondary: new THREE.Color(0xfcd34d), // Amber-300
      glow: new THREE.Color(0xfef3c7),      // Amber-100
    },
    motion: {
      baseVelocity: [0, 0.05, 0],
      noiseScale: 1.4,
      noiseSpeed: 0.55,
      spread: 0.07,
      turbulence: 0.028,
      damping: 0.982,
      rotationSpeed: 0.25,
      burstForce: 0.06,
    },
    spawnPattern: 'burst',
    blending: THREE.AdditiveBlending,
  },
};

// ═══════════════════════════════════════════════════════════════
// TEXTURE GENERATORS - Minimal geometric shapes
// ═══════════════════════════════════════════════════════════════

function createCircleTexture(size = 128, softness = 0.3) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const center = size / 2;
  const radius = size / 2 - 2;
  
  // Soft radial gradient
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1 - softness, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const center = size / 2;
  const radius = size / 2 - 2;
  
  // Very soft glow
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createHeartTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const scale = size / 30;
  ctx.translate(size / 2, size / 2 + 2 * scale);
  ctx.scale(scale, scale);
  
  // Simplified heart path
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(-8, -12, -14, -4, -14, 2);
  ctx.bezierCurveTo(-14, 8, 0, 14, 0, 14);
  ctx.bezierCurveTo(0, 14, 14, 8, 14, 2);
  ctx.bezierCurveTo(14, -4, 8, -12, 0, -4);
  ctx.closePath();
  
  // Soft fill
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createDropTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 3;
  
  // Teardrop shape
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius * 1.5);
  ctx.bezierCurveTo(
    centerX + radius * 0.8, centerY - radius * 0.5,
    centerX + radius, centerY + radius * 0.3,
    centerX, centerY + radius
  );
  ctx.bezierCurveTo(
    centerX - radius, centerY + radius * 0.3,
    centerX - radius * 0.8, centerY - radius * 0.5,
    centerX, centerY - radius * 1.5
  );
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createStarTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.4;
  const points = 4;
  
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createLineTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(size / 2, 0, size / 2, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(size / 2 - 4, 0, 8, size);
  
  return new THREE.CanvasTexture(canvas);
}

// Texture cache to avoid recreation
const textureCache = new Map();

function getTexture(type) {
  if (textureCache.has(type)) {
    return textureCache.get(type);
  }
  
  let texture;
  switch (type) {
    case 'glow':
      texture = createGlowTexture(128);
      break;
    case 'heart':
      texture = createHeartTexture(128);
      break;
    case 'drop':
      texture = createDropTexture(128);
      break;
    case 'star':
      texture = createStarTexture(128);
      break;
    case 'line':
      texture = createLineTexture(128);
      break;
    case 'core':
    case 'dot':
    default:
      texture = createCircleTexture(128, type === 'dot' ? 0.1 : 0.4);
  }
  
  textureCache.set(type, texture);
  return texture;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ParticleEffect({ 
  type = 'sleep',
  spawnPoint = [0, 0.18, 0.02],
  particleCount = 20,
  enabled = true,
  duration = 5.0,
}) {
  const groupRef = useRef();
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const startTimeRef = useRef(0);

  // Get config for effect type
  const config = useMemo(() => {
    return EFFECT_CONFIGS[type] || EFFECT_CONFIGS.sleep;
  }, [type]);

  // Create all particles for all layers
  const particles = useMemo(() => {
    if (!enabled) return [];
    
    const allParticles = [];
    const spawnPos = new THREE.Vector3(...spawnPoint);
    let globalIndex = 0;
    
    config.layers.forEach((layer, layerIndex) => {
      const texture = getTexture(layer.type);
      const colorKey = layer.type === 'glow' ? 'glow' : 
                       layer.type === 'dot' ? 'secondary' : 'primary';
      const baseColor = config.colors[colorKey];
      
      for (let i = 0; i < layer.count; i++) {
        const seed = globalIndex * 137.5 + layerIndex * 1000;
        const rand = (offset = 0) => {
          const x = Math.sin((seed + offset) * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };
        
        // Size variation within layer range
        const size = layer.sizeRange[0] + rand(0.1) * (layer.sizeRange[1] - layer.sizeRange[0]);
        
        // Create material with proper color tinting
        const material = new THREE.SpriteMaterial({
          map: texture,
          color: baseColor,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: config.blending,
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size, size, 1);
        
        // Initial position with spread
        const angle = rand(0.2) * Math.PI * 2;
        const radius = rand(0.3) * config.motion.spread * 0.3;
        sprite.position.copy(spawnPos);
        sprite.position.x += Math.cos(angle) * radius;
        sprite.position.z += Math.sin(angle) * radius;
        sprite.position.y += (rand(0.4) - 0.5) * config.motion.spread * 0.2;
        
        // Initial velocity
        const vel = new THREE.Vector3(...config.motion.baseVelocity);
        const velVariation = 0.7 + rand(0.5) * 0.6;
        vel.multiplyScalar(velVariation);
        
        // Add lateral spread
        if (config.spawnPattern === 'burst' && config.motion.burstForce) {
          const burstAngle = rand(0.6) * Math.PI * 2;
          const burstMag = config.motion.burstForce * (0.5 + rand(0.7) * 0.5);
          vel.x += Math.cos(burstAngle) * burstMag;
          vel.z += Math.sin(burstAngle) * burstMag;
        }
        
        // Particle data
        sprite.userData = {
          seed,
          rand,
          layerIndex,
          layerType: layer.type,
          baseSize: size,
          maxOpacity: layer.opacity,
          velocity: vel,
          baseVelocity: vel.clone(),
          
          // Spawn timing
          spawnDelay: config.spawnPattern === 'gentle' 
            ? (globalIndex / (config.layers.reduce((a, l) => a + l.count, 0))) * duration * 0.4
            : rand(0.8) * duration * 0.15,
          
          // Motion params
          noiseOffset: rand(0.9) * 1000,
          rotationSpeed: config.motion.rotationSpeed * (0.5 + rand(1.0)) * (rand(1.1) > 0.5 ? 1 : -1),
          orbitPhase: rand(1.2) * Math.PI * 2,
          
          // State
          age: 0,
          lifeProgress: 0,
          isActive: false,
          initialPosition: sprite.position.clone(),
        };
        
        allParticles.push(sprite);
        globalIndex++;
      }
    });
    
    particlesRef.current = allParticles;
    return allParticles;
  }, [enabled, config, spawnPoint, duration]);

  // Reset on type change
  useEffect(() => {
    timeRef.current = 0;
    startTimeRef.current = performance.now() / 1000;
    particles.forEach(p => {
      p.userData.age = 0;
      p.userData.lifeProgress = 0;
      p.userData.isActive = false;
      p.material.opacity = 0;
    });
  }, [type, enabled, particles]);

  // Animation loop
  useFrame((state, delta) => {
    if (!enabled || particles.length === 0) return;
    
    const dt = Math.min(delta, 0.1);
    timeRef.current += dt;
    const globalTime = timeRef.current;
    
    particles.forEach((particle) => {
      const ud = particle.userData;
      
      // Wait for spawn delay
      if (globalTime < ud.spawnDelay) {
        particle.material.opacity = 0;
        return;
      }
      
      // Activate particle
      if (!ud.isActive) {
        ud.isActive = true;
        ud.age = 0;
      }
      
      // Update age
      ud.age += dt;
      ud.lifeProgress = Math.min(ud.age / duration, 1.0);
      
      // Dead particle
      if (ud.lifeProgress >= 1.0) {
        particle.material.opacity = 0;
        return;
      }
      
      // ═══════════════════════════════════════════════════════════
      // OPACITY - Smooth bell curve with layer-specific timing
      // ═══════════════════════════════════════════════════════════
      
      let opacity = 0;
      const fadeInDuration = ud.layerType === 'glow' ? 0.3 : 0.2;
      const fadeOutStart = ud.layerType === 'glow' ? 0.6 : 0.7;
      
      if (ud.lifeProgress < fadeInDuration) {
        opacity = easeOutExpo(ud.lifeProgress / fadeInDuration);
      } else if (ud.lifeProgress < fadeOutStart) {
        opacity = 1.0;
      } else {
        const fadeProgress = (ud.lifeProgress - fadeOutStart) / (1 - fadeOutStart);
        opacity = 1.0 - easeInOutSine(fadeProgress);
      }
      
      // Subtle breathing for organic feel
      const breathe = 1 + Math.sin(ud.age * 2 + ud.seed) * 0.05;
      particle.material.opacity = Math.max(0, Math.min(1, opacity * ud.maxOpacity * breathe));
      
      // ═══════════════════════════════════════════════════════════
      // MOVEMENT - Organic noise-based motion
      // ═══════════════════════════════════════════════════════════
      
      const noiseTime = ud.age * config.motion.noiseSpeed + ud.noiseOffset;
      const noiseX = simplex3(noiseTime, ud.seed * 0.1, 0) * config.motion.turbulence;
      const noiseZ = simplex3(0, noiseTime, ud.seed * 0.1) * config.motion.turbulence;
      
      // Apply noise to velocity
      ud.velocity.x += noiseX * dt;
      ud.velocity.z += noiseZ * dt;
      
      // Gravity (for sad effect)
      if (config.motion.gravity) {
        ud.velocity.y += config.motion.gravity * dt;
      }
      
      // Spiral motion (for love effect)
      if (config.motion.spiralFactor) {
        const spiralAngle = ud.age * 2 + ud.orbitPhase;
        const spiralRadius = config.motion.spiralFactor * ud.lifeProgress;
        ud.velocity.x += Math.cos(spiralAngle) * spiralRadius * dt;
        ud.velocity.z += Math.sin(spiralAngle) * spiralRadius * dt;
      }
      
      // Orbit motion (for thinking effect)
      if (config.motion.orbitSpeed && config.motion.orbitRadius) {
        const orbitAngle = ud.age * config.motion.orbitSpeed + ud.orbitPhase;
        const targetX = ud.initialPosition.x + Math.cos(orbitAngle) * config.motion.orbitRadius;
        const targetZ = ud.initialPosition.z + Math.sin(orbitAngle) * config.motion.orbitRadius;
        
        particle.position.x += (targetX - particle.position.x) * 0.1;
        particle.position.z += (targetZ - particle.position.z) * 0.1;
        particle.position.y += ud.velocity.y * dt;
      } else {
        // Normal velocity-based movement
        particle.position.x += ud.velocity.x * dt;
        particle.position.y += ud.velocity.y * dt;
        particle.position.z += ud.velocity.z * dt;
      }
      
      // Damping
      ud.velocity.multiplyScalar(config.motion.damping);
      
      // ═══════════════════════════════════════════════════════════
      // ROTATION
      // ═══════════════════════════════════════════════════════════
      
      if (ud.rotationSpeed !== 0) {
        particle.material.rotation += ud.rotationSpeed * dt;
      }
      
      // ═══════════════════════════════════════════════════════════
      // SCALE - Smooth pop-in, stable, then gentle shrink
      // ═══════════════════════════════════════════════════════════
      
      let scaleFactor = 1.0;
      
      if (ud.lifeProgress < 0.1) {
        // Pop in
        scaleFactor = easeOutQuart(ud.lifeProgress / 0.1);
      } else if (ud.lifeProgress > 0.8) {
        // Gentle shrink
        scaleFactor = 1.0 - smoothstep((ud.lifeProgress - 0.8) / 0.2) * 0.3;
      }
      
      // Glow layer pulses slightly
      if (ud.layerType === 'glow') {
        scaleFactor *= 1 + Math.sin(ud.age * 1.5 + ud.seed) * 0.1;
      }
      
      const finalScale = ud.baseSize * scaleFactor;
      particle.scale.set(finalScale, finalScale, 1);
    });
  });

  // Cleanup
  useEffect(() => {
    return () => {
      particles.forEach(p => {
        if (p.material) {
          p.material.dispose();
        }
      });
    };
  }, [particles]);

  if (!enabled || particles.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} name={`particle-effect-${type}`}>
      {particles.map((particle, i) => (
        <primitive key={`${type}-particle-${i}`} object={particle} />
      ))}
    </group>
  );
}

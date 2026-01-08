import * as THREE from 'three';

/**
 * Utilities for creating and managing robot materials
 * Focused on X-ray rendering for the 3D viewer
 */

/**
 * Simple and efficient X-ray shader using Fresnel rim lighting
 * Based on proven techniques: rim lighting for edges, transparency for X-ray effect
 */
export const xrayShader = {
  uniforms: {
    baseColor: { value: new THREE.Color(0x5A6570) },
    rimColor: { value: new THREE.Color(0x8A9AAC) },
    opacity: { value: 0.3 },
    rimIntensity: { value: 0.6 },
  },
  
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  
  fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 rimColor;
    uniform float opacity;
    uniform float rimIntensity;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      // Fresnel effect: edges are brighter (rim lighting)
      float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
      fresnel = pow(fresnel, 2.0);
      
      // Mix base color with rim color based on fresnel
      vec3 finalColor = mix(baseColor, rimColor, fresnel * rimIntensity);
      
      gl_FragColor = vec4(finalColor, opacity);
    }
  `
};

/**
 * Creates a simple X-ray material
 * @param {number} baseColorHex - Base color in hex (default: gray-blue)
 * @param {object} options - Options: { opacity, rimColor, rimIntensity, scanMode }
 * @param {boolean} options.scanMode - If true, uses green color for scan effect
 * @returns {THREE.ShaderMaterial}
 */
export function createXrayMaterial(baseColorHex = 0x5A6570, options = {}) {
  const isScanMode = options.scanMode === true;
  
  // Scan mode: green colors
  const baseColor = isScanMode ? 0x2D5A3D : baseColorHex;
  const rimColor = isScanMode ? 0x4ADE80 : (options.rimColor || 0x8A9AAC);
  
  const uniforms = {
    baseColor: { value: new THREE.Color(baseColor) },
    rimColor: { value: new THREE.Color(rimColor) },
    opacity: { value: options.opacity ?? 0.3 },
    rimIntensity: { value: options.rimIntensity ?? 0.6 },
  };
  
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: xrayShader.vertexShader,
    fragmentShader: xrayShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    opacity: options.opacity ?? 0.3,
  });
  
  return material;
}

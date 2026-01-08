import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DAEMON_CONFIG } from '../../../config/daemon';
import { createXrayMaterial } from '../../../utils/viewer3d/materials';

/**
 * Premium World-Class Scan Effect
 * Production-grade scanning animation with:
 * - Sweeping wave effect
 * - Dynamic glow and particles
 * - Smooth color transitions
 * - Holographic data visualization
 */
export default function PremiumScanEffect({ 
  meshes = [],
  scanColor = '#00ff88', // Premium cyan-green
  enabled = true,
  onComplete = null,
  onScanMesh = null,
}) {
  const isScanningRef = useRef(false);
  const animationFrameRef = useRef(null);
  const onScanMeshRef = useRef(onScanMesh);
  const onCompleteRef = useRef(onComplete);
  const scanStateRef = useRef({
    meshes: [],
    startTime: 0,
    duration: 0,
    scannedCount: 0,
    notifiedMeshes: new Set(),
    sweepPosition: 0, // Current sweep position (0-1)
  });

  // Update refs when callbacks change
  useEffect(() => {
    onScanMeshRef.current = onScanMesh;
    onCompleteRef.current = onComplete;
  }, [onScanMesh, onComplete]);

  useEffect(() => {
    if (!enabled || meshes.length === 0) {
      isScanningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    if (isScanningRef.current) {
      return;
    }

    isScanningRef.current = true;

    const duration = DAEMON_CONFIG.ANIMATIONS.SCAN_DURATION / 1000;

    // Filter scannable meshes
    const scannableMeshes = meshes.filter(mesh => 
      mesh.material && 
      !mesh.userData.isShellPiece && 
      !mesh.userData.isOutline &&
      !mesh.userData.isErrorMesh
    );
    
    // Sort meshes from bottom to top
    const sortedMeshes = [...scannableMeshes].sort((a, b) => {
      const posA = new THREE.Vector3();
      const posB = new THREE.Vector3();
      a.getWorldPosition(posA);
      b.getWorldPosition(posB);
      return posA.y - posB.y;
    });
    
    // Pre-compute mesh data with enhanced properties
    const meshData = sortedMeshes.map((mesh, index) => {
      const isAntenna = mesh.userData?.isAntenna || false;
      const isShellPiece = mesh.userData?.isShellPiece || false;
      const materialName = (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase();
      const isBigLens = materialName.includes('big_lens') || 
                       materialName.includes('small_lens') ||
                       materialName.includes('lens_d40') ||
                       materialName.includes('lens_d30');
        
      // Calculate target X-ray color
      let targetXrayColor;
      if (isAntenna) {
        targetXrayColor = 0x5A6B7C;
      } else if (isBigLens) {
        targetXrayColor = 0x6B7B7A;
      } else if (isShellPiece) {
        targetXrayColor = 0x5A6570;
      } else {
        const originalColor = mesh.userData?.originalColor || 0xFF9500;
        const r = (originalColor >> 16) & 0xFF;
        const g = (originalColor >> 8) & 0xFF;
        const b = originalColor & 0xFF;
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (luminance > 200) targetXrayColor = 0x6B757D;
        else if (luminance > 150) targetXrayColor = 0x5A6570;
        else if (luminance > 100) targetXrayColor = 0x4A5560;
        else if (luminance > 50) targetXrayColor = 0x3A4550;
        else targetXrayColor = 0x2A3540;
      }
        
      const baseOpacity = mesh.material.opacity || 0.5;
      const finalOpacity = isShellPiece ? baseOpacity * 0.3 : baseOpacity;
      
      // Calculate normalized Y position (0-1) for sweep effect
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      const minY = sortedMeshes.length > 0 ? sortedMeshes[0].getWorldPosition(new THREE.Vector3()).y : 0;
      const maxY = sortedMeshes.length > 1 
        ? sortedMeshes[sortedMeshes.length - 1].getWorldPosition(new THREE.Vector3()).y 
        : minY + 0.5;
      const normalizedY = maxY > minY ? (worldPos.y - minY) / (maxY - minY) : 0;

      // Progressive start delay with maximum overlap for superposed animations
      const startDelay = sortedMeshes.length > 1 
        ? (duration * 1000 * index) / (sortedMeshes.length - 1) * 0.05 // 95% overlap for maximum superposition
        : 0;

      return {
        mesh,
        index,
        isAntenna,
        isBigLens,
        isShellPiece,
        targetXrayColor,
        finalOpacity,
        startDelay,
        normalizedY,
        state: 'waiting',
        scanStartTime: 0,
      };
    });

    const totalMeshes = sortedMeshes.length;

    // Initialize scan state
    scanStateRef.current = {
      meshes: meshData,
      startTime: Date.now(),
      duration: duration * 1000,
      scannedCount: 0,
      notifiedMeshes: new Set(),
      totalMeshes,
      sweepPosition: 0,
    };
        
    // Premium animation loop
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - scanStateRef.current.startTime;
      const totalDuration = scanStateRef.current.duration;
      
      // Update global sweep position (0-1)
      scanStateRef.current.sweepPosition = Math.min(elapsed / totalDuration, 1.0);
      
      // Fast highlight duration (3x faster)
      const highlightDuration = 233; // ~700/3 for 3x speed
      const fadeOutDuration = 133; // ~400/3 for 3x speed
      const totalMeshDuration = highlightDuration + fadeOutDuration;

      let activeMeshes = 0;

      scanStateRef.current.meshes.forEach((meshData) => {
        const { mesh, index, targetXrayColor, finalOpacity, isAntenna, isBigLens, isShellPiece, normalizedY } = meshData;
        
        if (!mesh.material || mesh.userData.isErrorMesh) return;

        const meshElapsed = currentTime - scanStateRef.current.startTime - meshData.startDelay;

        // Mesh hasn't started yet - keep original material
        if (meshElapsed < 0) {
          return;
        }
          
        // Notify start of scan for this mesh
        if (!scanStateRef.current.notifiedMeshes.has(mesh)) {
          scanStateRef.current.notifiedMeshes.add(mesh);
          if (onScanMeshRef.current) {
            onScanMeshRef.current(mesh, index + 1, scanStateRef.current.totalMeshes);
          }
        }

        const progress = Math.min(meshElapsed / totalMeshDuration, 1.0);
        
        // Don't start animation if progress is still 0 or negative
        if (progress <= 0) {
          return;
        }
        
        // Calculate distance from sweep wave (for wave effect)
        const sweepDistance = Math.abs(normalizedY - scanStateRef.current.sweepPosition);
        const waveIntensity = Math.max(0, 1 - (sweepDistance * 3)); // Wave falloff
        
        // Phase 1: Intense scan with wave effect (0-50% - faster transition)
        if (progress < 0.5) {
          meshData.state = 'scanning';
          activeMeshes++;
          
          // Get current material properties for smooth transition
          const currentOpacity = mesh.material?.opacity || finalOpacity;
          const currentRimIntensity = mesh.material?.uniforms?.rimIntensity?.value || 0.25;
            
          // Create scan material only once, starting from current X-ray material state
          if (!mesh.userData.scanMaterial) {
            mesh.userData.scanMaterial = createXrayMaterial(targetXrayColor, {
              rimColor: targetXrayColor, // Start with current color
              rimPower: 1.0,
              rimIntensity: currentRimIntensity, // Start from current
              opacity: currentOpacity, // Start from current
              edgeIntensity: 0.2, // Start from current
              subsurfaceColor: targetXrayColor,
              subsurfaceIntensity: 0.15, // Start from current
            });
          }
          
          // Only change material when scan actually starts (progress > 0.02 to avoid flicker)
          if (progress > 0.02 && mesh.material !== mesh.userData.scanMaterial) {
            mesh.material = mesh.userData.scanMaterial;
          }
          
          if (mesh.material.uniforms) {
            const scanProgress = progress / 0.5;
            
            // Premium multi-frequency pulse
            const time = scanProgress * Math.PI * 4;
            const pulse1 = Math.sin(time) * 0.5 + 0.5;
            const pulse2 = Math.sin(time * 1.7) * 0.5 + 0.5;
            const pulse3 = Math.cos(time * 0.8) * 0.5 + 0.5;
            const combinedPulse = (pulse1 * 0.5 + pulse2 * 0.3 + pulse3 * 0.2);
            
            // Wave effect intensity
            const waveBoost = waveIntensity * 0.4;
            
            // Smooth transition from current X-ray to scan color
            const scanColorVec = new THREE.Color(scanColor);
            const brightScanHex = scanColorVec.clone().multiplyScalar(1.3);
            const darkScanHex = scanColorVec.clone().multiplyScalar(0.5);
            const currentColor = new THREE.Color(targetXrayColor);
            
            // Lerp base color from current to scan color
            const lerpedBaseColor = currentColor.clone().lerp(darkScanHex, scanProgress);
            mesh.material.uniforms.baseColor.value.copy(lerpedBaseColor);
            
            // Lerp rim color from current to bright scan color
            const currentRimColor = new THREE.Color(targetXrayColor);
            const lerpedRimColor = currentRimColor.clone().lerp(brightScanHex, scanProgress);
            mesh.material.uniforms.rimColor.value.copy(lerpedRimColor);
            
            // Dynamic rim intensity with wave (transition from current to high)
            const targetRimIntensity = 1.0 + (combinedPulse * 0.4) + waveBoost;
            mesh.material.uniforms.rimIntensity.value = THREE.MathUtils.lerp(currentRimIntensity, targetRimIntensity, scanProgress);
            
            // Breathing opacity (transition from current)
            const targetOpacity = 0.9 + (combinedPulse * 0.08) + (waveBoost * 0.1);
            mesh.material.uniforms.opacity.value = THREE.MathUtils.lerp(currentOpacity, targetOpacity, scanProgress);
            
            // Enhanced edge glow (transition from current)
            const targetEdgeIntensity = 0.6 + (combinedPulse * 0.2) + (waveBoost * 0.15);
            mesh.material.uniforms.edgeIntensity.value = THREE.MathUtils.lerp(0.2, targetEdgeIntensity, scanProgress);
            
            // Subsurface pulse (transition from current)
            const targetSubsurfaceIntensity = 0.45 + (combinedPulse * 0.15) + (waveBoost * 0.1);
            const lerpedSubsurfaceColor = currentColor.clone().lerp(scanColorVec, scanProgress);
            mesh.material.uniforms.subsurfaceColor.value.copy(lerpedSubsurfaceColor);
            mesh.material.uniforms.subsurfaceIntensity.value = THREE.MathUtils.lerp(0.15, targetSubsurfaceIntensity, scanProgress);
            
            mesh.material.needsUpdate = true;
          }
        }
        // Phase 2: Smooth transition to X-ray (50-100%)
        else if (progress < 1.0) {
          meshData.state = 'transitioning';
          activeMeshes++;

          const transitionProgress = (progress - 0.5) / 0.5;
          // Premium easing: smooth exponential curve
          const easeOut = 1 - Math.pow(1 - transitionProgress, 2.2);

          if (mesh.material.uniforms) {
            // Start from bright scan color
            const brightScanColor = new THREE.Color(scanColor).multiplyScalar(0.9);
            const xrayColorVec = new THREE.Color(targetXrayColor);
            const lerpedColor = brightScanColor.clone().lerp(xrayColorVec, easeOut);
            mesh.material.uniforms.baseColor.value.copy(lerpedColor);

            const rimColor = isAntenna ? 0x8A9AAC :
                           isBigLens ? 0x7A8A8A :
                           isShellPiece ? 0x7A8590 :
                           0x6A7580;
            
            // Smooth rim color transition
            const scanRimColor = new THREE.Color(scanColor).multiplyScalar(1.2);
            const xrayRimColor = new THREE.Color(rimColor);
            const lerpedRimColor = scanRimColor.clone().lerp(xrayRimColor, easeOut);
            mesh.material.uniforms.rimColor.value.copy(lerpedRimColor);

            // Smooth opacity transition
            mesh.material.uniforms.opacity.value = THREE.MathUtils.lerp(0.98, finalOpacity, easeOut);
            
            // Gradual rim fade
            mesh.material.uniforms.rimIntensity.value = THREE.MathUtils.lerp(1.1, 0.25, easeOut);
            
            // Smooth edge fade
            mesh.material.uniforms.edgeIntensity.value = THREE.MathUtils.lerp(0.7, 0.2, easeOut);

            // Subsurface transition
            const scanSubsurfaceColor = new THREE.Color(scanColor).multiplyScalar(0.8);
            const xraySubsurfaceColor = new THREE.Color(
              isAntenna ? 0x4A5A6C :
              isBigLens ? 0x5A6A6A :
              0x4A5560
            );
            const lerpedSubsurfaceColor = scanSubsurfaceColor.clone().lerp(xraySubsurfaceColor, easeOut);
            mesh.material.uniforms.subsurfaceColor.value.copy(lerpedSubsurfaceColor);
            mesh.material.uniforms.subsurfaceIntensity.value = THREE.MathUtils.lerp(0.5, 0.15, easeOut);
            
            mesh.material.needsUpdate = true;
          }
            
          // Apply final material near end (earlier to ensure completion)
          if (transitionProgress >= 0.88) {
            const rimColor = isAntenna ? 0x8A9AAC :
                           isBigLens ? 0x7A8A8A :
                           isShellPiece ? 0x7A8590 :
                           0x6A7580;
            
            const finalMaterial = createXrayMaterial(targetXrayColor, {
              rimColor: rimColor,
              rimPower: 2.0,
              rimIntensity: 0.25,
              opacity: finalOpacity,
              edgeIntensity: 0.2,
              subsurfaceColor: isAntenna ? 0x4A5A6C :
                               isBigLens ? 0x5A6A6A :
                               0x4A5560,
              subsurfaceIntensity: 0.15,
            });
            mesh.material = finalMaterial;
            mesh.userData.scanned = true;
            meshData.state = 'complete';
            scanStateRef.current.scannedCount++;
          }
        }
        // Complete
        else if (meshData.state !== 'complete') {
          const rimColor = isAntenna ? 0x8A9AAC :
                         isBigLens ? 0x7A8A8A :
                         isShellPiece ? 0x7A8590 :
                         0x6A7580;
          
          const finalMaterial = createXrayMaterial(targetXrayColor, {
            rimColor: rimColor,
            rimPower: 2.0,
            rimIntensity: 0.25,
            opacity: finalOpacity,
            edgeIntensity: 0.2,
            subsurfaceColor: isAntenna ? 0x4A5A6C :
                             isBigLens ? 0x5A6A6A :
                             0x4A5560,
            subsurfaceIntensity: 0.15,
          });
          mesh.material = finalMaterial;
          mesh.userData.scanned = true;
          meshData.state = 'complete';
          scanStateRef.current.scannedCount++;
        }
      });
            
      // Check if all meshes are complete
      if (scanStateRef.current.scannedCount >= scanStateRef.current.totalMeshes) {
        // ✅ Force all meshes to final X-ray material (ensure nothing stays green)
        scanStateRef.current.meshes.forEach((meshData) => {
          const { mesh, targetXrayColor, finalOpacity, isAntenna, isBigLens, isShellPiece } = meshData;
          if (!mesh.material || mesh.userData.isErrorMesh) return;
          
          // Only apply if not already complete or still has scan material
          if (meshData.state !== 'complete' || mesh.userData.scanMaterial) {
            const rimColor = isAntenna ? 0x8A9AAC :
                           isBigLens ? 0x7A8A8A :
                           isShellPiece ? 0x7A8590 :
                           0x6A7580;
            
            const finalMaterial = createXrayMaterial(targetXrayColor, {
              rimColor: rimColor,
              rimPower: 2.0,
              rimIntensity: 0.25,
              opacity: finalOpacity,
              edgeIntensity: 0.2,
              subsurfaceColor: isAntenna ? 0x4A5A6C :
                               isBigLens ? 0x5A6A6A :
                               0x4A5560,
              subsurfaceIntensity: 0.15,
            });
            mesh.material = finalMaterial;
            mesh.userData.scanned = true;
            meshData.state = 'complete';
          }
        });
        
        isScanningRef.current = false;
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
        return;
      }

      // Continue animation
      const hasWaitingMeshes = scanStateRef.current.meshes.some(md => 
        (currentTime - scanStateRef.current.startTime - md.startDelay) < scanStateRef.current.duration
      );

      if (activeMeshes > 0 || hasWaitingMeshes) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isScanningRef.current = false;
      }
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isScanningRef.current = false;
    };
  }, [enabled, meshes.length, scanColor]);

  return null;
}


import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createXrayMaterial } from '../../../utils/viewer3d/materials';

/**
 * Effect to highlight one or more error meshes
 * Uses the same rim lighting effect as ScanEffect but in red
 */
export default function ErrorHighlight({ 
  errorMesh = null, // Single error mesh (legacy)
  errorMeshes = null, // List of error meshes (new)
  allMeshes = [],
  errorColor = '#ff0000',
  enabled = true,
}) {
  const animationFrameRefs = useRef(new Map()); // Map of mesh UUID -> animation frame ID
  useEffect(() => {
    // Determine the list of error meshes
    const errorMeshesList = errorMeshes || (errorMesh ? [errorMesh] : []);
    
    if (!enabled) {
      return;
    }
    
    if (errorMeshesList.length === 0) {
      return;
    }
    
    if (allMeshes.length === 0) {
      return;
    }

    // ✅ IMPORTANT: Find matching meshes in allMeshes by UUID (in case references don't match)
    const errorMeshUuids = new Set(errorMeshesList.map(m => m.uuid));
    const matchingErrorMeshes = allMeshes.filter(mesh => errorMeshUuids.has(mesh.uuid));
    if (matchingErrorMeshes.length === 0 && errorMeshesList.length > 0) {
      console.warn('⚠️ No matching meshes found by UUID! Error meshes:', errorMeshesList.map(m => ({ name: m.name, uuid: m.uuid })));
      console.warn('⚠️ First few allMeshes UUIDs:', allMeshes.slice(0, 5).map(m => ({ name: m.name, uuid: m.uuid })));
    }

    // Save original states of ALL meshes
    const originalStates = new Map();

    // Use matching meshes if found, otherwise use original error meshes
    const finalErrorMeshes = matchingErrorMeshes.length > 0 ? matchingErrorMeshes : errorMeshesList;
    const finalErrorMeshUuids = new Set(finalErrorMeshes.map(m => m.uuid));
    const finalErrorMeshRefs = new Set(finalErrorMeshes);
    let highlightedCount = 0;
    
    allMeshes.forEach((mesh) => {
      if (!mesh.material) {
        console.warn('⚠️ Mesh without material:', mesh.name);
        return;
      }
      
      // Check if material has required properties
      const hasEmissive = mesh.material.emissive !== undefined;
      
      // Save complete material state for restoration
      originalStates.set(mesh, {
        material: mesh.material, // Save reference to original material
        color: mesh.material.color ? mesh.material.color.getHex() : null,
        emissive: hasEmissive ? mesh.material.emissive.getHex() : null,
        emissiveIntensity: mesh.material.emissiveIntensity,
        transparent: mesh.material.transparent,
        opacity: mesh.material.opacity,
        depthWrite: mesh.material.depthWrite,
        side: mesh.material.side,
        gradientMap: mesh.material.gradientMap,
        renderOrder: mesh.renderOrder, // Save render order
      });

      // Check if this mesh is an error mesh (by reference OR by UUID)
      const isErrorMesh = finalErrorMeshRefs.has(mesh) || finalErrorMeshes.includes(mesh) || finalErrorMeshUuids.has(mesh.uuid);
      
      if (isErrorMesh) {
        // ✅ ERROR MESH: Red rim lighting effect (same style as scan effect)
        highlightedCount++;
        mesh.userData.isErrorMesh = true;
        
        // ✅ Render error mesh FIRST (highest renderOrder) so it appears in front
        mesh.renderOrder = 1000; // Very high render order to render first
        
        // Create red X-ray material with rim lighting (similar to scan effect)
        // Use brighter red for better visibility
        const brightRed = new THREE.Color('#ff3333'); // Brighter red than default #ff0000
        const errorColorHex = brightRed.getHex();
        const darkRedHex = brightRed.multiplyScalar(0.8).getHex(); // Slightly darker base
        
        // Create error material with rim lighting (full opacity + strong rim for contour effect)
        const errorMaterial = createXrayMaterial(darkRedHex, {
          rimColor: errorColorHex, // Bright red rim (acts as contour)
          rimPower: 2.5, // More pronounced rim for better contour visibility
          rimIntensity: 1.5, // Very strong rim intensity for visible red contour
          opacity: 1.0, // Full opacity
          edgeIntensity: 0.8, // More visible edges
          subsurfaceColor: darkRedHex,
          subsurfaceIntensity: 0.5,
          depthWrite: true, // ✅ Write to depth buffer for proper z-ordering
          transparent: false, // ✅ Fully opaque for better visibility
        });
        
        // ✅ Ensure material properties for proper rendering and z-index
        errorMaterial.depthTest = true; // Test depth for proper occlusion
        
        mesh.material = errorMaterial;
        mesh.material.needsUpdate = true;
        
        // ✅ Force update matrices to ensure renderOrder takes effect
        mesh.updateMatrix();
        mesh.updateMatrixWorld(true);
        
        // Wait a frame to ensure material is applied before starting animation
        requestAnimationFrame(() => {
          // Start pulsating animation for this specific mesh
          const startTime = Date.now();
          const meshUuid = mesh.uuid;
          
          const animate = () => {
            if (!mesh.material || !mesh.material.uniforms || !mesh.userData.isErrorMesh) {
              console.warn('⚠️ Animation stopped for mesh:', mesh.name, {
                hasMaterial: !!mesh.material,
                hasUniforms: !!mesh.material?.uniforms,
                isErrorMesh: mesh.userData.isErrorMesh
              });
              // Stop animation if mesh is no longer in error state
              if (animationFrameRefs.current.has(meshUuid)) {
                cancelAnimationFrame(animationFrameRefs.current.get(meshUuid));
                animationFrameRefs.current.delete(meshUuid);
              }
              return;
            }
            
            // ✅ Ensure material stays red (reapply if needed)
            if (mesh.material.uniforms.baseColor && mesh.material.uniforms.baseColor.value.getHex() !== darkRedHex) {
              mesh.material.uniforms.baseColor.value.setHex(darkRedHex);
            }
            if (mesh.material.uniforms.rimColor && mesh.material.uniforms.rimColor.value.getHex() !== errorColorHex) {
              mesh.material.uniforms.rimColor.value.setHex(errorColorHex);
            }
            
            const elapsed = Date.now() - startTime;
            const pulse = Math.sin(elapsed / 500) * 0.3 + 0.7; // Pulse between 0.4 and 1.0
            
            // Pulse rim intensity (keep it strong for visible contour)
            if (mesh.material.uniforms.rimIntensity) {
              mesh.material.uniforms.rimIntensity.value = 1.0 + (pulse * 0.3); // 1.0 -> 1.3 -> 1.0 (strong red contour)
            }
            if (mesh.material.uniforms.opacity) {
              mesh.material.uniforms.opacity.value = 0.95 + (pulse * 0.05); // Slight opacity variation (almost full opacity)
            }
            mesh.material.needsUpdate = true;
            
            // Continue animation
            const frameId = requestAnimationFrame(animate);
            animationFrameRefs.current.set(meshUuid, frameId);
          };
          
          // Start animation
          const frameId = requestAnimationFrame(animate);
          animationFrameRefs.current.set(meshUuid, frameId);
        });
      } else {
        // ⚪ OTHER MESHES: Very transparent (almost invisible)
        mesh.material.transparent = true;
        mesh.material.opacity = 0.05;
        mesh.material.depthWrite = false;
        mesh.material.side = THREE.DoubleSide;
        if (hasEmissive) {
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }
      
      mesh.material.needsUpdate = true;
    });

    // Cleanup: restore original states of ALL meshes
    return () => {
      // Cancel all animations
      animationFrameRefs.current.forEach((frameId) => {
        cancelAnimationFrame(frameId);
      });
      animationFrameRefs.current.clear();
      
      allMeshes.forEach((mesh) => {
        // Stop animation for error meshes
        if (mesh.userData.isErrorMesh) {
          mesh.userData.isErrorMesh = false;
        }
        
        const state = originalStates.get(mesh);
        if (state && mesh.material) {
          // Restore original material if it was saved
          if (state.material && state.material !== mesh.material) {
            mesh.material = state.material;
          } else {
            // Otherwise restore properties
            if (state.color !== null && mesh.material.color) {
              mesh.material.color.setHex(state.color);
            }
            if (state.emissive !== null && mesh.material.emissive) {
              mesh.material.emissive.setHex(state.emissive);
              mesh.material.emissiveIntensity = state.emissiveIntensity;
            }
            mesh.material.transparent = state.transparent;
            mesh.material.opacity = state.opacity;
            mesh.material.depthWrite = state.depthWrite;
            mesh.material.side = state.side;
            mesh.material.gradientMap = state.gradientMap;
          }
          // Restore render order
          if (state.renderOrder !== undefined) {
            mesh.renderOrder = state.renderOrder;
          }
          mesh.material.needsUpdate = true;
        }
      });
    };
  }, [enabled, errorMesh, errorMeshes, allMeshes, errorColor]);

  return null; // No visual rendering, just logic
}


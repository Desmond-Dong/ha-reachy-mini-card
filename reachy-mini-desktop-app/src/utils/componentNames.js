/**
 * Generates readable names for robot components
 * Based on position and mesh characteristics
 */

const COMPONENT_NAMES = [
  'XL330 Motor',
  'Position Sensor',
  'Electronic Board',
  'Stewart Module',
  'Servo Motor',
  'Torque Sensor',
  'Left Antenna',
  'Right Antenna',
  'Camera Mount',
  'Main Lens',
  'Audio System',
  'Electronic Interface',
  'Control Module',
  'IMU Sensor',
  'Mechanical Support',
  'Encoder',
  'Connector',
  'Power Module',
  'Printed Circuit',
  'Regulator',
];

/**
 * Generates a readable name for a component
 * @param {THREE.Mesh} mesh - The mesh to name
 * @param {number} index - Index of the mesh in the list
 * @param {number} total - Total number of meshes
 * @returns {string} Readable component name
 */
export function getComponentName(mesh, index, total) {
  // Use a name from the list based on index
  // With modulo to avoid exceeding
  const nameIndex = index % COMPONENT_NAMES.length;
  return COMPONENT_NAMES[nameIndex];
}

/**
 * Determines the group/component of a mesh based on its real name
 * Same logic as ScanAnnotations.jsx for consistency
 */
function getComponentGroup(mesh) {
  if (!mesh) return null;
  
  const meshName = (mesh.name || '').toLowerCase();
  const materialName = (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase();
  
  // Check userData first (more reliable)
  if (mesh.userData?.isAntenna) {
    return 'ANTENNA';
  }
  
  // Check lenses by material
  if (materialName.includes('big_lens') || materialName.includes('lens_d40')) {
    return 'OPTICAL LENS';
  }
  if (materialName.includes('small_lens') || materialName.includes('lens_d30')) {
    return 'CAMERA LENS';
  }
  
  // Traverse hierarchy to find parent group
  let currentParent = mesh.parent;
  let depth = 0;
  while (currentParent && depth < 5) {
    const pName = (currentParent.name || '').toLowerCase();
    
    // Main groups based on URDF link names
    if (pName.includes('xl_330') || pName.includes('camera') || meshName.includes('xl_330') || meshName.includes('camera')) {
      return 'CAMERA MODULE';
    }
    if (pName.includes('head') || pName.includes('stewart') || meshName.includes('head') || meshName.includes('stewart')) {
      return 'HEAD ASSEMBLY';
    }
    if (pName.includes('arm') || pName.includes('shoulder') || meshName.includes('arm') || meshName.includes('shoulder')) {
      return 'ARM JOINT';
    }
    if (pName.includes('base') || pName.includes('body') || pName.includes('yaw_body') || meshName.includes('base') || meshName.includes('body')) {
      return 'BASE UNIT';
    }
    
    currentParent = currentParent.parent;
    depth++;
  }
  
  return null;
}

/**
 * Generates a short name for quick display based on actual mesh name
 * Now uses the same groups as ScanAnnotations for consistency
 */
export function getShortComponentName(mesh, index, total) {
  if (!mesh) {
    console.warn(`⚠️ No mesh provided for index ${index}`);
    return getGenericName(index);
  }
  
  // ✅ Use the same grouping logic as ScanAnnotations
  const componentGroup = getComponentGroup(mesh);
  if (componentGroup) {
    return componentGroup;
  }
  
  // Fallback: search for name in parent hierarchy (URDF link)
  let name = mesh.name;
  let currentParent = mesh.parent;
  let depth = 0;
  
  // Traverse up to 3 levels in hierarchy to find a name
  while ((!name || name === '') && currentParent && depth < 3) {
    name = currentParent.name;
    currentParent = currentParent.parent;
    depth++;
  }
  
  // If still no name, use a generic name based on index
  if (!name || name === '' || name.match(/^[0-9a-f]{8}-/i)) {
    // If it's a UUID, use generic name
    return getGenericName(index);
  }
  
  // Clean the name
  name = name
    .replace(/_visual.*$/, '') // Remove _visual_0, _visual_1, etc.
    .replace(/_collision.*$/, '') // Remove _collision
    .replace(/_\d+$/, '') // Remove trailing numbers
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
  
  // If the name is too long, shorten it
  if (name.length > 25) {
    // Take the first 3 words
    const words = name.split(' ');
    name = words.slice(0, 3).join(' ');
  }
  
  return name || getGenericName(index);
}

/**
 * Generates a generic name based on index
 * Nicer than "Component 1"
 */
function getGenericName(index) {
  const categories = [
    'Motor',
    'Sensor',
    'Module',
    'Interface',
    'Support',
    'Circuit',
    'Mount',
    'Frame',
  ];
  
  const categoryIndex = (index - 1) % categories.length;
  const number = Math.floor((index - 1) / categories.length) + 1;
  
  return `${categories[categoryIndex]} ${number}`;
}


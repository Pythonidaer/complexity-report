import { getBaseFunctionName } from '../function-extraction/index.js';

/**
 * Checks if a function name has a callback/nested suffix
 * (e.g., "functionA (useEffect)" or "functionA → useEffect")
 * This is used to identify functions that should be deduplicated
 * @param {string} functionName - Function name to check
 * @returns {boolean} True if the name has a callback suffix
 */
function hasCallbackSuffix(functionName) {
  if (!functionName) return false;
  return /\s*\([^)]+\)\s*$/.test(functionName) || /\s*→\s*[^→]+$/.test(functionName);
}

/**
 * Finds the immediate parent function for a callback using function boundaries
 * @param {Object} func - Function object
 * @param {Map} functionBoundaries - Map of function boundaries (file-specific)
 * @param {Array} fileFunctions - Functions in the same file
 * @returns {Object|null} Parent function or null
 */
function findImmediateParentFunction(func, functionBoundaries, fileFunctions) {
  const funcBoundary = functionBoundaries.get(func.line);
  if (!funcBoundary) {
    return null;
  }
  
  // Find all functions that contain this function (only within the same file)
  const containingFunctions = Array.from(functionBoundaries.entries())
    .filter(([fl, boundary]) => {
      if (fl === func.line) return false;
      // Function must be in the same file
      const funcObj = fileFunctions.find(f => f.line === fl);
      if (!funcObj) return false;
      // Function must contain this callback
      return boundary.start < funcBoundary.start && boundary.end > funcBoundary.end;
    });
  
  if (containingFunctions.length === 0) {
    return null;
  }
  
  // Find the smallest containing function (immediate parent)
  // Sort by size (end - start) ascending, then by start descending
  containingFunctions.sort((a, b) => {
    const sizeA = a[1].end - a[1].start;
    const sizeB = b[1].end - b[1].start;
    if (sizeA !== sizeB) {
      // Smaller size first (more immediate parent)
      return sizeA - sizeB;
    }
    // If same size, prefer later start (more nested)
    return b[1].start - a[1].start;
  });
  
  // Get the immediate parent (smallest containing function)
  const immediateParentLine = containingFunctions[0][0];
  return fileFunctions.find(f => f.line === immediateParentLine) || null;
}

/**
 * Returns the rightmost/leaf segment of a display name.
 * Framework-agnostic - matches function-hierarchy.js logic.
 * @param {string} displayName - Full or hierarchical display name
 * @returns {string} Leaf segment: last parenthetical content or whole
 */
function getLeafName(displayName) {
  if (!displayName || typeof displayName !== 'string') return displayName || '';
  const match = displayName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : displayName;
}

/**
 * Checks if a name is valid for use in hierarchical display (not a placeholder).
 * @param {string} name - Leaf or base name
 * @returns {boolean} True if valid
 */
function isValidNameForHierarchy(name) {
  return name && name !== 'unknown' && name !== 'anonymous';
}

/**
 * Builds a full hierarchical function name by recursively finding parents
 * Uses file-specific boundaries (like HTML report) for accurate detection
 * @param {Object} func - Function object
 * @param {Map} fileBoundaries - Map of function boundaries for this file
 * @param {Array} fileFunctions - All functions in the same file
 * @param {Set} visited - Set to track visited (prevents infinite loops)
 * @returns {string} Full hierarchical name
 */
export function buildHierarchicalFunctionName(
  func,
  fileBoundaries,
  fileFunctions,
  visited = new Set()
) {
  let displayName = func.functionName || 'unknown';
  
  // Prevent infinite loops
  const funcKey = `${func.file}:${func.line}`;
  if (visited.has(funcKey)) {
    return displayName;
  }
  visited.add(funcKey);
  
  if (!fileBoundaries || !fileFunctions) {
    return displayName;
  }
  
  // Find the actual immediate parent using boundaries
  // (regardless of what the name says)
  const immediateParentFunc = findImmediateParentFunction(
    func,
    fileBoundaries,
    fileFunctions
  );
  
  if (!immediateParentFunc) {
    // No parent found, return name as-is
    return displayName;
  }
  
  const parentHierarchicalName = buildHierarchicalFunctionName(
    immediateParentFunc,
    fileBoundaries,
    fileFunctions,
    new Set(visited)
  );

  const parentBaseName = getBaseFunctionName(parentHierarchicalName);
  if (!isValidNameForHierarchy(parentBaseName)) {
    return displayName;
  }

  // Framework-agnostic: use whatever extraction gave us
  // (method, hook, handler, variable name).
  const leafName = getLeafName(displayName);
  if (isValidNameForHierarchy(leafName)) {
    return `${parentHierarchicalName} → ${leafName}`;
  }

  return displayName;
}

/**
 * Checks if a function is nested within another function
 * @param {Object} func - Function to check
 * @param {Object} funcBoundary - Function's boundary
 * @param {Array} allFunctions - All functions array
 * @param {Map} functionBoundaries - Map of function boundaries
 * @returns {boolean} True if function is nested
 */
function isFunctionNested(func, funcBoundary, allFunctions, functionBoundaries) {
  for (const otherFunc of allFunctions) {
    if (otherFunc.line === func.line) continue;
    
    // Only check nesting within the same file
    if (otherFunc.file !== func.file) continue;
    
    const otherBoundary = functionBoundaries.get(otherFunc.line);
    if (!otherBoundary) continue;
    
    // If otherFunc contains this func, it's nested
    // Use strict < and > to ensure it's actually nested (not overlapping)
    if (
      otherBoundary.start < funcBoundary.start &&
      otherBoundary.end > funcBoundary.end
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a function to top-level list with deduplication (no boundary case)
 * @param {Object} func - Function object
 * @param {string} functionName - Function name
 * @param {Array} topLevel - Top-level functions array
 * @param {Set} seenBaseNames - Set of seen base names
 */
function addTopLevelFunctionNoBoundary(func, functionName, topLevel, seenBaseNames) {
  const baseName = getBaseFunctionName(functionName);
  const key = `${func.file}:${baseName}`;
  
  // Only deduplicate if this function has a callback suffix
  // Standalone names like "useCallback callback" or "anonymous" don't have suffixes
  if (hasCallbackSuffix(functionName)) {
    // This is a callback variant - only include if we haven't seen the base name
    if (!seenBaseNames.has(key)) {
      seenBaseNames.add(key);
      // Create a new function object with the base name for display
      topLevel.push({
        ...func,
        functionName: baseName,
      });
    }
  } else {
    // Standalone name - deduplicate by exact name + file to avoid duplicates
    const exactKey = `${func.file}:${functionName}`;
    if (!seenBaseNames.has(exactKey)) {
      seenBaseNames.add(exactKey);
      // Also mark the base name as seen to prevent callback variants from being added
      seenBaseNames.add(key);
      topLevel.push(func);
    }
  }
}

/**
 * Adds a function to top-level list with deduplication (has boundary case)
 * @param {Object} func - Function object
 * @param {string} functionName - Function name
 * @param {Array} topLevel - Top-level functions array
 * @param {Set} seenBaseNames - Set of seen base names
 */
function addTopLevelFunctionWithBoundary(func, functionName, topLevel, seenBaseNames) {
  const baseName = getBaseFunctionName(functionName);
  const key = `${func.file}:${baseName}`;
  
  // Only deduplicate if this function has a callback suffix
  if (hasCallbackSuffix(functionName)) {
    // This is a callback variant - only include if we haven't seen the base name
    if (!seenBaseNames.has(key)) {
      seenBaseNames.add(key);
      // Create a new function object with the base name for display
      topLevel.push({
        ...func,
        functionName: baseName,
      });
    }
  } else {
    // Standalone name or base function - deduplicate by exact name + file
    const exactKey = `${func.file}:${functionName}`;
    if (!seenBaseNames.has(exactKey)) {
      seenBaseNames.add(exactKey);
      // Also mark the base name as seen to prevent callback variants from being added
      seenBaseNames.add(key);
      topLevel.push(func);
    }
  }
}

/**
 * Gets top-level functions only (no nested functions)
 * Deduplicates by base function name so "functionA" and
 * "functionA (useEffect callback)" only show "functionA" once.
 * Standalone names like "useCallback callback" and "anonymous"
 * are kept as-is.
 * @param {Array} allFunctions - All functions array
 * @param {Map} functionBoundaries - Map of function boundaries
 * @returns {Array} Top-level functions only, deduplicated
 */
export function getTopLevelFunctions(allFunctions, functionBoundaries) {
  const topLevel = [];
  // Track seen base names to deduplicate
  const seenBaseNames = new Set();
  
  for (const func of allFunctions) {
    const functionName = func.functionName || 'unknown';
    const funcBoundary = functionBoundaries.get(func.line);
    
    // If no boundary found, assume top-level (boundary detection failed)
    if (!funcBoundary) {
      addTopLevelFunctionNoBoundary(func, functionName, topLevel, seenBaseNames);
      continue;
    }
    
    // Check if this function is contained by any other function
    const isNested = isFunctionNested(
      func,
      funcBoundary,
      allFunctions,
      functionBoundaries
    );
    
    if (!isNested) {
      addTopLevelFunctionWithBoundary(func, functionName, topLevel, seenBaseNames);
    }
  }
  
  return topLevel;
}

/**
 * Groups functions by folder/file structure
 * @param {Array} functions - Functions to group
 * @param {Function} getDirectory - Function to get directory from file path
 * @returns {Map} Map of directory -> file -> functions
 */
export function groupFunctionsByFolder(functions, getDirectory) {
  const folderMap = new Map();
  
  for (const func of functions) {
    const dir = getDirectory(func.file);
    if (!folderMap.has(dir)) {
      folderMap.set(dir, new Map());
    }
    
    const fileMap = folderMap.get(dir);
    if (!fileMap.has(func.file)) {
      fileMap.set(func.file, []);
    }
    
    fileMap.get(func.file).push(func);
  }
  
  return folderMap;
}

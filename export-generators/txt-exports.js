import { buildHierarchicalFunctionName, groupFunctionsByFolder } from './helpers.js';
import { getDirectory } from '../function-extraction/index.js';

/**
 * Generates TXT export for all functions including callbacks (alphabetically)
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map of line -> boundary
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} TXT string
 */
export function generateAllFunctionsTXT(
  allFunctions,
  fileBoundariesMap,
  fileToFunctions
) {
  // Build hierarchical names for all functions using file-specific boundaries
  const functionsWithHierarchy = allFunctions.map(func => {
    const fileBoundaries = fileBoundariesMap.get(func.file) || new Map();
    const fileFunctions = fileToFunctions.get(func.file) || [];
    return {
      ...func,
      hierarchicalName: buildHierarchicalFunctionName(
        func,
        fileBoundaries,
        fileFunctions
      ),
    };
  });
  
  // Sort alphabetically by hierarchical name
  functionsWithHierarchy.sort((a, b) => {
    const nameA = (a.hierarchicalName || 'unknown').toLowerCase();
    const nameB = (b.hierarchicalName || 'unknown').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  const lines = [
    'All Functions Including Callbacks (Alphabetical)',
    '=================================================',
    '',
    `Total: ${functionsWithHierarchy.length} functions`,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...functionsWithHierarchy.map(func => func.hierarchicalName),
  ];
  
  return lines.join('\n');
}

/**
 * Returns the leaf (innermost) part of a hierarchical name.
 * e.g. "AgencyLogosComponent → useEffect → map" → "map"; "TopLevel" → "TopLevel"
 * @param {string} hierarchicalName - Full name possibly with " → " segments
 * @returns {string}
 */
function getLeafNameFromHierarchy(hierarchicalName) {
  if (!hierarchicalName || typeof hierarchicalName !== 'string') {
    return hierarchicalName || '';
  }
  const idx = hierarchicalName.lastIndexOf(' → ');
  return idx === -1
    ? hierarchicalName.trim()
    : hierarchicalName.slice(idx + 3).trim();
}

/**
 * Generates TXT export for all functions with leaf names only
 * (e.g. "map" instead of "Component → map")
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} TXT string
 */
export function generateAllFunctionsLeafOnlyTXT(
  allFunctions,
  fileBoundariesMap,
  fileToFunctions
) {
  const functionsWithHierarchy = allFunctions.map(func => {
    const fileBoundaries = fileBoundariesMap.get(func.file) || new Map();
    const fileFunctions = fileToFunctions.get(func.file) || [];
    return {
      ...func,
      hierarchicalName: buildHierarchicalFunctionName(
        func,
        fileBoundaries,
        fileFunctions
      ),
    };
  });
  functionsWithHierarchy.sort((a, b) => {
    const leafA = getLeafNameFromHierarchy(
      a.hierarchicalName || 'unknown'
    ).toLowerCase();
    const leafB = getLeafNameFromHierarchy(
      b.hierarchicalName || 'unknown'
    ).toLowerCase();
    return leafA.localeCompare(leafB);
  });
  const lines = [
    'All Functions — Leaf Names Only (Alphabetical)',
    '==============================================',
    '',
    `Total: ${functionsWithHierarchy.length} functions`,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...functionsWithHierarchy.map((func) =>
      getLeafNameFromHierarchy(func.hierarchicalName)
    ),
  ];
  return lines.join('\n');
}

/**
 * Generates TXT export for functions organized by folder/file
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map of line -> boundary
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} TXT string
 */
export function generateFunctionsByFolderTXT(
  allFunctions,
  fileBoundariesMap,
  fileToFunctions
) {
  const folderMap = groupFunctionsByFolder(allFunctions, getDirectory);
  
  const lines = [
    'Functions by Folder/File',
    '=======================',
    '',
    `Total folders: ${folderMap.size}`,
    `Total functions: ${allFunctions.length}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];
  
  // Sort folders alphabetically
  const sortedFolders = Array.from(folderMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  
  for (const [folder, fileMap] of sortedFolders) {
    lines.push(`\n${folder}/`);
    lines.push('─'.repeat(folder.length + 1));
    
    // Sort files alphabetically
    const sortedFiles = Array.from(fileMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    
    for (const [file, functions] of sortedFiles) {
      const fileName = file.split('/').pop();
      lines.push(`\n  ${fileName}`);
      
      // Get file-specific boundaries and functions
      const fileBoundaries = fileBoundariesMap.get(file) || new Map();
      const fileFunctions = fileToFunctions.get(file) || [];
      
      // Build hierarchical names and sort alphabetically
      const functionsWithHierarchy = functions.map(func => ({
        ...func,
        hierarchicalName: buildHierarchicalFunctionName(
          func,
          fileBoundaries,
          fileFunctions
        ),
      })).sort((a, b) => {
        const nameA = (a.hierarchicalName || 'unknown').toLowerCase();
        const nameB = (b.hierarchicalName || 'unknown').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      for (const func of functionsWithHierarchy) {
        lines.push(`    - ${func.hierarchicalName}`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Generates TXT export for functions by folder/file with leaf names only
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} TXT string
 */
export function generateFunctionsByFolderLeafOnlyTXT(
  allFunctions,
  fileBoundariesMap,
  fileToFunctions
) {
  const folderMap = groupFunctionsByFolder(allFunctions, getDirectory);
  const lines = [
    'Functions by Folder/File — Leaf Names Only',
    '============================================',
    '',
    `Total folders: ${folderMap.size}`,
    `Total functions: ${allFunctions.length}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];
  const sortedFolders = Array.from(folderMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  for (const [folder, fileMap] of sortedFolders) {
    lines.push(`\n${folder}/`);
    lines.push('─'.repeat(folder.length + 1));
    const sortedFiles = Array.from(fileMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [file, functions] of sortedFiles) {
      const fileName = file.split('/').pop();
      lines.push(`\n  ${fileName}`);
      const fileBoundaries = fileBoundariesMap.get(file) || new Map();
      const fileFunctions = fileToFunctions.get(file) || [];
      const functionsWithHierarchy = functions.map(func => ({
        ...func,
        hierarchicalName: buildHierarchicalFunctionName(
          func,
          fileBoundaries,
          fileFunctions
        ),
      })).sort((a, b) => {
        const leafA = getLeafNameFromHierarchy(
          a.hierarchicalName || 'unknown'
        ).toLowerCase();
        const leafB = getLeafNameFromHierarchy(
          b.hierarchicalName || 'unknown'
        ).toLowerCase();
        return leafA.localeCompare(leafB);
      });
      for (const func of functionsWithHierarchy) {
        lines.push(`    - ${getLeafNameFromHierarchy(func.hierarchicalName)}`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Generates TXT export of all file names (paths) in alphabetical order
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} TXT string
 */
export function generateFileNamesAlphabeticalTXT(fileToFunctions) {
  const sortedFiles = Array.from(fileToFunctions.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  const lines = [
    'File Names (Alphabetical)',
    '=========================',
    '',
    `Total files: ${sortedFiles.length}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...sortedFiles,
  ];
  return lines.join('\n');
}

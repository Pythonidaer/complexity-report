import { buildHierarchicalFunctionName, groupFunctionsByFolder } from './helpers.js';
import { getDirectory } from '../function-extraction/index.js';

/**
 * Generates Markdown export for all functions including callbacks (alphabetically)
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map of line -> boundary
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} Markdown string
 */
export function generateAllFunctionsMD(
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
  
  const tableRows = functionsWithHierarchy.map(func => {
    const name = (func.hierarchicalName || '').replace(/\|/g, '&#124;');
    const complexity = parseInt(func.complexity, 10);
    const location = `${func.file}:${func.line}`;
    return `| ${name} | ${complexity} | ${location} |`;
  });
  
  const lines = [
    '# All Functions Including Callbacks',
    '',
    `**Total:** ${functionsWithHierarchy.length} functions`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Functions (Alphabetical)',
    '',
    '| Function | Complexity | Location |',
    '| --- | --- | --- |',
    ...tableRows,
    '',
  ];
  
  return lines.join('\n');
}

/**
 * Generates Markdown export for functions organized by folder/file
 * @param {Array} allFunctions - All functions array
 * @param {Map} fileBoundariesMap - Map of filePath -> Map of line -> boundary
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} Markdown string
 */
export function generateFunctionsByFolderMD(
  allFunctions,
  fileBoundariesMap,
  fileToFunctions
) {
  const folderMap = groupFunctionsByFolder(allFunctions, getDirectory);
  
  const lines = [
    '# Functions by Folder/File',
    '',
    `**Total folders:** ${folderMap.size}`,
    `**Total functions:** ${allFunctions.length}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Structure',
    '',
  ];
  
  // Sort folders alphabetically
  const sortedFolders = Array.from(folderMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  for (const [folder, fileMap] of sortedFolders) {
    const folderDisplay = folder || '(root)';
    lines.push(`### ${folderDisplay}/`);
    lines.push('');
    
    // Sort files alphabetically
    const sortedFiles = Array.from(fileMap.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );
    
    for (const [file, functions] of sortedFiles) {
      const fileName = file.split('/').pop();
      lines.push(`#### \`${fileName}\``);
      lines.push('');
      
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
      
      lines.push('| Function | Complexity | Location |');
      lines.push('| --- | --- | --- |');
      for (const func of functionsWithHierarchy) {
        const name = (func.hierarchicalName || '').replace(/\|/g, '&#124;');
        const complexity = parseInt(func.complexity, 10);
        lines.push(`| ${name} | ${complexity} | line ${func.line} |`);
      }
      lines.push('');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Generates Markdown export of all file names (paths) in alphabetical order
 * @param {Map} fileToFunctions - Map of filePath -> functions array
 * @returns {string} Markdown string
 */
export function generateFileNamesAlphabeticalMD(fileToFunctions) {
  const sortedFiles = Array.from(fileToFunctions.keys()).sort(
    (a, b) => a.localeCompare(b)
  );
  const lines = [
    '# File Names (Alphabetical)',
    '',
    `**Total files:** ${sortedFiles.length}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Files',
    '',
    ...sortedFiles.map(file => `- \`${file.replace(/`/g, '\\`')}\``),
    '',
  ];
  return lines.join('\n');
}

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  generateAllFunctionsTXT,
  generateAllFunctionsLeafOnlyTXT,
  generateFunctionsByFolderTXT,
  generateFunctionsByFolderLeafOnlyTXT,
  generateFileNamesAlphabeticalTXT,
} from './txt-exports.js';
import {
  generateAllFunctionsMD,
  generateFunctionsByFolderMD,
  generateFileNamesAlphabeticalMD,
} from './md-exports.js';
import { findFunctionBoundaries } from '../function-boundaries/index.js';

/**
 * Generates all export files (TXT, MD) for complexity report
 * @param {Array} allFunctions - All functions array
 * @param {string} projectRoot - Project root directory
 * @param {string} exportDir - Directory to write export files to
 * @returns {Object} Object with generated file paths
 */
export function generateAllExports(allFunctions, projectRoot, exportDir) {
  // Create export directory if it doesn't exist
  try {
    mkdirSync(exportDir, { recursive: true });
  } catch {
    // Directory might already exist, ignore
  }
  
  const generatedFiles = [];
  
  // Build file-specific boundaries map (like HTML report does)
  // Map of filePath -> Map of line -> boundary
  const fileBoundariesMap = new Map();
  const fileToFunctions = new Map();
  
  // Group functions by file
  allFunctions.forEach(func => {
    if (!fileToFunctions.has(func.file)) {
      fileToFunctions.set(func.file, []);
    }
    fileToFunctions.get(func.file).push(func);
  });
  
  // Build boundaries for each file
  for (const [filePath, functions] of fileToFunctions.entries()) {
    const fullPath = resolve(projectRoot, filePath);
    if (!existsSync(fullPath)) continue;
    
    try {
      const sourceCode = readFileSync(fullPath, 'utf-8');
      const boundaries = findFunctionBoundaries(sourceCode, functions);
      fileBoundariesMap.set(filePath, boundaries);
    } catch (error) {
      console.warn(`Warning: Could not process ${filePath} for export boundaries:`, error.message);
      // Create empty boundaries map for this file
      fileBoundariesMap.set(filePath, new Map());
    }
  }
  
  // Generate all functions (including callbacks) exports
  const allFunctionsTXT = generateAllFunctionsTXT(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const allFunctionsTXTPath = resolve(exportDir, 'function-names.all.txt');
  writeFileSync(allFunctionsTXTPath, allFunctionsTXT, 'utf-8');
  generatedFiles.push(allFunctionsTXTPath);
  
  const allFunctionsLeafOnlyTXT = generateAllFunctionsLeafOnlyTXT(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const allFunctionsLeafOnlyTXTPath = resolve(
    exportDir,
    'function-names.all-leaf.txt'
  );
  writeFileSync(
    allFunctionsLeafOnlyTXTPath,
    allFunctionsLeafOnlyTXT,
    'utf-8'
  );
  generatedFiles.push(allFunctionsLeafOnlyTXTPath);
  
  const allFunctionsMD = generateAllFunctionsMD(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const allFunctionsMDPath = resolve(exportDir, 'function-names.all.md');
  writeFileSync(allFunctionsMDPath, allFunctionsMD, 'utf-8');
  generatedFiles.push(allFunctionsMDPath);
  
  // Generate functions by folder exports
  const byFolderTXT = generateFunctionsByFolderTXT(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const byFolderTXTPath = resolve(exportDir, 'function-names-by-file.txt');
  writeFileSync(byFolderTXTPath, byFolderTXT, 'utf-8');
  generatedFiles.push(byFolderTXTPath);
  
  const byFolderLeafOnlyTXT = generateFunctionsByFolderLeafOnlyTXT(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const byFolderLeafOnlyTXTPath = resolve(
    exportDir,
    'function-names-by-file-leaf.txt'
  );
  writeFileSync(byFolderLeafOnlyTXTPath, byFolderLeafOnlyTXT, 'utf-8');
  generatedFiles.push(byFolderLeafOnlyTXTPath);
  
  const byFolderMD = generateFunctionsByFolderMD(
    allFunctions,
    fileBoundariesMap,
    fileToFunctions
  );
  const byFolderMDPath = resolve(exportDir, 'function-names-by-file.md');
  writeFileSync(byFolderMDPath, byFolderMD, 'utf-8');
  generatedFiles.push(byFolderMDPath);
  
  const fileNamesAlphabeticalTXT = generateFileNamesAlphabeticalTXT(fileToFunctions);
  const fileNamesAlphabeticalTXTPath = resolve(exportDir, 'file-names-alphabetical.txt');
  writeFileSync(fileNamesAlphabeticalTXTPath, fileNamesAlphabeticalTXT, 'utf-8');
  generatedFiles.push(fileNamesAlphabeticalTXTPath);
  
  const fileNamesAlphabeticalMD = generateFileNamesAlphabeticalMD(fileToFunctions);
  const fileNamesAlphabeticalMDPath = resolve(exportDir, 'file-names-alphabetical.md');
  writeFileSync(fileNamesAlphabeticalMDPath, fileNamesAlphabeticalMD, 'utf-8');
  generatedFiles.push(fileNamesAlphabeticalMDPath);
  
  return {
    generatedFiles,
    exportDir,
  };
}

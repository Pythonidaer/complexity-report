/**
 * Utility helpers for file page generation
 */
import { readFileSync, existsSync } from 'fs';

/**
 * Detects language from file extension for syntax highlighting
 * @param {string} filePath - File path
 * @returns {string} Language class for prettify (e.g., 'lang-js', 'lang-ts')
 */
export function detectLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap = {
    'js': 'lang-js',
    'jsx': 'lang-js',
    'ts': 'lang-ts',
    'tsx': 'lang-ts',
    'css': 'lang-css',
    'html': 'lang-html',
    'json': 'lang-json',
    'md': 'lang-md',
    'py': 'lang-py',
    'java': 'lang-java',
    'c': 'lang-c',
    'cpp': 'lang-cpp',
    'cs': 'lang-cs',
    'rb': 'lang-rb',
    'php': 'lang-php',
    'go': 'lang-go',
    'rs': 'lang-rs',
    'sh': 'lang-sh',
    'sql': 'lang-sql',
  };
  return langMap[ext] || 'lang-js';
}

/**
 * Calculates relative path to prettify files based on directory depth
 * @param {string} filePath - Relative file path (e.g., 'src/components/Button.tsx')
 * @returns {string} Relative path to prettify files (e.g., '../../prettify.css')
 */
export function getPrettifyRelativePath(filePath) {
  const fileDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
  if (!fileDir) return '';
  const depth = fileDir.split('/').length;
  return '../'.repeat(depth);
}

/**
 * Returns indent length in character units (tabs expanded to 2 spaces).
 * @param {string} line - Source line
 * @returns {number} Indent in characters
 */
export function getIndentChars(line) {
  const m = line && line.match(/^(\s*)/);
  if (!m) return 0;
  return m[1].replace(/\t/g, '  ').length;
}

/**
 * Reads source file and returns code and lines
 * @param {string} fullPath - Absolute path to file
 * @param {string} filePath - Relative path for error messages
 * @returns {{ sourceCode: string, sourceLines: string[] }}
 */
export function readSourceFile(fullPath, filePath) {
  let sourceCode = '';
  let sourceLines = [];
  try {
    if (existsSync(fullPath)) {
      sourceCode = readFileSync(fullPath, 'utf-8');
      sourceLines = sourceCode.split('\n');
    }
  } catch (error) {
    console.warn(`Warning: Could not read source file ${filePath}:`, error.message);
  }
  return { sourceCode, sourceLines };
}

/**
 * Returns paths for file page assets
 * @param {string} filePath - Relative file path
 * @param {string} fileDir - Directory part of file path
 * @returns {Object} Paths: backLink, folderIndexPath, aboutPath,
 *   prettifyCssPath, prettifyJsPath, sharedCssPath, fileCssPath
 */
export function getFilePagePaths(filePath, fileDir) {
  const depth = fileDir ? fileDir.split('/').length : 0;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const prettifyPath = getPrettifyRelativePath(filePath);
  return {
    backLink: prefix ? `${prefix}index.html` : 'index.html',
    folderIndexPath: fileDir ? 'index.html' : 'index.html',
    aboutPath: prefix ? `${prefix}about.html` : 'about.html',
    prettifyCssPath: prettifyPath ? `${prettifyPath}prettify.css` : 'prettify.css',
    prettifyJsPath: prettifyPath ? `${prettifyPath}prettify.js` : 'prettify.js',
    sharedCssPath: prettifyPath ? `${prettifyPath}shared.css` : 'shared.css',
    fileCssPath: prettifyPath ? `${prettifyPath}file.css` : 'file.css',
  };
}

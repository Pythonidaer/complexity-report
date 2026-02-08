/**
 * Complexity and path utilities.
 */

export function getComplexityLevel(complexity) {
  const num = parseInt(complexity, 10);
  if (num >= 20) return 'low';
  if (num >= 15) return 'medium';
  if (num > 10) return 'high';
  if (num > 6) return 'acceptable';
  return 'good';
}

export function getDirectory(filePath) {
  const parts = filePath.split('/');
  if (parts.length <= 1) return filePath;
  return parts.slice(0, -1).join('/');
}

export function getBaseFunctionName(name) {
  if (!name) return 'unknown';
  let baseName = String(name).trim();
  let prev = '';
  while (prev !== baseName) {
    prev = baseName;
    baseName = baseName.replace(/\s*\([^)]+\)\s*$/g, '').replace(/\s*→\s*[^→]*$/g, '').trim();
  }
  return baseName || 'unknown';
}

#!/usr/bin/env node
/**
 * Automated max-len fixer for remaining ESLint warnings
 * This script applies common patterns to fix line length warnings
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const fixes = [
  // Common patterns that can be safely reformatted
  {
    pattern: /^(\s*)([a-zA-Z_$][\w$]*:\s*\[)([^\]]{80,})(\],?)$/gm,
    replacement: (match, indent, start, content, end) => {
      const items = content.split(',').map(s => s.trim()).filter(Boolean);
      return `${indent}${start}\n${items.map(item => `${indent}  ${item},`).join('\n')}\n${indent}${end}`;
    }
  },
];

const filesToFix = [
  'scripts/export-generators/helpers.js',
  'scripts/export-generators/index.js',
  'scripts/export-generators/md-exports.js',
  'scripts/export-generators/txt-exports.js',
  // Add more as needed
];

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let changed = false;
  
  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  
  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${filePath}`);
  }
}

const projectRoot = resolve(import.meta.dirname, '../..');
for (const file of filesToFix) {
  try {
    fixFile(resolve(projectRoot, file));
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
}

/**
 * AST traversal and parsing utilities for decision-points.
 */

import { parse } from '@typescript-eslint/typescript-estree';

/**
 * Parses source code into an AST
 * @param {string} sourceCode - Source code to parse
 * @param {string} filePath - Path to the file (for parser context)
 * @returns {Object} Parsed AST
 */
export function parseAST(sourceCode, filePath) {
  try {
    const isTSX = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    return parse(sourceCode, {
      sourceType: 'module',
      ecmaVersion: 2020,
      jsx: isTSX,
      filePath: filePath,
      comment: true,
      loc: true,
      range: true,
    });
  } catch (error) {
    console.error(`Error parsing AST for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Checks if a key should be skipped during AST traversal
 * @param {string} key - Key to check
 * @returns {boolean} True if key should be skipped
 */
export function shouldSkipKey(key) {
  return key === 'parent' || key === 'range' || key === 'loc' ||
         key === 'leadingComments' || key === 'trailingComments';
}

/**
 * Processes an array of child nodes
 * @param {Array} array - Array of child nodes
 * @param {string} nodeType - Type of nodes to collect
 * @param {Array} results - Array to collect results
 * @param {Function} collectNodesByType - Collector to call
 */
export function processArrayChildren(array, nodeType, results, collectNodesByType) {
  array.forEach(item => {
    if (item && typeof item === 'object' && item.type) {
      collectNodesByType(item, nodeType, results);
    }
  });
}

/**
 * Processes a single child node
 * @param {Object} child - Child node
 * @param {string} nodeType - Type of nodes to collect
 * @param {Array} results - Array to collect results
 * @param {Function} collectNodesByType - Collector to call
 */
export function processChildNode(child, nodeType, results, collectNodesByType) {
  if (child && typeof child === 'object' && child.type) {
    collectNodesByType(child, nodeType, results);
  }
}

/**
 * Traverses AST and collects all nodes of a specific type
 * @param {Object} node - AST node to traverse
 * @param {string} nodeType - Type of nodes to collect
 * @param {Array} results - Array to collect results
 */
export function collectNodesByType(node, nodeType, results) {
  if (!node || typeof node !== 'object') return;

  if (node.type === nodeType) {
    results.push(node);
  }

  for (const key in node) {
    if (shouldSkipKey(key)) continue;
    const child = node[key];
    if (Array.isArray(child)) {
      processArrayChildren(child, nodeType, results, collectNodesByType);
    } else {
      processChildNode(child, nodeType, results, collectNodesByType);
    }
  }
}

/**
 * Finds all function nodes in the AST
 * @param {Object} ast - ESLint AST
 * @returns {Array} Array of function nodes
 */
export function findAllFunctions(ast) {
  const functions = [];
  const functionTypes = [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
  ];

  functionTypes.forEach(type => {
    collectNodesByType(ast, type, functions);
  });

  return functions;
}

/**
 * Gets the line number for an AST node
 * @param {Object} node - AST node
 * @returns {number} Line number (1-based)
 */
export function getNodeLine(node) {
  if (node.loc && node.loc.start) {
    return node.loc.start.line;
  }
  if (node.range && node.range[0] !== undefined) {
    return 1;
  }
  return 1;
}

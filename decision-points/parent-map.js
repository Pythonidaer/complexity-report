/**
 * Parent map building for AST nodes.
 */

import { shouldSkipKey } from './ast-utils.js';

/**
 * Processes an array of child nodes for parent map building
 * @param {Array} array - Array of child nodes
 * @param {Object} parent - Parent node
 * @param {Map} parentMap - Parent map to update
 * @param {Function} traverse - Traverse function to call recursively
 */
function processArrayChildrenForParentMap(array, parent, parentMap, traverse) {
  array.forEach(item => {
    if (item && typeof item === 'object' && item.type) {
      traverse(item, parent);
    }
  });
}

/**
 * Processes a single child node for parent map building
 * @param {Object} child - Child node
 * @param {Object} parent - Parent node
 * @param {Function} traverse - Traverse function to call recursively
 */
function processChildNodeForParentMap(child, parent, traverse) {
  if (child && typeof child === 'object' && child.type) {
    traverse(child, parent);
  }
}

/**
 * Builds a parent map for AST nodes
 * @param {Object} ast - Root AST node
 * @returns {Map} Map of node to parent node
 */
export function buildParentMap(ast) {
  const parentMap = new Map();

  function traverse(node, parent = null) {
    if (!node || typeof node !== 'object') return;

    if (node.type) {
      parentMap.set(node, parent);
    }

    for (const key in node) {
      if (shouldSkipKey(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        processArrayChildrenForParentMap(child, node, parentMap, traverse);
      } else {
        processChildNodeForParentMap(child, node, traverse);
      }
    }
  }

  traverse(ast);
  return parentMap;
}

/**
 * AST parsing and traversal for function extraction.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from '@typescript-eslint/typescript-estree';

/**
 * Parses source code into AST
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
  } catch {
    return null;
  }
}

export function getNodeLine(node) {
  if (node.loc && node.loc.start) return node.loc.start.line;
  return 1;
}

export function shouldSkipKey(key) {
  return key === 'parent' || key === 'range' || key === 'loc' ||
         key === 'leadingComments' || key === 'trailingComments';
}

function processArrayChildren(array, visit) {
  array.forEach(item => {
    if (item && typeof item === 'object' && item.type) visit(item);
  });
}

function processChildNode(child, visit) {
  if (child && typeof child === 'object' && child.type) visit(child);
}

export function traverseAST(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key in node) {
    if (shouldSkipKey(key)) continue;
    const child = node[key];
    if (Array.isArray(child)) {
      processArrayChildren(child, (item) => traverseAST(item, visit));
    } else {
      processChildNode(child, (item) => traverseAST(item, visit));
    }
  }
}

export function findAllFunctions(ast) {
  const functions = [];
  const functionTypes = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
  ]);
  traverseAST(ast, (node) => {
    if (functionTypes.has(node.type)) functions.push(node);
  });
  return functions;
}

export function findAllNodesByType(ast, nodeType) {
  const results = [];
  traverseAST(ast, (node) => {
    if (node.type === nodeType) results.push(node);
  });
  return results;
}

/**
 * Finds the containing node that wraps a function node
 */
export function findContainingNode(funcNode, candidateNodes) {
  if (!funcNode.range) return null;
  let containingNode = null;
  let smallestSize = Infinity;
  for (const candidate of candidateNodes) {
    if (!candidate.range) continue;
    if (
      candidate.range[0] < funcNode.range[0] &&
      candidate.range[1] > funcNode.range[1]
    ) {
      const size = candidate.range[1] - candidate.range[0];
      if (size < smallestSize) {
        containingNode = candidate;
        smallestSize = size;
      }
    }
  }
  return containingNode;
}

export function readFileIfExists(filePath, projectRoot) {
  const fullPath = resolve(projectRoot, filePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, 'utf-8');
}

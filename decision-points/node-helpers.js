/**
 * Node line/column helpers for decision-points.
 */

import { getNodeLine } from './ast-utils.js';

/**
 * For LogicalExpression (||, &&, ??), returns the line where the operator
 * token lives.
 * @param {Object} node - LogicalExpression AST node
 * @returns {number|null} 1-based line of the operator, or null
 */
export function getLogicalExpressionOperatorLine(node) {
  if (node.type !== 'LogicalExpression' || !node.left || !node.right) return null;
  const leftEnd = node.left.loc && node.left.loc.end;
  if (!leftEnd) return null;
  return leftEnd.line;
}

/**
 * For LogicalExpression, returns the column range of the operator.
 * @param {Object} node - LogicalExpression AST node
 * @returns {{ column: number, endColumn: number }|null} 0-based column range, or null
 */
export function getLogicalExpressionOperatorRange(node) {
  if (node.type !== 'LogicalExpression' || !node.left || !node.right) return null;
  const leftEnd = node.left.loc && node.left.loc.end;
  const rightStart = node.right.loc && node.right.loc.start;
  if (!leftEnd || !rightStart || leftEnd.line !== rightStart.line) return null;
  return {
    column: leftEnd.column,
    endColumn: rightStart.column,
  };
}

/**
 * Gets the column range for an AST node (for within-line highlighting).
 * For multi-line nodes, returns only the range on the start line.
 * @param {Object} node - AST node
 * @returns {{ column: number, endColumn: number }|null} 0-based column
 */
export function getNodeColumnRange(node) {
  if (node.type === 'LogicalExpression') {
    const opRange = getLogicalExpressionOperatorRange(node);
    if (opRange) return opRange;
  }
  if (node.loc && node.loc.start && node.loc.end) {
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    
    // For single-line nodes, use exact AST range
    if (startLine === endLine) {
      return {
        column: node.loc.start.column,
        endColumn: node.loc.end.column,
      };
    }
    
    // For multi-line nodes, return null (let multi-line logic handle it)
    // This prevents invalid endColumn < column situations
    return null;
  }
  return null;
}

/**
 * Returns the report line for a decision point node.
 * LogicalExpression uses operator line.
 * @param {Object} node - AST node
 * @returns {number} 1-based line
 */
export function getDecisionPointLineForNode(node) {
  if (node.type === 'LogicalExpression') {
    return getLogicalExpressionOperatorLine(node) ?? getNodeLine(node);
  }
  return getNodeLine(node);
}

/**
 * Gets start/end line for a node's loc
 * @param {Object} node - AST node
 * @returns {{ startLine: number, endLine: number }|null} Line range or null
 */
export function getNodeLineRange(node) {
  const startLine = node.loc && node.loc.start ? node.loc.start.line : null;
  const endLine = node.loc && node.loc.end ? node.loc.end.line : null;
  if (startLine == null || endLine == null) return null;
  return { startLine, endLine };
}

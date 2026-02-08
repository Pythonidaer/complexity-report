/**
 * Multi-line ternary handling and decision point entry building.
 */

import { getNodeLineRange } from './node-helpers.js';

/**
 * Returns whether the node is a multi-line ConditionalExpression.
 * @param {Object} node - AST node
 * @param {{ startLine: number, endLine: number }} lineRange - Line range
 * @param {Object|null} columnRange - Column range or null
 * @returns {boolean}
 */
export function isMultiLineTernaryNode(node, lineRange, columnRange) {
  return lineRange.startLine !== lineRange.endLine &&
    Boolean(columnRange) &&
    node.type === 'ConditionalExpression';
}

/**
 * Builds line ranges for a multi-line node using AST loc data.
 * @param {number} startLine - Start line (1-based)
 * @param {number} endLine - End line (1-based)
 * @param {Object} nodeLoc - AST node.loc object with start/end
 * @param {string[]} lines - Source lines
 * @returns {Array<{ line: number, column: number, endColumn: number }>}
 */
export function buildMultiLineTernaryLineRanges(
  startLine,
  endLine,
  nodeLoc,
  lines
) {
  const lineRanges = [];
  
  // Only highlight the first line using AST start column to end of line
  const lineLength = lines[startLine - 1]?.length ?? 0;
  lineRanges.push({
    line: startLine,
    column: nodeLoc.start.column,
    endColumn: lineLength,
  });
  
  return lineRanges;
}

/**
 * Builds one or more decision point entries for a node.
 * Multi-line nodes get one entry with lines array (one per line).
 * @param {Object} node - AST node
 * @param {string} decisionType - Type string
 * @param {number} functionLine - Function line
 * @param {number} line - Report line
 * @param {Object|null} columnRange - Column range or null
 * @param {string[]} lines - Source code lines
 * @returns {Array<Object>} Array of decision point objects to push
 */
export function buildDecisionPointEntries(
  node,
  decisionType,
  functionLine,
  line,
  columnRange,
  lines
) {
  const lineRange = getNodeLineRange(node);
  
  // Handle multi-line nodes (ternary, catch, if, etc.)
  if (lineRange && lineRange.startLine !== lineRange.endLine) {
    // Multi-line node: create ranges for each line based on AST loc
    const lineRanges = buildMultiLineTernaryLineRanges(
      lineRange.startLine,
      lineRange.endLine,
      node.loc,
      lines
    );
    return [{ type: decisionType, line, functionLine, name: null, lines: lineRanges }];
  }
  
  // Single-line node: use column range from AST
  const base = { type: decisionType, line, functionLine, name: null };
  const withCol = columnRange
    ? { ...base, column: columnRange.column, endColumn: columnRange.endColumn }
    : base;
  return [withCol];
}

/**
 * Core parse logic: orchestrates AST parsing and decision point extraction.
 */

import { parseAST, collectNodesByType, findAllFunctions } from './ast-utils.js';
import { buildParentMap } from './parent-map.js';
import { getDecisionPointType } from './decision-type.js';
import { findFunctionForDecisionPoint } from './function-matching.js';
import { matchFunctionsToAST } from './function-matching.js';
import { getDecisionPointLineForNode, getNodeColumnRange } from './node-helpers.js';
import { buildDecisionPointEntries } from './ternary-multiline.js';

/**
 * Parses decision points from source code using ESLint's AST
 * @param {string} sourceCode - Full source code
 * @param {Map} _functionBoundaries - Map (not used in AST approach)
 * @param {Array} functions - Function objects with line numbers
 * @param {string} filePath - Path to the file
 * @param {string} _projectRoot - Root directory of the project
 * @param {{ variant?: 'classic' | 'modified' }} [options] - Options.
 *   variant: classic = each switch case +1; modified = whole switch +1.
 *   Defaults to 'classic'.
 * @returns {Promise<Array>} Array of decision point objects
 */
export async function parseDecisionPointsAST(
  sourceCode,
  _functionBoundaries,
  functions,
  filePath,
  _projectRoot,
  options = {}
) {
  const variant = options.variant === 'modified' ? 'modified' : 'classic';

  try {
    const ast = parseAST(sourceCode, filePath);
    if (!ast) {
      return [];
    }

    const astFunctions = findAllFunctions(ast);
    const astToEslintMap = matchFunctionsToAST(astFunctions, functions, sourceCode);

    if (astToEslintMap.size === 0) {
      return [];
    }

    const parentMap = buildParentMap(ast);

    const decisionPointNodeTypes = [
      'IfStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      ...(variant === 'modified' ? ['SwitchStatement'] : ['SwitchCase']),
      'CatchClause',
      'ConditionalExpression',
      'LogicalExpression',
      'ChainExpression',
      'MemberExpression',
      'BinaryExpression',
      'AssignmentPattern',
    ];

    const allNodes = [];
    decisionPointNodeTypes.forEach(type => {
      collectNodesByType(ast, type, allNodes);
    });

    const decisionPoints = [];
    const lines = sourceCode.split('\n');
    allNodes.forEach(node => {
      const decisionType = getDecisionPointType(node, parentMap, ast, variant);
      if (!decisionType) return;
      const functionLine = findFunctionForDecisionPoint(
        node,
        astFunctions,
        astToEslintMap
      );
      if (functionLine === null) return;
      const line = getDecisionPointLineForNode(node);
      const columnRange = getNodeColumnRange(node);
      const entries = buildDecisionPointEntries(
        node,
        decisionType,
        functionLine,
        line,
        columnRange,
        lines
      );
      decisionPoints.push(...entries);
    });

    return decisionPoints;
  } catch (error) {
    console.error(`Error parsing AST for ${filePath}:`, error.message);
    return [];
  }
}

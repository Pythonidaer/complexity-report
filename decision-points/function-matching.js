/**
 * Matching AST function nodes to ESLint function results.
 */

import { getNodeLine } from './ast-utils.js';

/**
 * Finds the line number where => appears in an arrow function
 * @param {Object} astFunc - AST arrow function node
 * @param {string} sourceCode - Full source code
 * @returns {number|null} Line number where => appears, or null if not found
 */
export function findArrowFunctionLine(astFunc, sourceCode) {
  if (astFunc.type !== 'ArrowFunctionExpression') return null;
  if (!astFunc.range) return null;

  const funcCode = sourceCode.substring(astFunc.range[0], astFunc.range[1]);
  const arrowIndex = funcCode.indexOf('=>');
  if (arrowIndex === -1) return null;

  const linesBeforeArrow = sourceCode.substring(0, astFunc.range[0] + arrowIndex).split('\n');
  return linesBeforeArrow.length;
}

/**
 * Gets the match line for an AST function (handles arrow functions)
 * @param {Object} astFunc - AST function node
 * @param {string} sourceCode - Full source code
 * @returns {number} Line number to match against
 */
export function getMatchLineForASTFunction(astFunc, sourceCode) {
  const astLine = getNodeLine(astFunc);
  if (astFunc.type === 'ArrowFunctionExpression') {
    const arrowLine = findArrowFunctionLine(astFunc, sourceCode);
    if (arrowLine !== null) {
      return arrowLine;
    }
  }
  return astLine;
}

/**
 * Checks if node types match between ESLint and AST
 * @param {string} eslintNodeType - ESLint node type
 * @param {string} astNodeType - AST node type
 * @returns {boolean} True if types match
 */
export function doNodeTypesMatch(eslintNodeType, astNodeType) {
  return (eslintNodeType === 'FunctionDeclaration' && astNodeType === 'FunctionDeclaration') ||
         (eslintNodeType === 'ArrowFunctionExpression' && astNodeType === 'ArrowFunctionExpression') ||
         (eslintNodeType === 'FunctionExpression' && astNodeType === 'FunctionExpression');
}

/**
 * Matches AST function to ESLint functions by node type
 * @param {Object} astFunc - AST function node
 * @param {Array} matchingEslintFuncs - Array of matching ESLint functions
 * @param {Map} astToEslintMap - Map to update
 * @returns {boolean} True if matched
 */
export function matchByNodeType(astFunc, matchingEslintFuncs, astToEslintMap) {
  for (const eslintFunc of matchingEslintFuncs) {
    const nodeTypeMatches = doNodeTypesMatch(eslintFunc.nodeType, astFunc.type);
    if (nodeTypeMatches || matchingEslintFuncs.length === 1) {
      astToEslintMap.set(astFunc, eslintFunc.line);
      return true;
    }
  }
  if (matchingEslintFuncs.length > 0) {
    astToEslintMap.set(astFunc, matchingEslintFuncs[0].line);
    return true;
  }
  return false;
}

/**
 * Checks if ESLint line is within AST function range
 * @param {Object} eslintFunc - ESLint function
 * @param {Object} astFunc - AST function
 * @param {string} sourceCode - Source code
 * @returns {boolean} True if within range
 */
export function isESLintLineInASTRange(eslintFunc, astFunc, sourceCode) {
  if (!astFunc.range) return false;
  const lines = sourceCode.split('\n');
  const eslintLineStart = lines.slice(0, eslintFunc.line - 1).join('\n').length;
  const eslintLineEnd = eslintLineStart + lines[eslintFunc.line - 1].length;
  return eslintLineStart >= astFunc.range[0] && eslintLineEnd <= astFunc.range[1];
}

/**
 * Tries to match AST function to ESLint functions by range
 * @param {Object} astFunc - AST function node
 * @param {Array} eslintFunctions - All ESLint functions
 * @param {string} sourceCode - Source code
 * @param {Map} astToEslintMap - Map to update
 * @returns {boolean} True if matched
 */
export function tryMatchByRange(astFunc, eslintFunctions, sourceCode, astToEslintMap) {
  for (const eslintFunc of eslintFunctions) {
    if (eslintFunc.nodeType === astFunc.type) {
      if (isESLintLineInASTRange(eslintFunc, astFunc, sourceCode)) {
        astToEslintMap.set(astFunc, eslintFunc.line);
        return true;
      }
    }
  }
  return false;
}

/**
 * Matches AST function nodes to ESLint function results by line number
 * and creates a map
 * @param {Array} astFunctions - Function nodes from AST
 * @param {Array} eslintFunctions - Function objects from ESLint results
 * @param {string} sourceCode - Full source code (for finding => in arrow)
 * @returns {Map} Map of AST function node to ESLint function line
 */
export function matchFunctionsToAST(astFunctions, eslintFunctions, sourceCode) {
  const astToEslintMap = new Map();

  const eslintFunctionMap = new Map();
  eslintFunctions.forEach(func => {
    if (!eslintFunctionMap.has(func.line)) {
      eslintFunctionMap.set(func.line, []);
    }
    eslintFunctionMap.get(func.line).push(func);
  });

  astFunctions.forEach(astFunc => {
    const matchLine = getMatchLineForASTFunction(astFunc, sourceCode);
    const matchingEslintFuncs = eslintFunctionMap.get(matchLine);

    if (matchingEslintFuncs && matchingEslintFuncs.length > 0) {
      matchByNodeType(astFunc, matchingEslintFuncs, astToEslintMap);
    } else {
      tryMatchByRange(astFunc, eslintFunctions, sourceCode, astToEslintMap);
    }
  });

  return astToEslintMap;
}

/**
 * Finds the innermost AST function that contains a decision point node
 * @param {Object} node - Decision point node
 * @param {Array} astFunctions - All AST function nodes
 * @returns {Object|null} Innermost AST function node or null
 */
export function findInnermostASTFunction(node, astFunctions) {
  if (!node.range) return null;

  let innermost = null;
  let innermostSize = Infinity;

  for (const astFunc of astFunctions) {
    if (astFunc.range &&
        node.range[0] >= astFunc.range[0] &&
        node.range[1] <= astFunc.range[1]) {
      const size = astFunc.range[1] - astFunc.range[0];
      if (size < innermostSize) {
        innermost = astFunc;
        innermostSize = size;
      }
    }
  }

  return innermost;
}

/**
 * Finds the ESLint function line that contains a decision point
 * @param {Object} node - Decision point node
 * @param {Array} astFunctions - All AST function nodes
 * @param {Map} astToEslintMap - Map of AST function node to ESLint function line
 * @returns {number|null} ESLint function line number or null
 */
export function findFunctionForDecisionPoint(node, astFunctions, astToEslintMap) {
  if (!node.range) return null;

  const innermostASTFunc = findInnermostASTFunction(node, astFunctions);
  if (!innermostASTFunc) return null;

  return astToEslintMap.get(innermostASTFunc) || null;
}

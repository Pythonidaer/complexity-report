/**
 * Decision point type mapping (control flow, expressions, default params).
 */

import { isInFunctionParameters } from './in-params.js';

/** Control flow node types that map directly to a decision type (no variant). */
const CONTROL_FLOW_TYPE_MAP = {
  IfStatement: 'if',
  ForStatement: 'for',
  ForInStatement: 'for',
  ForOfStatement: 'for',
  WhileStatement: 'while',
  DoWhileStatement: 'while',
  SwitchStatement: 'switch',
  CatchClause: 'catch',
};

/**
 * Gets decision point type for control flow statements
 * @param {string} nodeType - Node type
 * @param {string} variant - 'classic' or 'modified'
 * @returns {string|null} Decision point type or null
 */
export function getControlFlowDecisionType(nodeType, variant) {
  if (nodeType === 'SwitchCase') {
    return variant === 'modified' ? null : 'case';
  }
  return CONTROL_FLOW_TYPE_MAP[nodeType] ?? null;
}

/**
 * Gets decision point type for logical expressions
 * @param {Object} node - AST node
 * @returns {string|null} Decision point type or null
 */
export function getLogicalExpressionType(node) {
  if (node.operator === '&&') return '&&';
  if (node.operator === '||') return '||';
  if (node.operator === '??') return '??';
  return null;
}

/**
 * Gets decision point type for expressions
 * @param {Object} node - AST node
 * @param {string} nodeType - Node type
 * @returns {string|null} Decision point type or null
 */
export function getExpressionDecisionType(node, nodeType) {
  if (nodeType === 'ConditionalExpression') {
    return 'ternary';
  }
  if (nodeType === 'LogicalExpression') {
    return getLogicalExpressionType(node);
  }
  if (nodeType === 'MemberExpression' && node.optional) {
    return '?.';
  }
  if (nodeType === 'BinaryExpression' && node.operator === '??') {
    return '??';
  }
  return null;
}

/**
 * Checks if a node represents a decision point
 * @param {Object} node - AST node
 * @param {Map} parentMap - Parent map for checking context
 * @param {Object} ast - Root AST node (for checking function context)
 * @param {string} variant - 'classic' or 'modified'
 * @returns {string|null} Decision point type or null
 */
export function getDecisionPointType(node, parentMap, ast, variant) {
  if (!node || !node.type) return null;

  const nodeType = node.type;

  const controlFlowType = getControlFlowDecisionType(nodeType, variant);
  if (controlFlowType) return controlFlowType;

  const expressionType = getExpressionDecisionType(node, nodeType);
  if (expressionType) return expressionType;

  if (nodeType === 'AssignmentPattern' && parentMap) {
    if (isInFunctionParameters(node, parentMap, ast)) {
      return 'default parameter';
    }
  }

  return null;
}

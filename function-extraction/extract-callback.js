/**
 * Callback context identification (CallExpression, JSXAttribute, ReturnStatement).
 */

import { findAllNodesByType, findAllFunctions, findContainingNode } from './ast-utils.js';

export function getCalleeCallbackName(callee) {
  if (!callee) return null;
  if (callee.type === 'MemberExpression' && callee.property) return callee.property.name || null;
  if (callee.type === 'Identifier') return callee.name || null;
  return null;
}

export function checkCallExpressionCallback(funcNode, ast) {
  const callExpressions = findAllNodesByType(ast, 'CallExpression');
  const newExpressions = findAllNodesByType(ast, 'NewExpression');
  const containingNode = findContainingNode(funcNode, [
    ...callExpressions,
    ...newExpressions,
  ]);
  if (containingNode && containingNode.callee) {
    return getCalleeCallbackName(containingNode.callee);
  }
  return null;
}

export function checkJSXAttributeCallback(funcNode, ast) {
  const jsxAttributes = findAllNodesByType(ast, 'JSXAttribute');
  const containingAttr = findContainingNode(funcNode, jsxAttributes);
  if (containingAttr && containingAttr.name) {
    const attrName = containingAttr.name.name;
    if (attrName.startsWith('on') || attrName === 'ref') {
      return attrName === 'ref' ? 'ref' : `${attrName} handler`;
    }
  }
  return null;
}

export function checkReturnCallback(funcNode, ast) {
  const returnStatements = findAllNodesByType(ast, 'ReturnStatement');
  const containingReturn = findContainingNode(funcNode, returnStatements);
  if (containingReturn) {
    const isDirectReturnValue = containingReturn.argument === funcNode ||
      (containingReturn.argument &&
        containingReturn.argument.type === 'ArrowFunctionExpression' &&
        containingReturn.argument === funcNode);
    if (isDirectReturnValue) {
      const allFunctions = findAllFunctions(ast);
      const returnParent = findContainingNode(containingReturn, allFunctions);
      if (returnParent) return 'return';
    }
  }
  return null;
}

export function identifyCallbackContext(funcNode, ast) {
  if (!funcNode.range) return null;
  const returnCallback = checkReturnCallback(funcNode, ast);
  if (returnCallback) return returnCallback;
  const jsxCallback = checkJSXAttributeCallback(funcNode, ast);
  if (jsxCallback) return jsxCallback;
  const callCallback = checkCallExpressionCallback(funcNode, ast);
  if (callCallback) return callCallback;
  return null;
}

/**
 * AST-based function name extraction.
 */

import { parseAST, findAllFunctions, findAllNodesByType, findContainingNode, readFileIfExists, getNodeLine } from './ast-utils.js';
import { identifyCallbackContext } from './extract-callback.js';

export function isFirstArgOfDirectCall(funcNode, ast) {
  const callExpressions = findAllNodesByType(ast, 'CallExpression');
  const containingCall = findContainingNode(funcNode, callExpressions);
  if (
    !containingCall ||
    !containingCall.arguments ||
    containingCall.arguments[0] !== funcNode
  ) {
    return false;
  }
  return containingCall.callee.type === 'Identifier';
}

export function findVariableDeclaratorForFunction(funcNode, ast) {
  const variableDeclarators = findAllNodesByType(ast, 'VariableDeclarator');
  for (const declarator of variableDeclarators) {
    if (declarator.init === funcNode) return declarator;
    if (
      funcNode.range &&
      declarator.range &&
      declarator.range[0] <= funcNode.range[0] &&
      declarator.range[1] >= funcNode.range[1]
    ) {
      if (isFirstArgOfDirectCall(funcNode, ast)) return declarator;
    }
  }
  return null;
}

export function extractNameFromVariableDeclarator(funcNode, ast) {
  const declarator = findVariableDeclaratorForFunction(funcNode, ast);
  if (declarator && declarator.id) return declarator.id.name;
  return null;
}

export function extractNameFromProperty(funcNode, ast) {
  const properties = findAllNodesByType(ast, 'Property');
  const containingProperty = findContainingNode(funcNode, properties);
  if (containingProperty && containingProperty.key) {
    if (containingProperty.key.type === 'Identifier') return containingProperty.key.name;
    if (containingProperty.key.type === 'Literal') return String(containingProperty.key.value);
  }
  return null;
}

export function extractNameFromMethodDefinition(funcNode, ast) {
  const methodDefinitions = findAllNodesByType(ast, 'MethodDefinition');
  const containingMethod = findContainingNode(funcNode, methodDefinitions);
  if (containingMethod && containingMethod.key && containingMethod.key.type === 'Identifier') {
    return containingMethod.key.name;
  }
  return null;
}

export function extractNameFromASTNode(funcNode, ast) {
  if (funcNode.type === 'FunctionDeclaration' && funcNode.id) return funcNode.id.name;
  if (funcNode.type === 'MethodDefinition' && funcNode.key && funcNode.key.type === 'Identifier') {
    return funcNode.key.name;
  }
  const varName = extractNameFromVariableDeclarator(funcNode, ast);
  if (varName) return varName;
  const propName = extractNameFromProperty(funcNode, ast);
  if (propName) return propName;
  const methodName = extractNameFromMethodDefinition(funcNode, ast);
  if (methodName) return methodName;
  return null;
}

export function doNodeTypesMatch(eslintNodeType, astNodeType) {
  return (eslintNodeType === 'FunctionDeclaration' && astNodeType === 'FunctionDeclaration') ||
    (eslintNodeType === 'ArrowFunctionExpression' && astNodeType === 'ArrowFunctionExpression') ||
    (eslintNodeType === 'FunctionExpression' && astNodeType === 'FunctionExpression') ||
    (eslintNodeType === 'MethodDefinition' && astNodeType === 'MethodDefinition');
}

export function findArrowFunctionLine(astFunc, sourceCode) {
  if (!astFunc.range) return null;
  const funcCode = sourceCode.substring(astFunc.range[0], astFunc.range[1]);
  const arrowIndex = funcCode.indexOf('=>');
  if (arrowIndex === -1) return null;
  const linesBeforeArrow = sourceCode.substring(0, astFunc.range[0] + arrowIndex).split('\n');
  return linesBeforeArrow.length;
}

export function matchesArrowFunctionLine(astFunc, lineNumber, sourceCode) {
  const arrowLine = findArrowFunctionLine(astFunc, sourceCode);
  return arrowLine !== null && arrowLine === lineNumber;
}

export function findMatchingASTFunction(
  astFunctions,
  lineNumber,
  nodeType,
  sourceCode
) {
  // ESLint reports class methods as FunctionExpression; the method name is on the MethodDefinition.
  // Prefer MethodDefinition at this line so we get the name from the key.
  if (nodeType === 'FunctionExpression') {
    for (const astFunc of astFunctions) {
      if (astFunc.type === 'MethodDefinition' && getNodeLine(astFunc) === lineNumber) {
        return astFunc;
      }
    }
  }
  for (const astFunc of astFunctions) {
    if (!doNodeTypesMatch(nodeType, astFunc.type)) continue;
    if (astFunc.type === 'ArrowFunctionExpression') {
      if (matchesArrowFunctionLine(astFunc, lineNumber, sourceCode)) return astFunc;
    } else {
      if (getNodeLine(astFunc) === lineNumber) return astFunc;
    }
  }
  return null;
}

export function extractFunctionNameAST(filePath, lineNumber, nodeType, projectRoot) {
  try {
    const sourceCode = readFileIfExists(filePath, projectRoot);
    if (!sourceCode) return null;
    const ast = parseAST(sourceCode, filePath);
    if (!ast) return null;
    const astFunctions = findAllFunctions(ast);
    const matchingFunc = findMatchingASTFunction(
      astFunctions,
      lineNumber,
      nodeType,
      sourceCode
    );
    if (!matchingFunc) return null;
    const functionName = extractNameFromASTNode(matchingFunc, ast);
    if (functionName) return functionName;
    const callbackType = identifyCallbackContext(matchingFunc, ast);
    if (callbackType) return callbackType;
    if (matchingFunc.type === 'ArrowFunctionExpression') return 'anonymous arrow function';
    return 'anonymous';
  } catch {
    return null;
  }
}

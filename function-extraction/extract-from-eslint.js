/**
 * ESLint result processing and main extractFunctionName (AST + regex fallback).
 */

import { readFileIfExists } from './ast-utils.js';
import { extractFunctionNameAST } from './extract-name-ast.js';
import { handleArrowFunctionExpression, handleFunctionDeclaration } from './extract-name-regex.js';

/**
 * Extracts function name: AST first, then regex fallback.
 * Uses self-reference for regex fallback.
 */
export function extractFunctionName(
  filePath,
  lineNumber,
  nodeType,
  projectRoot
) {
  const astName = extractFunctionNameAST(
    filePath,
    lineNumber,
    nodeType,
    projectRoot
  );
  if (astName) return astName;
  try {
    const fileContent = readFileIfExists(filePath, projectRoot);
    if (!fileContent) return 'unknown';
    const lines = fileContent.split('\n');
    if (nodeType === 'ArrowFunctionExpression') {
      return handleArrowFunctionExpression(
        lines,
        lineNumber,
        filePath,
        projectRoot,
        extractFunctionName
      );
    }
    return handleFunctionDeclaration(lines, lineNumber);
  } catch {
    return 'unknown';
  }
}

/**
 * Processes a single complexity message and upserts into functionMap.
 */
export function processComplexityMessage(message, file, projectRoot, functionMap) {
  if (message.ruleId !== 'complexity' || message.severity !== 1) return;
  const complexityMatch = message.message.match(/complexity of (\d+)/i);
  if (!complexityMatch) return;
  const filePath = file.filePath.replace(projectRoot + '/', '');
  const nodeType = message.nodeType || 'FunctionDeclaration';
  const functionName = extractFunctionName(
    filePath,
    message.line,
    nodeType,
    projectRoot
  );
  const complexity = complexityMatch[1];
  const key = `${filePath}:${functionName}:${message.line}`;
  const existing = functionMap.get(key);
  if (existing && complexity <= parseInt(existing.complexity, 10)) return;
  functionMap.set(key, {
    file: filePath,
    line: message.line,
    column: message.column || 1,
    message: message.message,
    complexity: complexity,
    functionName: functionName,
    nodeType: nodeType,
  });
}

/**
 * Processes ESLint results and extracts function complexity data
 */
export function extractFunctionsFromESLintResults(eslintResults, projectRoot) {
  const functionMap = new Map();
  eslintResults.forEach((file) => {
    if (!file.messages) return;
    file.messages.forEach((message) =>
      processComplexityMessage(message, file, projectRoot, functionMap)
    );
  });
  const allFunctions = [...functionMap.values()];
  allFunctions.sort(
    (a, b) => parseInt(b.complexity, 10) - parseInt(a.complexity, 10)
  );
  return allFunctions;
}

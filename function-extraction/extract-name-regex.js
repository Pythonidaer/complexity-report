/**
 * Regex-based function name extraction (fallback when AST fails).
 * getFunctionNameForLine is optional; when provided,
 * findParentFunctionWithFallback uses it for recursive lookup.
 */

const FUNCTION_PATTERNS = [
  /(?:export\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[<(]/,
  /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
  /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
];

export function findParentFunction(lines, lineNumber, maxLookBack = 50) {
  let parentFunction = null;
  let closestFunctionLine = -1;
  for (
    let lookBack = 1;
    lookBack <= maxLookBack && lineNumber - lookBack >= 1;
    lookBack += 1
  ) {
    const checkLine = lineNumber - lookBack;
    const checkLineContent = lines[checkLine - 1] || '';
    for (const funcPattern of FUNCTION_PATTERNS) {
      const funcMatch = checkLineContent.match(funcPattern);
      if (funcMatch && funcMatch[1]) {
        if (closestFunctionLine === -1 || checkLine > closestFunctionLine) {
          parentFunction = funcMatch[1];
          closestFunctionLine = checkLine;
        }
      }
    }
  }
  return parentFunction;
}

export function findParentFunctionWithFallback(
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const parentFunction = findParentFunction(lines, lineNumber);
  if (parentFunction) return parentFunction;
  if (typeof getFunctionNameForLine === 'function') {
    return getFunctionNameForLine(
      filePath,
      lineNumber - 5,
      'FunctionDeclaration',
      projectRoot
    );
  }
  return 'anonymous';
}

export function formatCallbackName(callbackType, parentFunction) {
  if (
    parentFunction &&
    parentFunction !== 'anonymous' &&
    parentFunction !== 'unknown'
  ) {
    return `${parentFunction} (${callbackType})`;
  }
  return callbackType;
}

export function checkNamedArrowFunction(prevLine, currentLine) {
  const combinedContext = (prevLine + ' ' + currentLine).trim();
  const namedArrowPattern =
    /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?=>/;
  const namedMatch = combinedContext.match(namedArrowPattern);
  return namedMatch && namedMatch[1] ? namedMatch[1] : null;
}

export function findMethodCallCallback(
  beforeArrow,
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const methodCallMatch = beforeArrow.match(/\.(\w+)\s*\(/);
  if (!methodCallMatch || !methodCallMatch[1]) return null;
  const callbackType = methodCallMatch[1];
  const parentFunction = findParentFunctionWithFallback(
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  return formatCallbackName(callbackType, parentFunction);
}

export function findFunctionCallCallback(
  beforeArrow,
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const functionCallMatch = beforeArrow.match(
    /(?!if|for|while|switch)\b(\w+)\s*\(/
  );
  if (!functionCallMatch || !functionCallMatch[1]) return null;
  const callbackType = functionCallMatch[1];
  const parentFunction = findParentFunctionWithFallback(
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  return formatCallbackName(callbackType, parentFunction);
}

export function findCallbackWithFallbackPatterns(
  combinedContext,
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const arrowFunctionPatterns = [
    /\.(\w+)\s*\([^)]*\)\s*=>/,
    /\.(\w+)\s*\([^)]*=>/,
    /(\w+)\s*\([^)]*\)\s*=>/,
    /(\w+)\s*\([^)]*=>/,
  ];
  for (const pattern of arrowFunctionPatterns) {
    const match = combinedContext.match(pattern);
    if (match && match[1]) {
      const parentFunction = findParentFunctionWithFallback(
        filePath,
        lineNumber,
        projectRoot,
        lines,
        getFunctionNameForLine
      );
      return formatCallbackName(match[1], parentFunction);
    }
  }
  return null;
}

export function handleArrowFunctionFinalFallback(
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const parentFunction = findParentFunctionWithFallback(
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  if (
    parentFunction &&
    parentFunction !== 'anonymous' &&
    parentFunction !== 'unknown'
  ) {
    return `${parentFunction} (arrow function)`;
  }
  return 'anonymous arrow function';
}

export function tryFindCallbackFromCurrentLine(
  currentLine,
  filePath,
  lineNumber,
  projectRoot,
  lines,
  getFunctionNameForLine
) {
  const arrowIndex = currentLine.indexOf('=>');
  if (arrowIndex === -1) return null;
  const beforeArrow = currentLine.substring(0, arrowIndex);
  const methodCallback = findMethodCallCallback(
    beforeArrow,
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  if (methodCallback) return methodCallback;
  return findFunctionCallCallback(
    beforeArrow,
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
}

export function handleArrowFunctionExpression(
  lines,
  lineNumber,
  filePath,
  projectRoot,
  getFunctionNameForLine
) {
  const lineIndex = lineNumber - 1;
  const currentLine = lines[lineIndex] || '';
  const prevLine = lines[lineIndex - 1] || '';
  const namedArrow = checkNamedArrowFunction(prevLine, currentLine);
  if (namedArrow) return namedArrow;
  const callbackFromLine = tryFindCallbackFromCurrentLine(
    currentLine,
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  if (callbackFromLine) return callbackFromLine;
  const combinedContext = (prevLine + ' ' + currentLine).trim();
  const fallbackCallback = findCallbackWithFallbackPatterns(
    combinedContext,
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
  if (fallbackCallback) return fallbackCallback;
  return handleArrowFunctionFinalFallback(
    filePath,
    lineNumber,
    projectRoot,
    lines,
    getFunctionNameForLine
  );
}

export function handleFunctionDeclaration(lines, lineNumber) {
  const startLine = Math.max(0, lineNumber - 50);
  const context = lines.slice(startLine, lineNumber).join('\n');
  const patterns = [
    /(?:export\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[<(]/,
    /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
    /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
    /export\s+default\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[<(]/,
    /(?:export\s+default\s+|const\s+)([A-Z][a-zA-Z0-9_$]*)\s*[:=]\s*(?:\([^)]*\)\s*)?=>/,
  ];
  let lastMatch = null;
  let lastIndex = -1;
  for (const pattern of patterns) {
    const matches = [...context.matchAll(new RegExp(pattern.source, 'g'))];
    if (matches.length > 0) {
      const match = matches[matches.length - 1];
      const matchIndex = context.lastIndexOf(match[0]);
      if (matchIndex > lastIndex) {
        lastMatch = match[1];
        lastIndex = matchIndex;
      }
    }
  }
  return lastMatch || 'anonymous';
}

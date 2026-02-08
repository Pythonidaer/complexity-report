/**
 * Named function start/end and body detection helpers.
 */

import { processLineInFunctionBody } from './brace-scanning.js';

/**
 * Checks if a line matches function declaration pattern
 */
export function isFunctionDeclarationPattern(line) {
  return /^\s*(?:export\s+)?function\s+\w+/.test(line) &&
         line.includes('(') &&
         line.includes('{') &&
         !line.includes('=>');
}

/**
 * Calculates initial brace count for function body
 */
export function calculateFunctionBodyBraceCount(line) {
  const functionBodyBraceIndex = line.lastIndexOf('{');
  if (functionBodyBraceIndex === -1) return 1;
  const paramCloseIndex = line.lastIndexOf(')');
  if (paramCloseIndex !== -1 && functionBodyBraceIndex > paramCloseIndex) {
    const afterParams = line.substring(paramCloseIndex);
    return (afterParams.match(/{/g) || []).length;
  }
  return (line.match(/{/g) || []).length;
}

/**
 * Handles arrow function without braces case
 */
export function handleArrowFunctionWithoutBraces(lines, i) {
  let j = i + 1;
  while (j < lines.length && !lines[j].trim().match(/^[;}]/)) j += 1;
  return j + 1;
}

/**
 * Tracks type definition braces (before function body is found)
 */
export function trackTypeBraces(line, typeBraceCount) {
  if (!line.includes('{')) return typeBraceCount;
  const openBraces = (line.match(/{/g) || []).length;
  const closeBraces = (line.match(/}/g) || []).length;
  return typeBraceCount + openBraces - closeBraces;
}

/**
 * Handles function body start detection
 */
export function handleFunctionBodyStart(line, i, lines) {
  const hasFunctionBodyPattern = /\)\s*[:\w\s<>[\]|'"]*\s*\{/.test(line);
  const isFunctionDeclaration = isFunctionDeclarationPattern(line);
  const hasArrowFunction = line.includes('=>') && !line.includes('{');
  if (hasFunctionBodyPattern || isFunctionDeclaration) {
    return {
      inFunctionBody: true,
      braceCount: calculateFunctionBodyBraceCount(line),
      end: null,
    };
  }
  if (hasArrowFunction) {
    return {
      inFunctionBody: true,
      braceCount: 0,
      end: handleArrowFunctionWithoutBraces(lines, i),
    };
  }
  return { inFunctionBody: false, braceCount: 0, end: null };
}

/**
 * Handles processing a line before function body is found
 */
export function processLineBeforeFunctionBody(line, i, lines, typeBraceCount) {
  const bodyStartResult = handleFunctionBodyStart(line, i, lines);
  if (bodyStartResult.end !== null) {
    return {
      inFunctionBody: true,
      braceCount: 0,
      end: bodyStartResult.end,
      typeBraceCount,
    };
  }
  if (bodyStartResult.inFunctionBody) {
    return {
      inFunctionBody: true,
      braceCount: bodyStartResult.braceCount,
      end: null,
      typeBraceCount,
    };
  }
  return {
    inFunctionBody: false,
    braceCount: 0,
    end: null,
    typeBraceCount: trackTypeBraces(line, typeBraceCount)
  };
}

/**
 * Checks if a line contains the function body pattern
 */
export function hasFunctionBodyPattern(line) {
  return /\)\s*[:\w\s<>[\]|'"]*\s*\{/.test(line);
}

/**
 * Scans lines to find function end using brace counting
 */
export function scanForFunctionEndWithBraces(lines, start, functionLine) {
  let fallbackBraceCount = 0;
  let foundFunctionBody = false;
  for (let i = start - 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!foundFunctionBody && hasFunctionBodyPattern(line)) {
      foundFunctionBody = true;
      const result = processLineInFunctionBody(
        line,
        i,
        functionLine,
        0,
        lines,
        undefined
      );
      fallbackBraceCount = result.braceCount;
    } else if (foundFunctionBody) {
      const result = processLineInFunctionBody(
        line,
        i,
        functionLine,
        fallbackBraceCount,
        lines,
        undefined
      );
      fallbackBraceCount = result.braceCount;
      if (fallbackBraceCount === 0 && result.end !== null) {
        return result.end;
      }
    }
  }
  return null;
}

/**
 * Fallback logic to find function end when normal detection fails
 */
export function findFunctionEndFallback(lines, start, functionLine) {
  const end = scanForFunctionEndWithBraces(lines, start, functionLine);
  if (end !== null) return end;
  return Math.min(start + 500, lines.length);
}

/**
 * Finds the end line for a named function by tracking braces
 */
export function findNamedFunctionEnd(
  lines,
  start,
  functionLine,
  arrowFunctionHandled,
  inFunctionBody,
  braceCount,
  nodeType
) {
  let end = functionLine;
  let typeBraceCount = 0;
  const loopStart = start - 1;
  const skipFirstLine = (arrowFunctionHandled && inFunctionBody);

  for (let i = loopStart; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inFunctionBody) {
      const result = processLineBeforeFunctionBody(line, i, lines, typeBraceCount);
      if (result.end !== null) return result.end;
      if (result.inFunctionBody) {
        inFunctionBody = true;
        braceCount = result.braceCount;
        typeBraceCount = result.typeBraceCount;
        continue;
      }
      typeBraceCount = result.typeBraceCount;
    } else {
      if (skipFirstLine && i + 1 === start) continue;
      const result = processLineInFunctionBody(
        line,
        i,
        functionLine,
        braceCount,
        lines,
        nodeType
      );
      if (result.end !== null) return result.end;
      braceCount = result.braceCount;
    }
  }
  return end;
}

/**
 * Finds the start line for a named function
 */
export function findNamedFunctionStart(lines, functionLine, functionName) {
  const startLine = Math.max(0, functionLine - 50);
  const patterns = [
    /(?:export\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[<(]/,
    /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
    /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*)?(?:=>|function)/,
    /export\s+default\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[<(]/,
    /(?:export\s+default\s+|const\s+)([A-Z][a-zA-Z0-9_$]*)\s*[:=]\s*(?:\([^)]*\)\s*)?=>/,
  ];
  let start = functionLine;
  for (let i = functionLine - 1; i >= startLine; i -= 1) {
    const line = lines[i];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] === functionName) {
        start = i + 1;
        break;
      }
    }
    if (start !== functionLine) break;
  }
  return start;
}

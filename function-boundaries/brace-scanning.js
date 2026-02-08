/**
 * Brace counting and function body end detection.
 */

import { processCharacterForBraces } from './parse-utils.js';

/**
 * Finds end line for dependency array pattern (}, [deps])
 */
export function findDependencyArrayEnd(lines, i) {
  for (let k = i; k < Math.min(i + 3, lines.length); k += 1) {
    if (lines[k].includes(']')) return k + 1;
  }
  return null;
}

/**
 * Finds end line for setTimeout callback pattern (}, delay)
 */
export function findSetTimeoutCallbackEnd(lines, i, _functionLine) {
  for (let k = i; k < Math.min(i + 3, lines.length); k += 1) {
    const checkLine = lines[k];
    if (checkLine.includes(')') && (checkLine.includes(';') || k === i + 1)) return k + 1;
  }
  return null;
}

/**
 * Checks if closing brace is followed by dependency array or callback
 */
export function checkCallbackPatterns(line, i, lines) {
  const firstBraceIndex = line.indexOf('}');
  if (firstBraceIndex === -1) {
    return { hasDependencyArray: false, hasCallbackParam: false };
  }
  const restOfLine = line.substring(firstBraceIndex);
  const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
  const combined = restOfLine + ' ' + nextLine;
  return {
    hasDependencyArray: /}\s*,\s*\[/.test(combined),
    hasCallbackParam: /}\s*,\s*\d+/.test(combined)
  };
}

/**
 * Handles function body end detection (when braces balance)
 */
export function handleFunctionBodyEnd(line, i, functionLine, lines) {
  const { hasDependencyArray, hasCallbackParam } = checkCallbackPatterns(
    line,
    i,
    lines
  );
  if (hasDependencyArray) return findDependencyArrayEnd(lines, i);
  if (hasCallbackParam) return findSetTimeoutCallbackEnd(lines, i, functionLine);
  return i + 1;
}

/**
 * Checks if braces are balanced and function ends
 */
export function checkFunctionEnd(
  updatedBraceCount,
  closeBraces,
  line,
  i,
  functionLine,
  lines,
  nodeType
) {
  if (updatedBraceCount === 0 && closeBraces > 0) {
    if (nodeType === 'FunctionDeclaration') {
      const { hasDependencyArray } = checkCallbackPatterns(line, i, lines);
      if (hasDependencyArray) return null;
    }
    const trimmed = line.trim();
    if (trimmed === '};' || trimmed.endsWith('};')) {
      if (i > 0) {
        const prevLines = lines.slice(Math.max(0, i - 10), i);
        const hasAssignmentPattern = prevLines.some(prevLine =>
          /^\s*(const|let|var)\s+\w+\s*=.*=>/.test(prevLine.trim())
        );
        if (hasAssignmentPattern) return i + 1;
      }
    }
    const endLine = handleFunctionBodyEnd(line, i, functionLine, lines);
    if (endLine !== null) return endLine;
  }
  return null;
}

/**
 * Processes a line within function body
 * (brace counting, comment/string/regex aware)
 */
export function processLineInFunctionBody(
  line,
  i,
  functionLine,
  braceCount,
  lines,
  nodeType
) {
  let openBraces = 0;
  let closeBraces = 0;
  let state = {
    inRegex: false,
    inString: false,
    inSingleLineComment: false,
    inMultiLineComment: false,
    stringChar: null,
    escapeNext: false
  };

  for (let j = 0; j < line.length; j += 1) {
    const char = line[j];
    const prevChar = j > 0 ? line[j - 1] : '';
    const nextChar = j + 1 < line.length ? line[j + 1] : '';
    const result = processCharacterForBraces(
      char,
      prevChar,
      nextChar,
      line,
      j,
      state,
      openBraces,
      closeBraces
    );
    openBraces = result.openBraces;
    closeBraces = result.closeBraces;
    state = result.state;
    if (result.shouldBreak) break;
    if (result.shouldContinue) {
      if (result.skipNext) j += 1;
      continue;
    }
  }

  const updatedBraceCount = braceCount + openBraces - closeBraces;
  const endLine = checkFunctionEnd(
    updatedBraceCount,
    closeBraces,
    line,
    i,
    functionLine,
    lines,
    nodeType
  );
  if (endLine !== null) return { braceCount: updatedBraceCount, end: endLine };
  return { braceCount: updatedBraceCount, end: null };
}

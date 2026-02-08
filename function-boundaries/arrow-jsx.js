/**
 * Arrow function end detection for JSX return and JSX attribute patterns.
 */

import { scanForJSXReturnClosingParens } from './arrow-helpers.js';

/**
 * Finds the end line for an arrow function returning JSX (=> ( ... ))
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @returns {{end: number, found: boolean}} End line (1-based) and whether end was found
 */
export function findArrowFunctionEndJSXReturn(
  lines,
  startLine,
  arrowIndex,
  functionLine
) {
  const line = lines[startLine];
  const afterArrow = line.substring(arrowIndex + 2).trim();
  if (!afterArrow.startsWith('(')) {
    return { end: functionLine, found: false };
  }
  const arrowEndPos = arrowIndex + 2;
  const parenPos = line.indexOf('(', arrowEndPos);
  const scanIndex = parenPos + 1;
  const endLine = scanForJSXReturnClosingParens(
    lines,
    startLine,
    line,
    scanIndex
  );
  if (endLine !== null) {
    return { end: endLine, found: true };
  }
  return { end: functionLine, found: false };
}

/**
 * Finds the end line for an arrow function inside JSX attribute
 * (onChange={...})
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @returns {{end: number, found: boolean}} End line and whether found
 */
export function findArrowFunctionEndJSXAttribute(
  lines,
  startLine,
  arrowIndex,
  functionLine
) {
  const line = lines[startLine];
  const isInJSXAttribute = line.includes('{') && line.indexOf('{') < arrowIndex;
  if (!isInJSXAttribute) {
    return { end: functionLine, found: false };
  }
  const afterArrow = line.substring(arrowIndex + 2);
  let parenCount = 0;
  for (let k = 0; k < afterArrow.length; k += 1) {
    if (afterArrow[k] === '(') parenCount += 1;
    else if (afterArrow[k] === ')') {
      parenCount -= 1;
      if (parenCount === 0) {
        return { end: startLine + 1, found: true };
      }
    }
  }
  return { end: startLine + 1, found: true };
}

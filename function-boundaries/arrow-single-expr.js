/**
 * Arrow function end detection for single-expression bodies.
 */

/**
 * Checks if arrow function ends on the same line
 * @param {string} lineAfterArrow - Content after => on the line
 * @returns {boolean} True if ends on same line
 */
export function endsOnSameLine(lineAfterArrow) {
  return lineAfterArrow.includes(';') ||
         lineAfterArrow.includes(',') ||
         lineAfterArrow.includes(')');
}

/**
 * Calculates initial paren depth before arrow function
 * @param {string} lineBeforeArrow - Content before => on the line
 * @returns {number} Initial paren depth
 */
export function calculateInitialParenDepth(lineBeforeArrow) {
  const openParens = (lineBeforeArrow.match(/\(/g) || []).length;
  const closeParens = (lineBeforeArrow.match(/\)/g) || []).length;
  return openParens - closeParens;
}

/**
 * Scans forward to find end of single-expression arrow function
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {number} parenDepth - Initial paren depth
 * @returns {number} End line number (1-based)
 */
export function scanForSingleExpressionEnd(lines, startLine, parenDepth) {
  for (let j = startLine + 1; j < lines.length; j += 1) {
    const scanLine = lines[j];
    for (let k = 0; k < scanLine.length; k += 1) {
      if (scanLine[k] === '(') parenDepth += 1;
      else if (scanLine[k] === ')') {
        parenDepth -= 1;
        if (parenDepth <= 0) return j + 1;
      }
    }
    if (scanLine.trim().match(/^[;},]/)) return j + 1;
  }
  return lines.length;
}

/**
 * Finds the end line for a single-expression arrow function
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} _functionLine - Reported line number (1-based)
 * @returns {{end: number, found: boolean}} End line (1-based) and whether end was found
 */
export function findArrowFunctionEndSingleExpression(
  lines,
  startLine,
  arrowIndex,
  _functionLine
) {
  const line = lines[startLine];
  const lineAfterArrow = line.substring(arrowIndex + 2);
  if (endsOnSameLine(lineAfterArrow)) {
    return { end: startLine + 1, found: true };
  }
  const lineBeforeArrow = line.substring(0, arrowIndex);
  const parenDepth = calculateInitialParenDepth(lineBeforeArrow);
  const endLine = scanForSingleExpressionEnd(lines, startLine, parenDepth);
  return { end: endLine, found: true };
}

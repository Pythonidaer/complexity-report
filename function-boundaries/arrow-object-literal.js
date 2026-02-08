/**
 * Arrow function end detection for object literal return (=> ({ ... })).
 */

/**
 * Checks if a brace is part of an object literal pattern
 * @param {string} line - Line content
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} braceIndex - Index of { in the line
 * @returns {boolean} True if object literal pattern
 */
export function isObjectLiteralPattern(line, arrowIndex, braceIndex) {
  if (braceIndex === -1) return false;
  const betweenArrowAndBrace = line.substring(arrowIndex + 2, braceIndex).trim();
  return /^\(/.test(betweenArrowAndBrace) ||
         (betweenArrowAndBrace === '' && braceIndex > 0 && line[braceIndex - 1] === '(');
}

/**
 * Finds the closing paren of an object literal and checks if expression ends
 * @param {string} line - Line content
 * @param {number} braceIndex - Index of { in the line
 * @returns {boolean} True if closing paren found and expression ends
 */
export function findObjectLiteralClosingParen(line, braceIndex) {
  let parenCount = 1;
  for (let k = braceIndex + 1; k < line.length; k += 1) {
    if (line[k] === '(') parenCount += 1;
    else if (line[k] === ')') {
      parenCount -= 1;
      if (parenCount === 0) {
        const restOfLine = line.substring(k + 1).trim();
        return restOfLine.startsWith(';') || restOfLine.startsWith(')') || restOfLine === '';
      }
    }
  }
  return false;
}

/**
 * Finds the end line for an arrow function returning object literal
 * (=> ({ ... }))
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} braceIndex - Index of { in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @returns {{end: number, found: boolean}} End line and whether found
 */
export function findArrowFunctionEndObjectLiteral(
  lines,
  startLine,
  arrowIndex,
  braceIndex,
  functionLine
) {
  const line = lines[startLine];
  if (!isObjectLiteralPattern(line, arrowIndex, braceIndex)) {
    return { end: functionLine, found: false };
  }
  if (findObjectLiteralClosingParen(line, braceIndex)) {
    return { end: startLine + 1, found: true };
  }
  return { end: startLine + 1, found: true };
}

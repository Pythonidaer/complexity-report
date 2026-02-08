/**
 * Arrow function start and JSX return closing pattern helpers.
 */

/**
 * Finds the start line for an arrow function (multi-line arrow declarations).
 * For multi-line arrows (e.g. const fn = (\n  a,\n  b\n) => {),
 * returns the line where declaration starts (e.g. "const fn = ("),
 * so the whole declaration can be highlighted, not just the "=>" line.
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} functionLine - Reported line (1-based), typically "=>"
 * @returns {number} Start line number (1-based)
 */
export function findArrowFunctionStart(lines, functionLine) {
  const lineIndex = functionLine - 1;
  if (lineIndex < 0 || lineIndex >= lines.length) return functionLine;

  const arrowLine = lines[lineIndex];
  const hasArrow = arrowLine && arrowLine.includes('=>');
  // Default: start on the line that has "=>"
  let start = functionLine;

  if (hasArrow) {
    start = lineIndex + 1;
    // Walk backward to find declaration start: first line with
    // "= (" or "=(" (assignment to open paren).
    // Stop when we hit a line containing "=>" so we don't attribute
    // another function's declaration to this arrow.
    for (let i = lineIndex - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (!line) continue;
      if (line.includes('=>')) break;
      if (/=\s*\(/.test(line)) {
        start = i + 1;
        break;
      }
    }
  }

  return start;
}

/**
 * Checks if a closing paren matches the JSX return pattern ()) or )} followed by )
 * @param {string} scanLine - Current line being scanned
 * @param {number} k - Index of closing paren
 * @param {number} j - Current line index
 * @param {Array<string>} lines - All lines
 * @returns {number|null} End line number if pattern matches, null otherwise
 */
export function checkJSXReturnClosingPattern(scanLine, k, j, lines) {
  const nextChar = k + 1 < scanLine.length ? scanLine[k + 1] : '';
  if (nextChar === ')') {
    return j + 1;
  }
  if (nextChar === '}' && j + 1 < lines.length) {
    const nextLine = lines[j + 1];
    if (nextLine.trim().startsWith(')')) {
      return j + 2;
    }
  }
  return null;
}

/**
 * Scans lines to find matching closing parens for JSX return pattern
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} startLine - Start line index (0-based)
 * @param {string} line - First line content
 * @param {number} scanIndex - Starting character index
 * @returns {number|null} End line number if found, null otherwise
 */
export function scanForJSXReturnClosingParens(lines, startLine, line, scanIndex) {
  let parenCount = 1;
  for (let j = startLine; j < lines.length && j < startLine + 50; j += 1) {
    const scanLine = j === startLine ? line.substring(scanIndex) : lines[j];
    for (let k = 0; k < scanLine.length; k += 1) {
      const char = scanLine[k];
      if (char === '(') {
        parenCount += 1;
      } else if (char === ')') {
        parenCount -= 1;
        if (parenCount === 0) {
          const endLine = checkJSXReturnClosingPattern(scanLine, k, j, lines);
          if (endLine !== null) {
            return endLine;
          }
        }
      }
    }
  }
  return null;
}

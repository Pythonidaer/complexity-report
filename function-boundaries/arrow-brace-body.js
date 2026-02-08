/**
 * Arrow function end detection: brace body and main dispatcher.
 */

import { findArrowFunctionEndJSXReturn } from './arrow-jsx.js';
import { findArrowFunctionEndJSXAttribute } from './arrow-jsx.js';
import { findArrowFunctionEndObjectLiteral } from './arrow-object-literal.js';
import { findArrowFunctionEndSingleExpression } from './arrow-single-expr.js';

/**
 * Handles arrow function with JSX return pattern
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} i - Current line index
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @param {Map} boundaries - Map to store boundaries
 * @returns {{end, found, arrowFunctionHandled, arrowFunctionEndSet}|null}
 */
export function handleJSXReturnPattern(
  lines,
  i,
  arrowIndex,
  functionLine,
  boundaries
) {
  const jsxResult = findArrowFunctionEndJSXReturn(
    lines,
    i,
    arrowIndex,
    functionLine
  );
  if (jsxResult.found) {
    boundaries.set(functionLine, { start: i + 1, end: jsxResult.end });
    return {
      end: jsxResult.end,
      found: true,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: true
    };
  }
  return null;
}

/**
 * Checks if arrow function body is a single-line brace body
 * with balanced braces. Example: .forEach((item) => { doSomething(); });
 * @param {string} line - Current line content
 * @param {number} arrowIndex - Index of => in the line
 * @returns {boolean} True if single-line brace body with balanced braces
 */
function isSingleLineBraceBody(line, arrowIndex) {
  const afterArrow = line.substring(arrowIndex + 2);
  const openBraces = (afterArrow.match(/{/g) || []).length;
  const closeBraces = (afterArrow.match(/}/g) || []).length;
  
  // Must have at least one brace, and braces must balance
  if (openBraces === 0 || openBraces !== closeBraces) {
    return false;
  }
  
  // Check for common single-line patterns:
  // - Ends with }); (callback in method call)
  // - Ends with }; (arrow function assignment)
  // - Ends with }) (callback without semicolon)
  const trimmed = afterArrow.trim();
  return (
    trimmed.endsWith('});') ||
    trimmed.endsWith('};') ||
    trimmed.endsWith('})')
  );
}

/**
 * Handles arrow function with brace on same line
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} i - Current line index
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @param {Map} boundaries - Map to store boundaries
 * @param {string} line - Current line content
 * @returns {{end, found, arrowFunctionHandled, arrowFunctionEndSet,
 *   inFunctionBody, braceCount}|null} Result or null
 */
export function handleBraceOnSameLine(
  lines,
  i,
  arrowIndex,
  functionLine,
  boundaries,
  line
) {
  const braceIndex = line.indexOf('{', arrowIndex);
  if (braceIndex === -1) {
    const jsxAttrResult = findArrowFunctionEndJSXAttribute(
      lines,
      i,
      arrowIndex,
      functionLine
    );
    if (jsxAttrResult.found) {
      boundaries.set(functionLine, { start: i + 1, end: jsxAttrResult.end });
      return {
        end: jsxAttrResult.end,
        found: true,
        arrowFunctionHandled: true,
        arrowFunctionEndSet: true,
        inFunctionBody: false,
        braceCount: 0
      };
    }
    return null;
  }
  
  // CRITICAL FIX: Check if this is a single-line arrow function
  // with balanced braces. This prevents sibling callbacks from being
  // treated as nested. Example: .forEach((type) => { total += x; });
  if (isSingleLineBraceBody(line, arrowIndex)) {
    boundaries.set(functionLine, { start: i + 1, end: i + 1 });
    return {
      end: i + 1,
      found: true,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: true,
      inFunctionBody: false,
      braceCount: 0
    };
  }
  
  const objLiteralResult = findArrowFunctionEndObjectLiteral(
    lines,
    i,
    arrowIndex,
    braceIndex,
    functionLine
  );
  if (objLiteralResult.found) {
    boundaries.set(functionLine, { start: i + 1, end: objLiteralResult.end });
    return {
      end: objLiteralResult.end,
      found: true,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: true,
      inFunctionBody: false,
      braceCount: 0
    };
  }
  const openBraces = (line.match(/{/g) || []).length;
  return {
    end: functionLine,
    found: false,
    arrowFunctionHandled: true,
    arrowFunctionEndSet: false,
    inFunctionBody: true,
    braceCount: openBraces
  };
}

/**
 * Handles arrow function without brace on same line
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} i - Current line index
 * @param {number} arrowIndex - Index of => in the line
 * @param {number} functionLine - Reported line number (1-based)
 * @param {Map} boundaries - Map to store boundaries
 * @returns {{end, found, arrowFunctionHandled, arrowFunctionEndSet,
 *   inFunctionBody, braceCount}} Result
 */
export function handleNoBraceOnSameLine(
  lines,
  i,
  arrowIndex,
  functionLine,
  boundaries
) {
  if (i + 1 < lines.length && lines[i + 1].trim().startsWith('{')) {
    return {
      end: functionLine,
      found: false,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: false,
      inFunctionBody: true,
      braceCount: 1
    };
  }
  const jsxAttrResult = findArrowFunctionEndJSXAttribute(
    lines,
    i,
    arrowIndex,
    functionLine
  );
  if (jsxAttrResult.found) {
    boundaries.set(functionLine, { start: i + 1, end: jsxAttrResult.end });
    return {
      end: jsxAttrResult.end,
      found: true,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: false,
      inFunctionBody: false,
      braceCount: 0
    };
  }
  const singleExprResult = findArrowFunctionEndSingleExpression(
    lines,
    i,
    arrowIndex,
    functionLine
  );
  if (singleExprResult.found) {
    boundaries.set(functionLine, { start: i + 1, end: singleExprResult.end });
    return {
      end: singleExprResult.end,
      found: true,
      arrowFunctionHandled: true,
      arrowFunctionEndSet: false,
      inFunctionBody: false,
      braceCount: 0
    };
  }
  return {
    end: functionLine,
    found: false,
    arrowFunctionHandled: false,
    arrowFunctionEndSet: false,
    inFunctionBody: false,
    braceCount: 0
  };
}

/**
 * Finds the end line for an arrow function (main dispatcher)
 * @param {Array<string>} lines - Array of source code lines
 * @param {number} start - Start line number (1-based)
 * @param {number} functionLine - Reported line number (1-based)
 * @param {Map} boundaries - Map to store boundaries
 * @returns {{end, found, arrowFunctionHandled, arrowFunctionEndSet,
 *   inFunctionBody, braceCount}} Result object
 */
export function findArrowFunctionEnd(
  lines,
  start,
  functionLine,
  boundaries
) {
  let end = functionLine;
  let arrowFunctionHandled = false;
  let arrowFunctionEndSet = false;
  let inFunctionBody = false;
  let braceCount = 0;

  for (let i = start - 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('=>')) {
      const arrowIndex = line.indexOf('=>');
      const afterArrow = line.substring(arrowIndex + 2).trim();

      if (afterArrow.startsWith('(')) {
        const jsxResult = handleJSXReturnPattern(
          lines,
          i,
          arrowIndex,
          functionLine,
          boundaries
        );
        if (jsxResult) {
          return { ...jsxResult, inFunctionBody, braceCount };
        }
      }

      if (line.includes('{')) {
        const braceResult = handleBraceOnSameLine(
          lines,
          i,
          arrowIndex,
          functionLine,
          boundaries,
          line
        );
        if (braceResult) {
          return braceResult;
        }
      } else {
        return handleNoBraceOnSameLine(
          lines,
          i,
          arrowIndex,
          functionLine,
          boundaries
        );
      }
      break;
    }
  }

  return {
    end,
    found: false,
    arrowFunctionHandled,
    arrowFunctionEndSet,
    inFunctionBody,
    braceCount,
  };
}

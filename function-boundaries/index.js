/**
 * Function boundaries module — finds start/end lines for each function.
 * Main export: findFunctionBoundaries.
 */

import { findArrowFunctionStart } from './arrow-helpers.js';
import { findArrowFunctionEnd } from './arrow-brace-body.js';
import { findNamedFunctionStart, findNamedFunctionEnd, findFunctionEndFallback } from './named-helpers.js';

/**
 * Finds function boundaries (start and end lines) for each function
 * @param {string} sourceCode - Full source code
 * @param {Array} functions - Array of function objects with line numbers
 * @returns {Map} Map of functionLine -> { start, end }
 */
export function findFunctionBoundaries(sourceCode, functions) {
  const boundaries = new Map();
  const lines = sourceCode.split('\n');

  functions.forEach(func => {
    const functionLine = func.line;
    const nodeType = func.nodeType || 'FunctionDeclaration';

    const start = nodeType === 'ArrowFunctionExpression'
      ? findArrowFunctionStart(lines, functionLine)
      : findNamedFunctionStart(lines, functionLine, func.functionName);

    let end = functionLine;
    let braceCount = 0;
    let inFunctionBody = false;
    let arrowFunctionEndSet = false;
    let arrowFunctionHandled = false;

    if (nodeType === 'ArrowFunctionExpression') {
      const arrowResult = findArrowFunctionEnd(lines, start, functionLine, boundaries);
      end = arrowResult.end;
      arrowFunctionHandled = arrowResult.arrowFunctionHandled;
      arrowFunctionEndSet = arrowResult.arrowFunctionEndSet;
      inFunctionBody = arrowResult.inFunctionBody;
      braceCount = arrowResult.braceCount;

      if (arrowFunctionEndSet) return;
    }

    if (!arrowFunctionEndSet) {
      end = findNamedFunctionEnd(
        lines,
        start,
        functionLine,
        arrowFunctionHandled,
        inFunctionBody,
        braceCount,
        nodeType
      );
    }

    if (end === functionLine || !inFunctionBody) {
      end = findFunctionEndFallback(lines, start, functionLine);
    }

    if (!boundaries.has(functionLine)) {
      boundaries.set(functionLine, { start, end });
    }
  });

  return boundaries;
}

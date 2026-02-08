/**
 * Boundary maps for file page borders
 */
import { getIndentChars } from './file-helpers.js';

/**
 * Builds a map from each line number to the innermost function span containing it.
 * @param {Map} functionBoundaries - Map of function lines to boundary objects
 * @param {number} sourceLinesLength - Total number of source lines
 * @param {string[]} sourceLines - Source lines (1-based index)
 * @returns {Object} Plain object: line number -> { start, end, indent }
 */
export function buildLineToSpan(
  functionBoundaries,
  sourceLinesLength,
  sourceLines
) {
  const lineToSpan = {};
  const boundaries = [...functionBoundaries.values()].map((b) => ({
    start: b.start,
    end: b.end,
  }));
  for (let L = 1; L <= sourceLinesLength; L += 1) {
    const containing = boundaries.filter(
      ({ start, end }) => start <= L && L <= end
    );
    if (containing.length === 0) continue;
    const innermost = containing.reduce((best, cur) =>
      (cur.end - cur.start) < (best.end - best.start) ? cur : best
    );
    const startLine = sourceLines[innermost.start - 1];
    const indent = typeof startLine === 'string' ? getIndentChars(startLine) : 0;
    lineToSpan[L] = { start: innermost.start, end: innermost.end, indent };
  }
  return lineToSpan;
}

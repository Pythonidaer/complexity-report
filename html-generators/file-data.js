/**
 * Data maps for file page (line-to-function, line-to-decision-point)
 */

/**
 * Creates line-to-function map
 * @param {Array} functions - Functions array
 * @returns {Map} Line to function map
 */
export function createLineToFunctionMap(functions) {
  const lineToFunction = new Map();
  functions.forEach(func => {
    lineToFunction.set(func.line, func);
  });
  return lineToFunction;
}

/**
 * Creates decision point line map for highlighting.
 * Expands multi-line DPs: when dp.lines exists, adds one entry per
 * line with that line's column range.
 * @param {Array} decisionPoints - Decision points array
 * @returns {Map} Line to decision points map
 */
export function createDecisionPointLineMap(decisionPoints) {
  const lineToDecisionPoint = new Map();
  decisionPoints.forEach(dp => {
    if (dp.lines && Array.isArray(dp.lines)) {
      dp.lines.forEach(({ line: lineNum, column, endColumn }) => {
        if (!lineToDecisionPoint.has(lineNum)) {
          lineToDecisionPoint.set(lineNum, []);
        }
        lineToDecisionPoint.get(lineNum).push({
          type: dp.type,
          line: lineNum,
          functionLine: dp.functionLine,
          name: dp.name,
          column,
          endColumn,
        });
      });
    } else {
      if (!lineToDecisionPoint.has(dp.line)) {
        lineToDecisionPoint.set(dp.line, []);
      }
      lineToDecisionPoint.get(dp.line).push(dp);
    }
  });
  return lineToDecisionPoint;
}

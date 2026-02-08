/**
 * Calculates complexity breakdown for a specific function
 * @param {number} functionLine - Line number of the function
 * @param {Array} decisionPoints - All decision points
 * @param {number} baseComplexity - Base complexity (should be 1)
 * @returns {Object} Breakdown, total, and decision points
 */
export function calculateComplexityBreakdown(
  functionLine,
  decisionPoints,
  baseComplexity
) {
  const functionDecisionPoints = decisionPoints.filter(
    (dp) => dp.functionLine === functionLine
  );

  const breakdown = {
    base: baseComplexity || 1,
    'if': 0,
    'else if': 0,
    'for': 0,
    'for...of': 0,
    'for...in': 0,
    'while': 0,
    'do...while': 0,
    'switch': 0,
    'case': 0,
    'catch': 0,
    'ternary': 0,
    '&&': 0,
    '||': 0,
    '??': 0,
    '?.': 0,
    'default parameter': 0,
  };

  functionDecisionPoints.forEach((dp) => {
    if (Object.hasOwn(breakdown, dp.type)) {
      breakdown[dp.type] += 1;
    }
  });

  const calculatedTotal = Object.values(breakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  return {
    breakdown,
    calculatedTotal,
    decisionPoints: functionDecisionPoints,
  };
}

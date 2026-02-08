# Complexity Breakdown

## complexity-breakdown.js

This module turns decision points (from `decision-points/`) into per-function numeric counts for each decision type. It filters decision points by function line, initializes a breakdown object with counts for base and all known types (if, for, ternary, &&, ||, etc.), increments counts for each matching decision point, and sums them to produce a calculated total. The result is used by the Function Complexity Breakdown table and by `tools/analyze-ast-mismatches/index.js` to compare calculated vs ESLint-reported complexity.

The only public API is `calculateComplexityBreakdown(functionLine, decisionPoints, baseComplexity)`, which returns `{ breakdown, calculatedTotal, decisionPoints }`. The breakdown object has keys for base, if, else if, for, for...of, for...in, while, do...while, switch, case, catch, ternary, &&, ||, ??, ?., and default parameter. Unknown decision point types are ignored via `Object.hasOwn`. Callers are `report/index.js`, `html-generators/file.js` (via `calculateFunctionBreakdowns`), and `tools/analyze-ast-mismatches/index.js`.

**Dependencies:**
- None (no imports; self-contained)

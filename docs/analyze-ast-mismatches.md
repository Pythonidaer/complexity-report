# AST Mismatch Analysis

## tools/analyze-ast-mismatches/index.js

This script validates that the complexity pipeline (decision-points + complexity-breakdown) matches ESLint’s reported complexity for every function. It runs ESLint, extracts functions and decision points, recalculates complexity per function, compares calculated vs ESLint-reported values, and reports any mismatches. When run, it can write a detailed report to `ast-mismatch-report.json` (the file is not in the repo; it is recreated when the script is run if needed). It logs a summary plus the top 20 largest mismatches to the console. Run manually with `node scripts/tools/analyze-ast-mismatches/index.js` (no npm script). Callers: none—it is a standalone diagnostic tool.

The exported function `analyzeASTMismatches()` orchestrates the full flow: run ESLint, group functions by file, for each file get boundaries and decision points, for each function call `calculateComplexityBreakdown` and compare `calculatedTotal` to `func.complexity`. Mismatches include function name, file, line, actual vs calculated complexity, difference, decision points found, and boundary. The script executes on load (IIFE) and exits with code 1 on error.

**Dependencies:**
- fs (writeFileSync, readFileSync)
- path (dirname, resolve)
- url (fileURLToPath)
- `integration/eslint/index.js`, `function-extraction/`, `function-boundaries/`, `decision-points/`, `complexity-breakdown.js`

**Retention and removal:**

- **Flag for removal:** Upon project completion, this script should be flagged for removal. It is a diagnostic/validation tool, not part of the normal report pipeline.
- **Keep until refactor is done:** Since the function hierarchy and related files (function-boundaries, function-extraction, function-hierarchy) will eventually be refactored, it is safest to keep this script until we are 100% sure there are no inaccuracies throughout the system. Run it after major changes to validate AST parser accuracy and catch regressions.

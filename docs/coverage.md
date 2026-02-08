# Scripts Test Coverage

## Overview

The `scripts/` directory is included in Vitest coverage (`vitest.config.ts` → `include: ["src/**/*.{ts,tsx}", "scripts/**/*.js"]`). Coverage thresholds apply globally (statements, lines, functions, branches).

## Exclusions

The following are excluded from coverage so that thresholds reflect testable logic:

- **`scripts/report/index.js`** — Main entry point; orchestration only. Behavior is covered indirectly by integration (ESLint run, HTML generation). Excluding it avoids a large block of uncovered statements from lowering the global percentage.
- **`scripts/**/__tests__/**`** and **`scripts/**/*.test.js`** — Test files and test directories.
- **Debug/test utilities** — `scripts/debug-*.js`, `scripts/test-*.js`.
- **Assets** — `scripts/assets/**` (third-party, not project source).

See `vitest.config.ts` → `coverage.exclude` for the full list.

## Test Files

| Module | Test File |
|--------|-----------|
| complexity-breakdown | `scripts/__tests__/complexity-breakdown.test.js` |
| decision-points (AST) | `scripts/__tests__/decision-points-ast.test.js` |
| function-boundaries | `scripts/__tests__/function-boundaries.test.js` |
| function-extraction | `scripts/__tests__/function-extraction.test.js` |
| extract-callback | `scripts/__tests__/extract-callback.test.js` |
| function-hierarchy | `scripts/__tests__/function-hierarchy.test.js` |
| eslint-integration | `scripts/__tests__/eslint-integration.test.js` |
| get-complexity-threshold | `scripts/__tests__/get-complexity-threshold.test.js` |
| html-generators | `scripts/__tests__/html-generators.test.js` |
| analyze-ast-mismatches | `scripts/__tests__/analyze-ast-mismatches.test.js` |
| export-generators | `scripts/__tests__/export-generators.test.js`, `export-generators-helpers.test.js` |

## Commands

```bash
# Run all script tests
npm test -- scripts/__tests__/ --run

# Run with coverage (includes scripts/)
npm run test:coverage
```

Report location: `coverage/index.html` (line-by-line coverage).

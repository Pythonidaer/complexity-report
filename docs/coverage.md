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

## User-facing analysis script (one command)

Consumers of the package can run a single script that generates decision-points summary and (if Vitest is installed) coverage summary, then merges them into `coverage/analysis.json`:

- **Add to package.json:** `"analysis": "complexity-analysis"` then run `npm run analysis`.
- **Or one-off:** From project root, `npx complexity-analysis`.

Vitest is optional: if it is not installed, the script still generates `coverage/decision-points-summary.json` and `coverage/analysis.json` (without coverage data) and prints a short note. See [README](../README.md#analysis-output-for-tooling--llms).

---

## Coverage summary JSON

A machine-readable summary of coverage (per-file stats and uncovered line ranges) can be generated for tooling or editor/LLM hints:

```bash
# Generate coverage, then write summary JSON (default: coverage/coverage-summary.json)
npm run test:coverage:json

# Or, if coverage was already run, just convert existing coverage-final.json
npm run coverage:summary
```

Optional args: `node tools/coverage-to-json.js [input.json] [output.json]` (defaults: `coverage/coverage-final.json` → `coverage/coverage-summary.json`).

Output shape: `{ summary: { statements, branches, functions, lines }, files: [ { file, statements, branches, functions, lines, uncoveredLines, uncoveredLineRanges } ] }`. Example for one file:

```json
{
  "file": "function-hierarchy.js",
  "statements": 96.13,
  "branches": 81.48,
  "functions": 100,
  "lines": 96.13,
  "uncoveredLines": [105, 106, 110, 111, 144, 145, ...],
  "uncoveredLineRanges": ["105-106", "110-111", "144-145", ...]
}
```

## Decision points summary JSON

Decision points (if, for, ternary, &&, etc.) can be exported in a format aligned with the coverage summary for tooling or editor/LLM hints (e.g. to identify branches that might need tests):

```bash
npm run decision-points:json
```

To generate both summaries in one go (Vitest coverage + coverage-summary + decision-points-summary):

```bash
npm run analysis
```

This runs ESLint (same as the complexity report), extracts decision points per file using the same AST pipeline, and writes `coverage/decision-points-summary.json`. Both summary JSONs (coverage and decision points) live under `coverage/` when using Vitest.

Optional args: `node tools/decision-points-to-json.js [cwd] [output.json]` (defaults: `.` → `coverage/decision-points-summary.json`).

Output shape (aligned with coverage summary): `{ summary: { totalDecisionPoints, filesWithDecisionPoints }, files: [ { file, decisionPointCount, decisionPoints, decisionPointLines, decisionPointLineRanges } ] }`. Example for one file:

```json
{
  "file": "complexity-breakdown.js",
  "decisionPointCount": 2,
  "decisionPoints": [
    { "line": 38, "type": "if", "functionLine": 37 },
    { "line": 18, "type": "||", "functionLine": 8 }
  ],
  "decisionPointLines": [18, 38],
  "decisionPointLineRanges": ["18", "38"]
}
```

Merge both into one file: run `npm run analysis:merge` to write `coverage/analysis.json` (per-file coverage, decision points, and `uncoveredDecisionPoints`). Run `npm run analysis` first so both summaries exist.

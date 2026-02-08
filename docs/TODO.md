# Complexity Report Generator — TODOs

Open and completed work for the complexity report generator. Current status (AST parser 100% accuracy, dynamic threshold) is summarized in [README.md](../README.md).

**Current:** All functions are at or below the complexity threshold (see report summary after `npm run lint:complexity`).

---

## Completed

- **AST parser** — `decision-points/` (AST-based) with 100% accuracy (0 mismatches); default and only parser; heuristic parser removed.
- **Complexity reduction** — All functions refactored to ≤ 10 (buildCodeLineHTML, generateLineRowHTML, getControlFlowDecisionType, extractFunctionsFromESLintResults callback, main, generateFileHTML).
- **File length refactor** — `html-generators.js` split into `html-generators/`; heuristic `decision-points/` removed. `function-boundaries.js` at 1,382 lines (slightly over 1000-line guideline, acceptable).
- **Dynamic threshold** — Threshold read from `eslint.config.js` via `integration/threshold/index.js`.
- **Breakdown controls** — Checkboxes, `--show-all-columns`, `--hide-table`; status line, cell colors (high/medium/low), filter, footer on all pages.
- **FCB table** — Grouped columns (Control Flow, Expressions, Function Parameters); refactor from single Breakdown string column complete.
- **Highlighting** — Nested border indentation, vertical full-length hover lines, decision-point + function-boundary fix (both classes can apply).
- **Nested function start-line highlight** — `buildBoundaryLineSets` and `buildBoundaryToStartMap` in `file.js` now accept the `functions` array; every reported function’s start line is added to the boundary sets so nested callbacks (e.g. `.filter`, `.forEach`, `.sort`) get yellow highlight and blue borders even when the boundary finder misses them. `boundaryToStartMap` gets an entry per function for correct indent.
- **Prefer AST for highlight** — `getFunctionStartColumn(filePath, lineNumber, nodeType, projectRoot)` in `function-extraction/` returns the AST node’s start column (1-based). In `extractFunctionsFromESLintResults`, column is now **prefer AST** over ESLint: we use `getFunctionStartColumn` when it returns a value so the yellow starts at the true function node start (e.g. the `(` of `.forEach(columnKey =>`), not at `=>`. ESLint’s `message.column` is used only when AST fails (parse error / no matching node). Removed the "start at =>" fallback in `file.js`.
- **Exports** — TXT/MD function-name exports via `--export` to `complexity/reports/` (or `package.json` → `complexityReport.exportDir`).
- **ESLint integration** — Config derived from project's `eslint.config.js` (framework-agnostic); report written to `complexity/complexity-report.json`; complexity **variant** (classic vs modified) read from config; test files excluded via `ignorePatterns`.
- **Function Naming Consistency & Flexibility** — AST name preference; hierarchical naming aligned; variable name only for direct init/wrapper call; Line column for multiple callbacks; anonymous callback identification and line numbers in table. All items in original scope done.
- **Complexity Refactoring** — All target functions refactored to ≤ threshold: buildCodeLineHTML, generateLineRowHTML, getControlFlowDecisionType, extractFunctionsFromESLintResults callback, main, generateFileHTML; plus decision-points/ (forEach, buildDecisionPointEntries) and generateBreakdownSectionHTML. Numbers kept at or below ESLint threshold.
- **Decision Path Tracking** — Numerically track decision paths per file (if, else, ternary, loops, etc.); categorization and display at file/folder level done.
- **Fix small homepage/layout issues** — Complete.
- **Function Source Code Viewing (click-in)** — Enable clicking into each function to view full function source; per-file HTML exists; click-in to expand/view function body complete.
- **Breakdown Controls & Exports** — Mimic Vitest coverage styles (spacing, line styles, color scheme); TXT/MD exports via `--export`.
- **UI/UX Polish** — Export function feature, clean up package files; styles/headers aligned with Vitest coverage.
- **Documentation** — About page, README, AST parser docs complete.

---

## Open TODOs

### 1. FCB Table, Styling, and Report Consistency

- [x] **Fix sibling callback boundary detection** — ✅ FIXED: Single-line arrow functions with balanced braces (e.g., `.forEach((type) => { total += breakdown[type] || 0; });`) are now correctly detected and end on their own line. The brace scanner now checks for `isSingleLineBraceBody()` pattern (ends with `});`, `};`, or `})` with balanced braces) and immediately returns the end line, preventing sibling callbacks from being treated as nested. Fix implemented in `arrow-brace-body.js` with comprehensive tests in `function-boundaries.test.js`. **Verified:** `calculateDecisionPointTotals` function now correctly shows three sibling forEach callbacks instead of incorrectly nesting them.
- [ ] **Revisit FCB table ownership** — Document where function names are determined (`file.js` vs `function-hierarchy.js`).
- [x] **Evaluate file-css.js vs. flat CSS** — Converted to standalone `file.css`; file pages now link to it for caching/tooling/maintainability.
- [ ] **Assess decision-point vs. function-boundary highlighting** — Confirm behavior (see [html-generators](./html-generators.md)).
- [ ] **Re-assess status bars** — Consistent UX (colors, thresholds, placement) across main index, folder, file pages.
- [ ] **Document and possibly configure "levels"** — high/medium/low thresholds; consider CLI/config instead of hardcoded.
- [x] **Early return in AST (verified)** — Early return is an `if` statement; we count it as such. No separate "early return" node; verified in `decision-points/`.
- [x] **Variant-aware breakdown** — `decision-points/` accepts `options.variant` ('classic' | 'modified'); report pipeline reads variant from `eslint.config.js` via `findESLintConfig` + `getComplexityVariant` and passes it through. **Classic:** each `switch` case +1 (SwitchCase); **modified:** whole `switch` +1 (SwitchStatement). FCB table and AST parser align with ESLint for the project's chosen variant.
- [x] **Horizontal borders (AST-based indentation)** — Borders use `--start-ch` and `--end-ch` from AST; align with yellow highlight span (forEach, map, sort). Single-line functions get both top and bottom borders.
- [ ] Color-coding of decision paths (e.g. Vitest-style hints).

### 2. Styling & Highlighting

- [x] **Fix improper highlighting and bordering** — Borders now use AST-based positioning: `getFunctionRange` returns `startLine`, `startColumn`, `endLine`, `endColumn`; borders align with function span (e.g. forEach, map, sort at method name, not line start). Single-line functions get top and bottom borders spanning the function span. Fallback to indent-ch when AST unavailable.
  - **Relevant files (logic):** `scripts/html-generators/file.js` — `generateFileHTML` (orchestrates), `buildBoundaryLineSets`, `determineLineClasses`, `buildCodeLineHTML`, `generateLineRowHTML`, `createLineToFunctionMap`, `createDecisionPointLineMap`, `buildBoundaryToStartMap`.
  - **Relevant files (styles):** `scripts/html-generators/file.css` — `.decision-point-line`, `.function-boundary-highlight`, boundary row/indent rules (top-level full-width, nested indented via `--indent-ch`).
  - **Dependencies:** (1) **Function boundaries** — `findFunctionBoundaries(sourceCode, functions)` in `scripts/function-boundaries/`; feeds `buildBoundaryLineSets` → which lines are function start/end/closing (boundary rows + yellow highlight). (2) **Decision points** — `parseDecisionPoints` → `parseDecisionPointsAST` in `scripts/decision-points/`; feeds `createDecisionPointLineMap` → `lineToDecisionPoint` → which lines get `.decision-point-line`. (3) **Functions** (ESLint) — `createLineToFunctionMap` → `lineToFunction` and `func.column` for granular function-start highlight; same `functions` array is passed into `findFunctionBoundaries` and `parseDecisionPoints`.

- [x] **Granular highlighting on function-declaration lines** — When a line is both a function start and has decision points (e.g. default params), decision-point segments are now highlighted red and the rest of the line yellow. `decision-points/` emits `column`/`endColumn` for each decision point; `buildCodeLineHTML` in `file.js` splits the line by DP ranges and wraps segments in `decision-point-line` vs `function-boundary-highlight`.
- [x] **Fix any remaining highlighting gaps** — Known gaps addressed: granular default-param on function line (segment split by DP ranges), and 0-based column handling (ESTree/TypeScript ESTree use 0-based columns; `getDecisionPointRanges` now uses `column`/`endColumn` directly). Decision points with column info are correctly highlighted.
- [x] **Syntax highlighting for code display** — File view uses Prettify (`prettify.css`, `prettify.js`, `pre.prettyprint` with `lang-js`/`lang-ts` from `detectLanguage` in `file.js`). JS/TS/JSX support via language classes.
- [x] **Re-assess coverage styles** — Coverage styles reviewed; HTML/CSS structure and alignment with design are done.

### 3. Testing & Edge Cases

- [ ] Review coverage for all `scripts/` modules; add tests for uncovered edge cases.

### 4. Code Organization

- [ ] Refactor folder structure if needed; condense markdown files.
- [x] **Split file.js** — Split into `file-helpers.js`, `file-breakdown.js`, `file-boundary-builders.js`, `file-line-render.js`, `file-data.js`; `file.js` now under 1000 lines.
- [x] **Refactor function-boundaries.js and function-extraction.js** — Split into `function-boundaries/` and `function-extraction/`; `decision-points-ast.js` split into `decision-points/`. All under 1000-line guideline. See [REFACTORING_PLAN.md](./REFACTORING_PLAN.md).
- [x] **Review border spans and highlighting** — AST-based border positioning implemented; borders align with function spans.
- [ ] **Confirm naming is accurate** — Ensure hierarchical function names match across FCB table, exports, and ESLint AST.

### 5. NPM Package Preparation (migrate to standalone repo)

- [ ] **See [NPM_PACKAGE_MIGRATION_TODO.md](./NPM_PACKAGE_MIGRATION_TODO.md)** — Master checklist for moving scripts to `/Users/johnnyhammond/Documents/complexity-report` and publishing as an NPM package. Covers: copying code, package.json, entry points, project root/cwd, dependencies, tests, docs, and source-repo updates.
- [ ] **Package as npm** — Extract complexity report generator for reuse (done in complexity-report repo per migration doc).
- [ ] **Audit dependencies and files** — ESLint, @typescript-eslint/typescript-estree; see migration doc Phase 3.
- [ ] **Document minimal deps; clean package structure** — In complexity-report README and docs per migration doc Phase 6.

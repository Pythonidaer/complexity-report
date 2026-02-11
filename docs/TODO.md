# Complexity Report Generator — TODOs

Open and completed work for the complexity report generator. Current status (AST parser 100% accuracy, dynamic threshold) is summarized in [README.md](../README.md).

**Current:** All functions are at or below the complexity threshold (see report summary after `npm run report`). **Function coverage is 100%** for all covered files. **Next priority:** Bring **branch coverage** and **statement coverage** as close to 100% as possible (see [Branches and statements toward 100%](#branches-and-statements-toward-100-for-next-agent)). Then the user will follow up for package publishing and the extended script/LLM workflow.

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
- **Exports** — TXT/MD function-name exports generated with every report run to `complexity/reports/` (or `package.json` → `complexityReport.exportDir`).
- **ESLint integration** — Config derived from project's `eslint.config.js` (framework-agnostic); report written to `complexity/complexity-report.json`; complexity **variant** (classic vs modified) read from config; test files excluded via `ignorePatterns`.
- **Function Naming Consistency & Flexibility** — AST name preference; hierarchical naming aligned; variable name only for direct init/wrapper call; Line column for multiple callbacks; anonymous callback identification and line numbers in table. All items in original scope done.
- **Complexity Refactoring** — All target functions refactored to ≤ threshold: buildCodeLineHTML, generateLineRowHTML, getControlFlowDecisionType, extractFunctionsFromESLintResults callback, main, generateFileHTML; plus decision-points/ (forEach, buildDecisionPointEntries) and generateBreakdownSectionHTML. Numbers kept at or below ESLint threshold.
- **Decision Path Tracking** — Numerically track decision paths per file (if, else, ternary, loops, etc.); categorization and display at file/folder level done.
- **Fix small homepage/layout issues** — Complete.
- **Function Source Code Viewing (click-in)** — Enable clicking into each function to view full function source; per-file HTML exists; click-in to expand/view function body complete.
- **Breakdown Controls & Exports** — Mimic Vitest coverage styles (spacing, line styles, color scheme); TXT/MD exports generated with every report.
- **UI/UX Polish** — Export function feature, clean up package files; styles/headers aligned with Vitest coverage.
- **Documentation** — About page, README, AST parser docs complete.
- **Function coverage 100%** — All covered files have 100% function coverage. Tests added/updated in `__tests__/extract-name-regex.test.js`, `__tests__/function-boundaries-arrow-helpers.test.js`, `__tests__/function-boundaries-arrow-jsx.test.js`, and refactor in `html-generators/folder.js` to use `getSharedCssPath`/`getBackLink`.

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

- [x] **Bring function coverage to 100% for all covered files** — Done. Every covered file has `functions: 100` in `coverage/coverage-summary.json`.
- [ ] **Bring branch and statement coverage as close to 100% as possible** — Current snapshot: statements ~99%, branches ~94%. Use [Branches and statements toward 100%](#branches-and-statements-toward-100-for-next-agent). Per-file targets: add or extend tests so each file’s `statements` and `branches` in `coverage/coverage-summary.json` are as high as practical. Some branches are defensive/unreachable (e.g. `function-hierarchy.js` visited guard and duplicate-key path); document or skip those.
- [ ] Review coverage for all `scripts/` modules; add tests for uncovered edge cases.

---

## Coverage improvement process (for next agent)

Use this process to get scripts “up to snuff” on coverage (target: **≥90% branch coverage** per file). All analysis outputs live under **`coverage/`** when using Vitest.

### 1. Generate analysis outputs

```bash
# Full run: Vitest coverage + coverage-summary + decision-points-summary (all written to coverage/)
npm run analysis

# Merge both summaries into one file (coverage + decision points + uncoveredDecisionPoints per file)
npm run analysis:merge
```

- **`coverage/coverage-summary.json`** — Per-file: `statements`, `branches`, `functions`, `lines`, `uncoveredLines`, `uncoveredLineRanges`.
- **`coverage/decision-points-summary.json`** — Per-file: `decisionPointCount`, `decisionPoints` (line, type, functionLine), `decisionPointLines`, `decisionPointLineRanges`.
- **`coverage/analysis.json`** — Merged view: same files array with coverage + decision points + **`uncoveredDecisionPoints`** (decision points whose line is in that file’s `uncoveredLines`). Use this for “what to test next.”

### 2. Find files below target (e.g. 92% branches)

From project root:

```bash
node -e "
const c = require('./coverage/coverage-summary.json');
const target = 92;
const below = c.files.filter(f => f.branches < target).sort((a,b) => a.branches - b.branches);
below.forEach(f => console.log(f.branches.toFixed(1) + '%', f.file));
console.log('Total below ' + target + '%:', below.length);
"
```

Or open **`coverage/coverage-summary.json`** and scan the `files` array for `branches < target`.

#### Files below 100% statements or branches (snapshot for next agent)

Run `npm run analysis` then `npm run analysis:merge` to refresh; use `coverage/coverage-summary.json` for current list. Current snapshot (after coverage push):

**Statements < 100%:** function-boundaries/arrow-brace-body.js (92%), integration/threshold/index.js (94.6%), decision-points/in-params.js (96.5%), export-generators/txt-exports.js (98%), function-hierarchy.js (98.2%). (helpers.js and parse-main.js are now 100% statements.)

**Branches < 100%:** arrow-brace-body.js (~84%), txt-exports.js (~85%), helpers.js (~87.5%), integration/threshold (~88%), function-hierarchy.js (~89%), plus many in the 90–98% range.

**Note:** Some branches are defensive or unreachable (e.g. `function-hierarchy.js` visited guard and duplicate-key branch; `integration/threshold` maxValues.length === 0 path); focus on reachable branches first.

### 3. For each low-coverage file

1. Open **`coverage/analysis.json`** and find the entry for that file.
2. Use **`uncoveredLines`** / **`uncoveredLineRanges`** and **`uncoveredDecisionPoints`** (or **`decisionPoints`**) to see which branches (if, ternary, &&, etc.) are not hit.
3. Open the source file at those lines; add or extend tests in the matching `__tests__/*.test.js` (or create a test file if none exists) so that:
   - Both outcomes of conditionals are exercised (e.g. `functionBoundaries` null and non-null, `fileDir` empty and non-empty).
   - Error/early-return paths are hit (e.g. `readSourceFile` when file does not exist, or when read throws).
4. Run tests and re-run analysis:

   ```bash
   npm test -- --run
   npm run analysis
   npm run analysis:merge
   ```

5. Re-check branch % for that file in **`coverage/coverage-summary.json`**; repeat until **branches ≥ 92%** (or the chosen target) for that file.

### 4. Scripts reference

| Script | Purpose |
|--------|--------|
| `npm run test:coverage` | Vitest with coverage (writes `coverage/coverage-final.json`, HTML). |
| `npm run test:coverage:json` | Same + runs `tools/coverage-to-json.js` → `coverage/coverage-summary.json`. |
| `npm run coverage:summary` | Only converts existing `coverage-final.json` → `coverage-summary.json`. |
| `npm run decision-points:json` | Runs ESLint + decision-points pipeline → `coverage/decision-points-summary.json`. |
| `npm run analysis` | `vitest run --coverage` then both summary scripts (both write to `coverage/`). |
| `npm run analysis:merge` | Reads both summaries, writes `coverage/analysis.json` (requires both to exist). |

### 5. Notes

- **Merged file:** Using **`coverage/analysis.json`** (one place for coverage + decision points + uncovered decision points) is faster than toggling between two JSONs when deciding what to test.
- **Existing tests:** Several modules already have targeted tests added from this process (e.g. `__tests__/html-generators-file-helpers.test.js`, `__tests__/decision-points-node-helpers.test.js`); use them as patterns.
- **Vitest config:** Coverage thresholds and include/exclude are in **`vitest.config.js`**; `report/index.js` and `report/cli.js` are excluded from coverage.

### 6. Handoff prompt for next agent (92% branch, file-by-file)

Copy the following into a new agent window to continue **branch** coverage work:

```
Handoff: Branch coverage ≥92% per file

1. Run: npm run analysis then npm run analysis:merge (so coverage/analysis.json is up to date).
2. List files below 92% branches: node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.branches<92).sort((a,b)=>a.branches-b.branches).forEach(f=>console.log(f.branches.toFixed(1)+'%',f.file));"
3. For each file in that list, open coverage/analysis.json for that file’s entry; use uncoveredLines and uncoveredDecisionPoints to add or extend tests in the right __tests__/*.test.js until that file’s branches ≥92%.
4. After each file (or batch), run: npm test -- --run && npm run analysis && npm run analysis:merge. Re-check coverage-summary.json for that file.
5. Follow the step-by-step process in docs/TODO.md (§ Coverage improvement process). Target: every covered file has branches ≥92%. Do not start package publishing or the extended script/LLM workflow.
```

---

## Function coverage 100% (for next agent)

**Goal:** Every covered file has **100% function coverage** (every function in the instrumented code is invoked at least once by tests).

### 1. Generate coverage

```bash
npm run analysis
npm run analysis:merge
```

### 2. Find files with function coverage &lt; 100%

From project root:

```bash
node -e "
const c = require('./coverage/coverage-summary.json');
const below = c.files.filter(f => f.functions < 100).sort((a,b) => a.functions - b.functions);
below.forEach(f => console.log(f.functions + '%', f.file));
console.log('Total below 100% functions:', below.length);
"
```

### 3. Identify uncovered functions

- **`coverage/coverage-summary.json`** — Per file: `functions` (percentage). Files with `functions < 100` have at least one function never called.
- **`coverage/coverage-final.json`** (v8 format) — For each file, `f` is function hit counts and `fnMap` maps function IDs to `{ name, line, start, end }`. Any function ID with `f[id] === 0` is uncovered. Use this to see which function names/lines to target.
- **HTML report** — Open `coverage/index.html` (or the file’s coverage page) and look for functions listed as not covered (0 hits).

### 4. Add or extend tests

- For each file with `functions < 100`, open the source and the corresponding `__tests__/*.test.js`.
- Ensure every **exported** function is called by at least one test (directly or via a tested code path).
- For **internal** (non-exported) functions that are still instrumented, add tests that exercise code paths that call them, or export them only for testing if that’s the project’s pattern.
- Re-run tests and analysis after each file or batch:

  ```bash
  npm test -- --run
  npm run analysis
  npm run analysis:merge
  ```

### 5. Scripts reference

Same as in [§4 Scripts reference](#4-scripts-reference) above.

### 6. Handoff prompt for next agent (100% function coverage)

Copy the following into a new agent window to continue **function** coverage work:

```
Handoff: Function coverage 100% across the codebase

1. Run: npm run analysis then npm run analysis:merge (so coverage/coverage-summary.json is up to date).
2. List files with function coverage < 100%: node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.functions<100).sort((a,b)=>a.functions-b.functions).forEach(f=>console.log(f.functions+'%', f.file));"
3. For each file in that list, identify which functions are uncovered: use coverage/coverage-final.json (f and fnMap per file) or the HTML coverage report to see functions with 0 hits.
4. Add or extend tests in the matching __tests__/*.test.js so that every function in that file is invoked at least once (call exported functions directly or exercise code paths that call internal functions).
5. After each file (or batch), run: npm test -- --run && npm run analysis && npm run analysis:merge. Re-check coverage-summary.json (functions field) for that file.
6. Follow docs/TODO.md § Function coverage 100% (for next agent). Target: every covered file has functions = 100%. Do not start package publishing or the extended script/LLM workflow.
```

---

## Branches and statements toward 100% (for next agent)

**Goal:** Get **statement coverage** and **branch coverage** as close to 100% as possible for all covered files. Function coverage is already 100%.

### 1. Refresh coverage

```bash
npm run analysis
npm run analysis:merge
```

### 2. Find files below 100%

**Statements < 100%:**

```bash
node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.statements<100).sort((a,b)=>a.statements-b.statements).forEach(f=>console.log(f.statements.toFixed(1)+'%', f.file, '|', f.uncoveredLines?.slice(0,12)));"
```

**Branches < 100%:**

```bash
node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.branches<100).sort((a,b)=>a.branches-b.branches).forEach(f=>console.log(f.branches.toFixed(1)+'%', f.file));"
```

### 3. Add or extend tests

- Use **`coverage/coverage-summary.json`** for `uncoveredLines` / `uncoveredLineRanges` per file.
- Use **`coverage/analysis.json`** for `uncoveredDecisionPoints` (decision points on uncovered lines) to target specific branches.
- Use **`coverage/coverage-final.json`** (v8: `s`, `statementMap`, `b`, `branchMap`) to see which statements/branches have 0 hits.
- For each low-coverage file, add or extend tests in the matching **`__tests__/*.test.js`** so that:
  - Every uncovered **statement** is executed (exercise the code paths that include those lines).
  - Both sides of **branches** (if/else, ternary, &&, ||, catch) are hit where reachable.
- Some branches are **defensive or unreachable** (e.g. `function-hierarchy.js` visited guard and duplicate-key path); skip or document those rather than forcing coverage.
- After each file or batch: `npm test -- --run && npm run analysis && npm run analysis:merge`, then re-check that file in `coverage/coverage-summary.json`.

### 4. Scripts reference

Same as in [§4 Scripts reference](#4-scripts-reference) above.

### 5. Handoff prompt for next agent (branches and statements toward 100%)

Copy the following into a new agent window:

```
Handoff: Branches and statements as close to 100% as possible

1. Run: npm run analysis then npm run analysis:merge (so coverage/coverage-summary.json is up to date).
2. List files with statements < 100%: node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.statements<100).sort((a,b)=>a.statements-b.statements).forEach(f=>console.log(f.statements.toFixed(1)+'%', f.file));"
3. List files with branches < 100%: node -e "const c=require('./coverage/coverage-summary.json'); c.files.filter(f=>f.branches<100).sort((a,b)=>a.branches-b.branches).forEach(f=>console.log(f.branches.toFixed(1)+'%', f.file));"
4. For each file, use coverage/coverage-summary.json (uncoveredLines, uncoveredLineRanges), coverage/analysis.json (uncoveredDecisionPoints), and coverage/coverage-final.json (s/b and statementMap/branchMap) to identify uncovered statements and branches. Add or extend tests in the matching __tests__/*.test.js so those paths are executed. Skip defensive/unreachable branches (e.g. function-hierarchy.js visited guard and duplicate-key).
5. After each file (or batch), run: npm test -- --run && npm run analysis && npm run analysis:merge. Re-check coverage-summary.json for that file.
6. Follow docs/TODO.md § Branches and statements toward 100% (for next agent). Target: get statements and branches as close to 100% as practical for every covered file. Do not start package publishing or the extended script/LLM workflow.
```

---

## Upcoming (after coverage is complete)

- **Package publishing & extended workflow** — After branch coverage is brought to ≥90%, the user will follow up to: (1) finalize script and documentation for package publishing; (2) design an extended process (e.g. a script) so a user can add something to JSON, generate a file, and prompt an LLM to read it. Document in [NPM_PACKAGE_MIGRATION_TODO.md](./NPM_PACKAGE_MIGRATION_TODO.md) or a dedicated doc when that work starts.

### 4. Code Organization

- [ ] Refactor folder structure if needed; condense markdown files.
- [x] **Split file.js** — Split into `file-helpers.js`, `file-breakdown.js`, `file-boundary-builders.js`, `file-line-render.js`, `file-data.js`; `file.js` now under 1000 lines.
- [x] **Refactor function-boundaries.js and function-extraction.js** — Split into `function-boundaries/` and `function-extraction/`; `decision-points-ast.js` split into `decision-points/`. All under 1000-line guideline. See [REFACTORING_PLAN.md](./REFACTORING_PLAN.md).
- [x] **Review border spans and highlighting** — AST-based border positioning implemented; borders align with function spans.
- [ ] **Confirm naming is accurate** — Ensure hierarchical function names match across FCB table, exports, and ESLint AST.

### 5. NPM Package Preparation (migrate to standalone repo)

**Order:** Complete [§3 Testing & Edge Cases](#3-testing--edge-cases) (branch coverage ≥90%) first; then the user will return to finalize publishing and the “extended process” (script for user to add to JSON, generate file, prompt LLM). See also [Upcoming (after coverage is complete)](#upcoming-after-coverage-is-complete).

- [ ] **See [NPM_PACKAGE_MIGRATION_TODO.md](./NPM_PACKAGE_MIGRATION_TODO.md)** — Master checklist for moving scripts to `/Users/johnnyhammond/Documents/complexity-report` and publishing as an NPM package. Covers: copying code, package.json, entry points, project root/cwd, dependencies, tests, docs, and source-repo updates.
- [ ] **Package as npm** — Extract complexity report generator for reuse (done in complexity-report repo per migration doc).
- [ ] **Audit dependencies and files** — ESLint, @typescript-eslint/typescript-estree; see migration doc Phase 3.
- [ ] **Document minimal deps; clean package structure** — In complexity-report README and docs per migration doc Phase 6.

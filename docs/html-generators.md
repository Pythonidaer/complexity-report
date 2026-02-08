# HTML Generators

## Overview

The `html-generators/` directory produces the interactive HTML complexity report. It mirrors Vitest’s coverage UI: a main index, folder index pages, and per-file pages with source and a Function Complexity Breakdown (FCB) table. The pipeline is driven by **`report/index.js`** (run via `npm run lint:complexity`), which gathers ESLint complexity data and decision points, then calls the generators to write `complexity/index.html`, folder `index.html` files, and `*.tsx.html` / `*.js.html` file pages.

**Folder-level output** is produced by `folder.js`. For each directory in the analyzed tree, it builds a folder index page that lists files and functions in that folder, with progress bars and complexity values. Each row links to the corresponding file page. Folder pages share the same navigation pattern as the main index (back link, breadcrumb-style path) and use `shared.css` for consistent styling. The folder generator aggregates per-folder stats (total functions, within-threshold count, percentage) and renders a status bar and summary section before the function table.

**File-level output** is produced by `file.js`. For each source file, it generates a dedicated HTML page containing the FCB table (function names, complexity, decision-point breakdown) and the full source with line numbers. Source lines are annotated: decision points get a pink background (`.decision-point-line`), and function boundaries (start/end of a function) get a yellow highlight (`.function-boundary-highlight`). The FCB table is built by calling `formatFunctionHierarchy` from `function-hierarchy.js`; that module is responsible for hierarchical function names and table row structure. File pages link to `file.css` (copied to complexity output) for file-specific styles; each file page can be opened directly from the report.

## Decision-point vs. function-boundary highlighting

Lines that are both decision points and function boundaries (e.g. a line with an `if` that is also the first line of a function) must show **both** semantics: they should be highlighted as function boundaries (yellow) while still being recognizable as decision points. Originally, only one of the two styles was applied because of the logic in `buildCodeLineHTML` in `file.js`.

**Root cause:** The function used a single `if` / `else if` chain. When `isDecisionPoint` was true, the code added only `decision-point-line` and skipped the `else if` that would add `function-boundary-highlight`. So any line that was both a decision point and a function boundary received only the pink decision-point style and never the yellow boundary style.

**Fix:** The `else if` was changed to a separate `if`. Both conditions are now evaluated independently: if the line is a decision point it gets `decision-point-line`, and if it is a function start or closing it gets `function-boundary-highlight`. A line that is both gets both classes. In `file.css`, `.function-boundary-highlight` uses `background: yellow !important`, so when both classes are present the yellow boundary highlight correctly overrides the pink background for that line. The fix is localized to `buildCodeLineHTML` in `file.js`; no CSS changes are required.

**Granular highlighting on function-declaration lines:** When a line is both a function start and has decision points with column info (e.g. a default parameter like `parent = null` on the same line as `function traverse(node, parent = null) {`), the line is split into segments: the default-param (or other decision-point) span gets `.decision-point-line` (pink), and the rest of the line gets `.function-boundary-highlight` (yellow). This avoids the whole line appearing yellow and makes it clear which part adds complexity. The **`decision-points/`** AST parser emits `column` and `endColumn` for each decision point (from the AST node’s `loc`); `buildCodeLineHTML` in `file.js` uses `getDecisionPointRanges` to merge overlapping ranges and then wraps each segment in the appropriate span. If a decision point has no column info (e.g. from tests or older data), the line falls back to the whole-line behavior above.

**Granular function-start highlighting:** When a line is a function start and the function object has `column` (from ESLint's message, 1-based), only the segment from that column to end of line gets `.function-boundary-highlight`. This avoids highlighting variable names or other text on the same line (e.g. `const fileDecisionPoints = await parseDecisionPointsAST(` — only the callback start is highlighted, not "fileDecisionPoints"). If `column` is missing or the line also has decision points, the whole line is highlighted as before.

**Method names (.slice, .sort, .map, .forEach) are not highlighted.** We highlight function *boundaries* (where a callback starts) and *decision points* (if, ternary, &&, etc.). The method name itself is neither; the *callback* passed to it is a function, so the line or segment where that callback starts may be yellow. So yes, .slice, .sort, .map, .forEach (the method names) are expected to stay unhighlighted.

**Borders indicate nesting and align with function span.** The blue horizontal border (`.function-boundary-start`, `.function-boundary-end`) shows function boundaries for *every* function, not just top-level. Borders use **AST-based positioning**: `getFunctionRange` returns `startColumn`/`endColumn`, so borders align with the function span (e.g. for `functions.forEach(func => {`, the top border starts at `forEach`, not at the line start). *Top-level* functions get a full-width border (`data-boundary-top-level="true"` when start column is 0); *nested* functions get a border positioned with `--start-ch` and `--end-ch` (single-line functions get both top and bottom borders spanning the exact function span). When AST is unavailable, the system falls back to `--indent-ch` (line leading whitespace). Each nested function has its own boundary (start/end), its own yellow highlight in the source, and its own complexity (base 1 + decision points within that function), matching ESLint's AST-based reporting.

## Summary stats (header)

The main index, folder pages, and file pages each show a summary line: **Functions** (bold percentage + fraction, e.g. `98.96% Functions 667/674`) and **Control Flow**, **Expressions**, **Default Parameters**. Control Flow, Expressions, and Default Parameters are always 100% at the current scope (every decision point is counted), so those three show **label + total count only** (e.g. `Control Flow 597`), with no bold percentage and no fraction. Only Functions can be &lt; 100%, so only that metric shows a bold percentage and an X/Y fraction. The summary is produced by `generateSummarySection` in `file.js` and `folder.js`, and inline in `generateMainIndexHTML` in `main-index.js`.

## Module roles

- **`main-index.js`** — Builds the top-level `complexity/index.html` with folder links and summary stats.
- **`folder.js`** — Builds each folder’s `index.html` with file/function list, progress bars, and filter checkbox; uses `getComplexityLevel` and `getBaseFunctionName` (from the report pipeline) for row styling and names.
- **`file.js`** — Builds per-file HTML: FCB table (via `formatFunctionHierarchy` from `function-hierarchy.js`), source with line highlighting, and boundary/decision-point annotations; applies `buildCodeLineHTML` so decision-point and function-boundary classes can coexist.
- **`file-javascript.js`** — Shared helpers for file pages (e.g. building line-to-function and decision-point maps).
- **`file.css`** — Standalone stylesheet for file pages (tables, code lines, decision-point and function-boundary styles, boundary borders). Copied to complexity output and linked from each file page.
- **`about.js`** — Generates the about page content.
- **`utils.js`** — Shared utilities (e.g. `escapeHtml`).
- **`shared.css`** — External stylesheet for main index and folder pages (not a JS export).

**Dependencies:**  
`file.js` depends on `function-hierarchy.js` for FCB table content and links to `file.css` for styles. Folder and file generators receive `getComplexityLevel` and (where needed) `getBaseFunctionName` from the report pipeline; level thresholds (e.g. high/medium/low) are currently defined in multiple places (e.g. `folder.js`, `main-index.js`, `file.js`) and may be centralized or made configurable in the future.

## TODOs

- [ ] **Revisit FCB table ownership** — Clarify whether function names shown in the FCB table (Functions column) are determined in `html-generators/file.js` or in `scripts/function-hierarchy.js`, and document the split so maintainers know where to change naming/display.
- [x] **Evaluate file-css.js vs. flat CSS** — Converted to standalone `file.css` for caching, tooling, separation of concerns, and maintainability.
- [ ] **Assess decision-point vs. function-boundary highlighting** — Re-assess the base/decision-point-highlighting behavior; the fix for lines that are both decision points and function boundaries is documented above; confirm behavior and UX are correct and consistent.
- [ ] **Re-assess status bars** — Review status bars across main index, folder pages, and file pages to ensure UX is consistent (colors, thresholds, placement) and makes sense.
- [ ] **Document and possibly configure "levels"** — Document the current "levels" set (e.g. high/medium/low and the thresholds used in folder, file, and main-index generators); determine whether these should be configurable (e.g. via CLI or config) instead of hardcoded in multiple places.

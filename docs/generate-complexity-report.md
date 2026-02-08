# Generate Complexity Report

## report/index.js

The main orchestration script that generates the complete complexity analysis report. It lives at **`scripts/report/index.js`** and is run via `npm run lint:complexity`. This script coordinates all other modules to collect complexity data from ESLint, analyze decision points using AST parsing, generate HTML reports at multiple levels (main index, folder pages, file pages), and optionally create export files (JSON, MD, TXT). It calculates statistics across all functions, groups them by folder and file, and produces a comprehensive visual report with source code highlighting, complexity breakdowns, and hierarchical function naming.

The script handles the complete workflow from data collection through report generation, including copying required assets (prettify.css, prettify.js, sort-arrow-sprite.png, shared.css) from the scripts/assets directory to the complexity output directory. It supports command-line flags for customization (--show-all, --export, etc.) and provides detailed terminal output with statistics about function counts, complexity thresholds, and parser accuracy.

**Dependencies:**
- `integration/eslint/index.js` — Runs ESLint complexity checks
- `function-extraction/` — Extracts function names and metadata (extract-from-eslint, extract-name-ast, extract-callback, range-and-column, utils)
- `function-boundaries/` — Finds function start/end lines
- `decision-points/` — Parses decision points using AST
- `complexity-breakdown.js` — Calculates complexity breakdowns
- `function-hierarchy.js` — Builds hierarchical function names
- `html-generators/` — Generates HTML pages
- `integration/threshold/index.js` — Reads threshold from eslint.config.js
- `export-generators/` — Generates JSON/MD/TXT exports when `--export` is passed

**Coverage:** The entry point is excluded from Vitest coverage (orchestration only); see `vitest.config.ts` and scripts/README.md.

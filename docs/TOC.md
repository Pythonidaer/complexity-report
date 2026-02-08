# Scripts Documentation

- [TODO](./TODO.md) — Open and completed work for the complexity report generator.
- [REFACTORING_PLAN](./REFACTORING_PLAN.md) — Plan to split large modules and reorganize folder structure (implementation complete).
- [NPM_PACKAGE_MIGRATION_TODO](./NPM_PACKAGE_MIGRATION_TODO.md) — Checklist for moving scripts to `complexity-report` repo and publishing as NPM package.

## Entry Points & Tools

- [generate-complexity-report](./generate-complexity-report.md) — Orchestration (`report/index.js`; run via `npm run lint:complexity`)
- [analyze-ast-mismatches](./analyze-ast-mismatches.md) — AST parser validation (`tools/analyze-ast-mismatches/index.js`; run manually; flag for removal on project completion)

## Core Modules

- [complexity-breakdown](./complexity-breakdown.md) — Per-function decision point counts
- [decision-points-ast](./decision-points-ast.md) — AST decision points
- [eslint-integration](./eslint-integration.md) — ESLint runner (`integration/eslint/index.js`)
- [function-boundaries](./function-boundaries.md) — Start/end lines
- [function-extraction](./function-extraction.md) — Function names
- [function-hierarchy](./function-hierarchy.md) — Breakdown table

## Subdirectories

- `export-generators/` — Text exports (see [export-generators](./export-generators.md))
- `html-generators/` — HTML report (see [html-generators](./html-generators.md))
- `__tests__/` — Tests

### Testing & coverage

- [coverage](./coverage.md) — Scripts test coverage, exclusions, and test file index.

### Text exports (export-generators)

[export-generators](./export-generators.md) — Markdown and plain text exports of function names from the complexity report. The doc describes how all-functions and by-folder exports are generated; the roles of `helpers.js` (hierarchical naming, nesting detection), `md-exports.js` (table-format Markdown), and `txt-exports.js` (tree-structure plain text); current issues with regex-based pattern matching that should be replaced with AST-based extraction; and planned format improvements including table layouts, indentation/arrow hierarchy notation, and line-number sorting.

### HTML report (html-generators)

[html-generators](./html-generators.md) — Folder and file-level HTML generation for the complexity report. The doc describes how the main index, folder index pages, and per-file pages are produced; the roles of `folder.js` (folder lists, progress bars, filters) and `file.js` (FCB table, source with line highlighting); and the fix for lines that are both decision points and function boundaries (ensuring both pink and yellow styling can apply via separate class application in `buildCodeLineHTML`). It also summarizes each module in the directory and notes dependencies on `function-hierarchy.js` and `file.css`.

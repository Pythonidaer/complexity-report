# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.16] - 2026-02-09

### Changed
- **Console output:** Simplified to a single success line (`✓ Complexity report generated: …`), Summary block (Files analyzed, Functions found, Above threshold, Highest complexity), and optional "Functions above threshold" list. Removed exports-generated message, About/Generated folder/file lines, "Open the report" line, and "Using AST-based parser" line. Removed average complexity from stats and output. "Functions above threshold" section and list are shown in yellow when the terminal is a TTY. Success line uses a terminal-style check character (✓) instead of the ✅ emoji.
- **README:** Added a note to add `complexity/` to `.gitignore` to avoid committing generated reports.

### Fixed
- **Homepage filter:** Typing "." in the filter now correctly shows only the root row (`.`). Previously the dot was interpreted as a regex "any character" and matched every row. Filter now matches against the file column (`data-file`) with regex metacharacters escaped.
- **Root folder page:** On the root files page (after clicking "."), "All files" is now a link back to the main report index instead of plain text.

## [1.0.15] - 2026-02-09

### Fixed
- **Complexity threshold with .mjs/.cjs config:** The threshold reader now uses the same config discovery as the rest of the tool (`eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs`). Projects that only have `eslint.config.mjs` or `eslint.config.cjs` (e.g. some Ember apps) no longer get an "Error reading eslint.config.js: ENOENT" warning and correctly read the complexity threshold from the actual config file.

## [1.0.14] - 2026-02-09

### Changed
- **TXT/MD exports are now built-in:** Running the report (CLI or API) always generates export files (function-names.all.txt, function-names.all.md, function-names-by-file.txt, etc.) to the configured export dir (default `complexity/reports/` or `package.json` → `complexityReport.exportDir`). There is no option to disable exports.
- Removed `shouldExport` from the programmatic API and removed `--export` / `--no-export` from the CLI.
- Removed the `report:export` npm script; use `npm run report` (or `npx complexity-report`) for both HTML report and exports.

### Fixed
- (None this release.)

## [1.0.13] - 2026-02-09

### Fixed
- **Folder file links:** Clicking a file from a subfolder (e.g. `function-extraction/extract-name-ast.js` from the function-extraction folder page) now links to the correct path (e.g. `complexity/function-extraction/extract-name-ast.js.html`) instead of incorrectly resolving to `complexity/extract-name-ast.js.html`. The `../` prefix is now applied only for the root folder page at `root/index.html`.

## [1.0.12] - 2026-02-09

### Fixed
- **Root-level file pages:** `getDirectory()` now returns an empty string for paths with no directory (e.g. `function-hierarchy.js`). File pages for root-level files are no longer written into a bogus subfolder (e.g. `function-hierarchy.js/function-hierarchy.js.html`), so CSS and assets load correctly on pages like `complexity.js.html`.
- **Main index "." row:** The "." row (root-level files) is now clickable: it links to `root/index.html`, which lists root-level files and their functions. Previously it linked to the same page and had no dedicated folder view.

## [1.0.11] - 2026-02-09

- (No additional changes; version bump for republish.)

## [1.0.10] - 2026-02-09

### Fixed
- **Function names:** Class methods (ESLint `MethodDefinition`) now show their method name (e.g. `processNestedConditions`) in the report instead of "anonymous". AST matching and name extraction now support `MethodDefinition`.

## [1.0.9] - 2026-02-08

### Fixed
- **Function Complexity Breakdown:** `for...of` and `for...in` now have their own columns instead of being counted under "for".
- **Classic variant (ESLint-aligned):** Switch `default` clause is no longer counted (only `case` clauses add complexity, matching ESLint's `SwitchCase[test]` behavior). The "default" column has been removed from the breakdown table.

## [1.0.8] - 2026-02-08

### Fixed
- **Function Complexity Breakdown:** `else if` statements now counted in the "else if" column instead of "if".
- **Function Complexity Breakdown:** `do { } while` loops now counted in the "do...while" column instead of "while".

## [1.0.7] - 2026-02-08

- (Published; no additional changes in this changelog.)

## [1.0.6] - 2026-02-08

### Fixed
- **Threshold detection:** Regex now accepts single or double quotes around severity (e.g. `'warn'` or `"warn"`) in eslint.config.js.
- **Report hang:** Built-in ESLint ignore patterns for `complexity/**`, `dist/**`, `build/**`, `.angular/**`, `**/coverage/**`, `node_modules/**` so the run does not hang on report output or build/cache dirs.

### Added
- README: Angular 21 / ESLint 10 note at Installation (legacy-peer-deps); Troubleshooting for peer dependency errors and slow runs.
- README: Performance note updated to describe built-in ignores.

## [1.0.5] - 2026-02-08

### Fixed
- README Requirements: clarified that Node >=18 is for running the CLI; project being analyzed needs an ESLint flat config file. Clarified that the package bundles ESLint (users need not install it).

## [1.0.4] - 2026-02-08

### Fixed
- README: removed broken Documentation links (API.md, MIGRATION.md); point to existing docs and in-readme section.
- DEVELOPER.md: package name and install/import examples updated to @pythonidaer/complexity-report.

## [1.0.3] - 2026-02-08

### Fixed
- README Markdown: corrected fenced code blocks for npm display (removed escaped backticks).
- Installation section: use `npm install -D @pythonidaer/complexity-report`.

## [1.0.2] - 2026-02-08

### Changed
- **Package renamed to `@pythonidaer/complexity-report`** — The unscoped name `complexity-report` is already taken on npm by another package. Install with: `npm install --save-dev @pythonidaer/complexity-report`. The CLI command remains `complexity-report`.
- README and badges updated for scoped package name.

## [1.0.1] - 2026-02-08

### Fixed
- Repository URL normalized for npm (`git+https://` prefix)

## [1.0.0] - 2026-02-08

### Added
- Initial release as standalone npm package
- CLI tool via `npx complexity-report`
- Programmatic API with `generateComplexityReport()`
- AST-based decision point analysis (100% accuracy)
- Interactive HTML reports with syntax highlighting
- Folder and file-level complexity breakdowns
- Hierarchical function display for nested callbacks
- TXT/MD export formats
- Support for JavaScript and TypeScript
- ESLint 9+ flat config integration
- Configurable complexity thresholds
- Multiple CLI flags for customization
- Clean public API with utility functions

### Features
- **100% Accurate** - Uses `@typescript-eslint/typescript-estree` for perfect ESLint alignment
- **Interactive Reports** - Sortable tables, filterable views, code annotations
- **Decision Point Breakdown** - See exactly which lines add complexity
- **Multiple Export Formats** - TXT and Markdown for documentation
- **Fast Analysis** - Processes hundreds of files in seconds
- **Comprehensive Testing** - 287 tests with 90%+ coverage

### Migration
- Extracted from `new-years-project` scripts directory
- Now available as standalone package
- Maintains backward compatibility with previous script-based usage

### Requirements
- Node.js >=18
- ESLint >=9.0.0 with flat config

## [Unreleased]

### Planned
- VS Code extension integration
- GitHub Action for CI/CD
- Trend analysis over time
- Comparison reports between branches
- Additional export formats (JSON, CSV)
- Performance optimizations for very large codebases

---

## Migration from Scripts

If you were using the complexity report from `new-years-project/scripts/`, follow these steps:

### 1. Install the Package

```bash
npm install --save-dev @pythonidaer/complexity-report
```

### 2. Update Scripts in package.json

Replace:
```json
{
  "scripts": {
    "lint:complexity": "node scripts/report/index.js"
  }
}
```

With:
```json
{
  "scripts": {
    "lint:complexity": "complexity-report"
  }
}
```
(The CLI command is still `complexity-report`; only the package name is scoped.)

### 3. Keep Your Configuration

If you have `complexityReport.exportDir` in your `package.json`, keep it - the package reads this configuration.

### 4. Remove Old Scripts (Optional)

Once verified working, you can remove the `scripts/` directory from your project.

### What Changed?

- **Installation**: Now via npm instead of local scripts
- **Usage**: `complexity-report` instead of `node scripts/report/index.js`
- **Output**: Same location (`complexity/` by default)
- **Configuration**: Same (`eslint.config.js` and `package.json`)
- **Features**: All features preserved, plus new programmatic API

### What Stayed the Same?

- HTML report format and features
- Decision point analysis accuracy
- Export formats and locations
- ESLint configuration integration
- Complexity threshold reading

---

For more details, see [Migration Guide](./docs/MIGRATION.md)

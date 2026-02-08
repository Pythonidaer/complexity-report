# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

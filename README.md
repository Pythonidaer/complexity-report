# @pythonidaer/complexity-report

> AST-based cyclomatic complexity analyzer with interactive HTML reports and detailed function breakdowns

[![npm version](https://img.shields.io/npm/v/@pythonidaer/complexity-report.svg)](https://www.npmjs.com/package/@pythonidaer/complexity-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **100% Accurate** - Uses ESLint's AST parser for perfect complexity calculations
- 📊 **Interactive HTML Reports** - Beautiful, sortable tables with file-by-file breakdowns
- 🔍 **Decision Point Analysis** - See exactly which lines contribute to complexity
- 📈 **Hierarchical Function Display** - Understand nested callback complexity
- 📝 **Multiple Export Formats** - TXT and Markdown exports for documentation
- ⚡ **Fast** - Analyzes hundreds of files in seconds
- 🎨 **Syntax Highlighting** - Code annotations with prettify.js

## Installation

```bash
npm install -D @pythonidaer/complexity-report
```

On **Angular 21** or other projects using **ESLint 10**, install may fail with peer dependency conflicts; use `npm install --legacy-peer-deps` or set `legacy-peer-deps=true` in `.npmrc`. See [Troubleshooting](#npm-install-fails-with-peer-dependency-errors-eg-angular-21-eslint-10).

## Requirements

- **Node.js**: >=18 (to run the CLI)
- **Project being analyzed** must have an ESLint flat config file at its root: `eslint.config.js`, `eslint.config.mjs`, or `eslint.config.cjs`

The package bundles ESLint and uses your project's config to run complexity analysis. You do not need to install ESLint or TypeScript in your project for the tool to work.

**Performance:** The tool runs ESLint with `lintFiles(['.'])` and applies built-in ignores for `complexity/**`, `dist/**`, `build/**`, `.angular/**`, `**/coverage/**`, and `node_modules/**` so the run does not hang on report output or build dirs. You do not need to add these to your ESLint config—the tool ignores them automatically. Your config's own ignores also apply; add any other large or generated dirs there if needed.

## Quick Start

### CLI Usage

Run from your project root (after installing above):

```bash
npx complexity-report
```

Use the hyphen: `complexity-report` (not `complexity report`). To run without adding to `package.json`: `npx @pythonidaer/complexity-report`

This generates an interactive HTML report at `complexity/index.html`.

Add `complexity/` to your `.gitignore` to avoid committing generated reports.

### With npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "complexity": "complexity-report"
  }
}
```

Then run:

```bash
npm run complexity
```

### Analysis output (for tooling / LLMs)

To generate machine-readable summaries (decision points and, if you use Vitest, coverage) in one step, add:

```json
{
  "scripts": {
    "analysis": "complexity-analysis"
  }
}
```

Then run from your project root:

```bash
npm run analysis
```

- **Always:** Runs ESLint and writes **decision points** to `coverage/decision-points-summary.json`, then merges into `coverage/analysis.json`.
- **If Vitest is installed:** Also runs `vitest run --coverage`, writes `coverage/coverage-summary.json`, and merges coverage + decision points (including `uncoveredDecisionPoints`) into `coverage/analysis.json`.
- **If Vitest is not installed:** Skips coverage and prints a short note; you still get decision points and `coverage/analysis.json` (without coverage fields). No need to install Vitest unless you want coverage data.

You can also run once without adding a script: `npx complexity-analysis` (from project root).

#### Prompt example for an LLM

After running `npm run analysis`, you can hand the merged report to an LLM for test ideas or coverage help. Example prompt:

```
I ran the complexity-analysis tool for this project. Please read coverage/analysis.json.

For each file in `files`, use `uncoveredLines` and `uncoveredDecisionPoints` (if present) to suggest concrete tests or code changes that would improve coverage. Focus on [file or module name] first, then others. List the file path, the line or range, and a one-line test idea or change.
```

**What to expect:** The LLM will read `coverage/analysis.json` (and optionally the repo) and can:

- Suggest tests for uncovered branches (using `uncoveredLines` and `decisionPoints` / `uncoveredDecisionPoints`).
- Explain which decision points (if, ternary, `&&`, etc.) are on uncovered lines and how to hit them.
- If you only have decision points (no Vitest), it can still use `decisionPointLines` and `decisionPoints` to suggest where tests or refactors would help.

Point the LLM at the path to `coverage/analysis.json` (e.g. attach the file or give the repo path) so it can read the JSON.

## CLI Options

```bash
complexity-report [options]

Options:
  --cwd <path>              Project root directory (default: process.cwd())
  --output-dir <path>       Output directory (default: complexity)
  --show-all                Show all functions initially (not just over threshold)
  --show-all-columns        Show all breakdown columns initially  
  --hide-table              Hide breakdown table initially
  --no-lines                Hide line numbers initially
  --no-highlights           Hide code highlights initially
```

## Programmatic API

```javascript
import { generateComplexityReport } from '@pythonidaer/complexity-report';

const result = await generateComplexityReport({
  cwd: '/path/to/project',
  outputDir: 'reports/complexity',
  showAllInitially: true,
});

console.log(`Generated report in: ${result.complexityDir}`);
console.log(`Total functions: ${result.stats.allFunctionsCount}`);
```

## Documentation

- [Programmatic API](#programmatic-api) — usage and options (above)
- [Developer Guide](./docs/DEVELOPER.md) — internals and contributing
- [Changelog](./CHANGELOG.md) — version history and migration from scripts
- [Publishing to npm](./PUBLISH.md) — for maintainers

## Troubleshooting

### Report seems to hang on "Running ESLint to collect complexity..."

The tool ignores `complexity/**`, `dist/**`, `build/**`, `.angular/**`, `**/coverage/**`, and `node_modules/**` by default, so you don't need those in your ESLint config. If it still hangs, add other large or generated directories to your ESLint config's `ignore` (e.g. `.next/**`, `out/**`, `*.min.js`).

### npm install fails with peer dependency errors (e.g. Angular 21, ESLint 10)

Some setups (e.g. Angular 21 with ESLint 10) can trigger peer dependency conflicts. Install with:

```bash
npm install --legacy-peer-deps
```

Or add to your project's `.npmrc`: `legacy-peer-deps=true`. The report runs correctly with ESLint 10 once installed.

## License

MIT © Johnny Hammond

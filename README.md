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

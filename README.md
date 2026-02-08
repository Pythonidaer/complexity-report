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

## Requirements

- **Node.js**: >=18 (to run the CLI)
- **Project being analyzed** must have an ESLint flat config file at its root: `eslint.config.js`, `eslint.config.mjs`, or `eslint.config.cjs`

The package bundles ESLint and uses your project's config to run complexity analysis. You do not need to install ESLint or TypeScript in your project for the tool to work.

## Quick Start

### CLI Usage

Run from your project root:

```bash
npx complexity-report
```

This generates an interactive HTML report at `complexity/index.html`.

### With npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "complexity": "complexity-report",
    "complexity:export": "complexity-report --export"
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
  --export                  Generate TXT/MD exports
```

## Programmatic API

```javascript
import { generateComplexityReport } from '@pythonidaer/complexity-report';

const result = await generateComplexityReport({
  cwd: '/path/to/project',
  outputDir: 'reports/complexity',
  showAllInitially: true,
  shouldExport: true,
});

console.log(`Generated report in: ${result.complexityDir}`);
console.log(`Total functions: ${result.stats.allFunctionsCount}`);
```

## Documentation

- [Programmatic API](#programmatic-api) — usage and options (above)
- [Developer Guide](./docs/DEVELOPER.md) — internals and contributing
- [Changelog](./CHANGELOG.md) — version history and migration from scripts
- [Publishing to npm](./PUBLISH.md) — for maintainers

## License

MIT © Johnny Hammond

# complexity-report

> AST-based cyclomatic complexity analyzer with interactive HTML reports and detailed function breakdowns

[![npm version](https://img.shields.io/npm/v/complexity-report.svg)](https://www.npmjs.com/package/complexity-report)
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
npm install --save-dev complexity-report
```

## Requirements

- **Node.js**: >=18
- **ESLint**: >=9.0.0 with flat config (`eslint.config.js`)

Your project must have an ESLint flat config file. The tool will use your project's ESLint configuration to analyze complexity.

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

### Examples

```bash
# Run on a specific project
npx complexity-report --cwd /path/to/project

# Custom output directory
npx complexity-report --output-dir reports

# Show all functions and export data
npx complexity-report --show-all --export

# Analyze different project
cd /path/to/other/project && npx complexity-report
```

## Programmatic API

```javascript
import { generateComplexityReport } from 'complexity-report';

const result = await generateComplexityReport({
  cwd: '/path/to/project',           // Project root (default: process.cwd())
  outputDir: 'reports/complexity',   // Output directory (default: 'complexity')
  showAllInitially: true,            // Show all functions (default: false)
  shouldExport: true,                // Generate exports (default: false)
});

console.log(`Generated report in: ${result.complexityDir}`);
console.log(`Total functions: ${result.stats.allFunctionsCount}`);
console.log(`Max complexity: ${result.stats.maxComplexity}`);
console.log(`Average complexity: ${result.stats.avgComplexity}`);
```

### API Options

```typescript
interface ComplexityReportOptions {
  cwd?: string;                      // Project root directory
  outputDir?: string;                // Output directory for reports
  showAllInitially?: boolean;        // Show all functions initially
  showAllColumnsInitially?: boolean; // Show all breakdown columns
  hideTableInitially?: boolean;      // Hide breakdown table initially
  hideLinesInitially?: boolean;      // Hide line numbers initially
  hideHighlightsInitially?: boolean; // Hide code highlights initially
  shouldExport?: boolean;            // Generate TXT/MD exports
}

interface ComplexityReportResult {
  stats: {
    allFunctionsCount: number;
    maxComplexity: number;
    avgComplexity: number;
    withinThreshold: number;
    withinThresholdPercentage: number;
    overThreshold: Array<Function>;
  };
  folders: Array<FolderData>;
  complexityDir: string;
}
```

### Utility Functions

```javascript
import { 
  findESLintConfig,
  getComplexityThreshold 
} from 'complexity-report';

// Find ESLint config in a project
const configPath = findESLintConfig('/path/to/project');
// Returns: /path/to/project/eslint.config.js

// Get complexity threshold from config
const threshold = getComplexityThreshold('/path/to/project');
// Returns: 10 (or whatever is configured)
```

## Configuration

### Setting Complexity Threshold

The tool reads your complexity threshold from `eslint.config.js`:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      complexity: ['warn', { max: 10 }]  // Your threshold
    }
  }
];
```

### Export Directory

Configure where TXT/MD exports are saved (when using `--export`):

```json
{
  "complexityReport": {
    "exportDir": "complexity/reports"
  }
}
```

Default: `complexity/reports/`

## Output

### HTML Reports

The tool generates:

- **`complexity/index.html`** - Main dashboard with folder-level overview
- **`complexity/about.html`** - Explanation of cyclomatic complexity
- **`complexity/<folder>/index.html`** - Folder-specific function listings
- **`complexity/<folder>/<file>.html`** - File-level detailed breakdowns with annotated code

### Export Files (with `--export`)

- **`function-names.all.txt`** - All functions with hierarchical names
- **`function-names.all.md`** - Markdown version
- **`function-names-by-file.txt`** - Functions grouped by file
- **`function-names-by-file.md`** - Markdown version
- **`function-names.all-leaf.txt`** - Leaf function names only
- **`file-names-alphabetical.txt`** - List of all analyzed files

## Understanding the Reports

### Complexity Levels

Functions are color-coded by complexity:

- **Green (1-5)**: Simple, easy to understand
- **Yellow (6-10)**: Moderate complexity
- **Orange (11-20)**: Consider refactoring  
- **Red (21+)**: High complexity, should be refactored

### Decision Points

Each function's complexity is broken down by decision point type:

- **Control Flow**: `if`, `else if`, `for`, `while`, `switch/case`, `catch`
- **Expressions**: Ternary (`?:`), logical operators (`&&`, `||`, `??`, `?.`)
- **Function Parameters**: Default parameters

### Function Hierarchy

Nested functions and callbacks are displayed hierarchically:

```
Parent
  → (callback)
    → (map)
    → (filter)
```

## Example Report

```
✅ Complexity report generated: complexity/index.html
   About: complexity/about.html
   Generated 12 folder HTML file(s)
   Generated 46 file HTML page(s)
   Found 378 total function(s)
   1 function(s) with complexity > 10

   report/index.js:411  generateComplexityReport  (complexity 11)
   Highest complexity: 11 / Average: 3
   Using AST-based parser for 100% accuracy
```

## How It Works

1. **ESLint Analysis** - Runs ESLint with `complexity: { max: 0 }` to collect data for all functions
2. **AST Parsing** - Uses `@typescript-eslint/typescript-estree` to parse code and identify decision points
3. **Function Matching** - Assigns decision points to functions based on AST relationships
4. **Report Generation** - Creates interactive HTML reports with syntax highlighting
5. **Export Generation** (optional) - Generates TXT/MD exports for documentation

## Advanced Usage

### Analyzing Multiple Projects

```bash
#!/bin/bash
projects=("project-a" "project-b" "project-c")

for project in "${projects[@]}"; do
  npx complexity-report --cwd "/path/to/$project" --output-dir "reports/$project"
done
```

### CI/CD Integration

```yaml
# .github/workflows/complexity.yml
name: Complexity Analysis
on: [push]

jobs:
  complexity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx complexity-report
      - uses: actions/upload-artifact@v3
        with:
          name: complexity-report
          path: complexity/
```

### Pre-commit Hook

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "complexity-report && git add complexity/"
    }
  }
}
```

## Troubleshooting

### "No ESLint flat config found"

Ensure you have one of these files at your project root:
- `eslint.config.js`
- `eslint.config.mjs`  
- `eslint.config.cjs`

### "Could not find complexity threshold"

Add a complexity rule to your ESLint config:

```javascript
export default [{
  rules: {
    complexity: ['warn', { max: 10 }]
  }
}];
```

### Empty or Missing Reports

Check that:
1. Your project has JavaScript/TypeScript files
2. ESLint is configured to analyze your files
3. You're running from the correct directory

## Contributing

Issues and pull requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Johnny Hammond

## Acknowledgments

- ESLint team for the complexity rule and AST infrastructure
- TypeScript ESLint team for `typescript-estree`
- Google for prettify.js syntax highlighting

## Related Tools

- [ESLint](https://eslint.org/) - Pluggable JavaScript linter
- [complexity-report-html](https://www.npmjs.com/package/complexity-report-html) - Alternative complexity reporter
- [plato](https://github.com/es-analysis/plato) - JavaScript source complexity visualization

---

**Made with ❤️ for better code quality**

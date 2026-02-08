# ESLint Integration

## integration/eslint/index.js

This module runs ESLint using the **project’s own ESLint config** (flat config only), with a single override so that `complexity` is set to `max: 0`; the **variant** (classic vs modified) is read from the project’s config so the report matches the project’s choice. That way every function gets a complexity diagnostic. The report is written to **`complexity/complexity-report.json`**, so all report-related output lives under `complexity/` (same idea as Vitest’s `coverage/`). Users can remove or ignore the `complexity/` folder if they want.

**API:**

- **`runESLintComplexityCheck(projectRoot)`** (async) — Uses the project’s config, overrides the complexity rule, runs ESLint via the Node API, writes the JSON report to `complexity/complexity-report.json`, and returns the same result array (same shape as `eslint --format=json`). Callers: `report/index.js`, `tools/analyze-ast-mismatches/index.js`.
- **`findESLintConfig(projectRoot)`** — Finds the project’s ESLint flat config file. Returns the absolute path or `null`. Used internally by `runESLintComplexityCheck`.

**Config lookup (framework-agnostic):** The module looks for a flat config file at the project root in this order: `eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs`. (ESLint 9+ supports these names; other names like `eslint.config.ts` require extra setup and are not checked.) If none exist, the script logs an error and exits with code 1.

**How the project config is used:** The project’s config is loaded via the ESLint Node API: `new ESLint({ cwd: projectRoot, overrideConfigFile: configPath, overrideConfig: { rules: { complexity: ["warn", { max: 0, variant }] } } })`. Variant is read from the project config (default "classic"); see [ESLint complexity rule](https://eslint.org/docs/latest/rules/complexity) for classic vs modified. So the project’s files, ignores, plugins, and other rules are unchanged; only the complexity rule is overridden to report all functions.

**Dependencies:**
- `eslint` (ESLint class)
- `fs` (mkdirSync, writeFileSync, existsSync, readFileSync for variant detection)
- `path` (resolve)

**Test exclusions:** The report always excludes test code via `ignorePatterns`: `**/__tests__/**`, `**/*.test.{js,ts,tsx}`, `**/*.spec.{js,ts,tsx}`. So `scripts/__tests__/` and other test files are never included in the complexity report.

**Output:** The JSON report is written to `projectRoot/complexity/complexity-report.json`. The `complexity/` directory is created if it does not exist. No temporary config file is written; the override is applied in memory via the Node API.
